import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useGetExamPublicQuery, useSubmitExamMutation, useVerifyIdentityMutation, useMonitorExamMutation } from '../redux/examApi';
import { Button, Card, Radio, Progress, Typography, Space, Result, Spin, Tag, Upload, Alert, Checkbox } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, TrophyOutlined, CameraOutlined, IdcardOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const DEFAULT_TIME_LIMIT_MINUTES = 15;

const ExamPage = () => {
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const candidateId = searchParams.get('candidateId') ?? 'guest';
  const candidateName = searchParams.get('name') ?? 'Candidate';

  const { data: exam, isLoading, error } = useGetExamPublicQuery(examId);
  const [submitExam, { isLoading: isSubmitting }] = useSubmitExamMutation();
  const [verifyIdentity, { isLoading: isVerifying }] = useVerifyIdentityMutation();
  const [monitorExam] = useMonitorExamMutation();

  const timeLimitMinutes = exam?.timeLimitMinutes ?? DEFAULT_TIME_LIMIT_MINUTES;
  const requireIdVerification = exam?.requireIdVerification ?? true;

  const [proctoringConsent, setProctoringConsent] = useState(false);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_TIME_LIMIT_MINUTES * 60);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  // Reset the countdown once the exam's configured time limit is known.
  useEffect(() => {
    if (exam && !started) setSecondsLeft(timeLimitMinutes * 60);
  }, [exam, timeLimitMinutes]);

  // Identity verification (selfie vs ID document) gate before the exam timer starts.
  // Skipped entirely when the admin has disabled it in Settings → Exams.
  const [verifyStep, setVerifyStep] = useState('intro'); // intro | camera | review | verified
  const [cameraError, setCameraError] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null); // base64 data URL
  const [idImage, setIdImage] = useState(null); // base64 data URL
  const [verifyError, setVerifyError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const openCamera = async () => {
    setCameraError(null);
    setVerifyStep('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setCameraError('Could not access your camera. Please allow camera permissions and try again.');
    }
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setSelfieImage(canvas.toDataURL('image/jpeg'));
    stopCamera();
    setVerifyStep('review');
  };

  // Phone camera photos can be 5-10+ MB / huge dimensions, well past Rekognition's
  // 5MB image-bytes limit and Textract's 4096px page dimension limit. Downscale
  // to a max 1600px edge before sending.
  const downscaleImage = (dataUrl, maxEdge = 1600, quality = 0.85) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });

  const handleIdUpload = (file) => {
    const reader = new FileReader();
    reader.onload = async () => setIdImage(await downscaleImage(reader.result));
    reader.readAsDataURL(file);
    return false; // prevent antd Upload's default auto-upload
  };

  const retryVerification = () => {
    setSelfieImage(null);
    setIdImage(null);
    setVerifyError(null);
    setVerifyStep('intro');
  };

  const handleVerify = async () => {
    setVerifyError(null);
    try {
      const res = await verifyIdentity({
        examId,
        selfieImageBase64: selfieImage,
        idImageBase64: idImage,
        candidateName,
      }).unwrap();
      if (res.verified) {
        setVerifyStep('verified');
      } else {
        const reason = !res.faceMatch
          ? "Your selfie doesn't match the photo on the ID document."
          : `The name on the ID ("${res.extractedName}") doesn't match "${candidateName}".`;
        setVerifyError(reason);
      }
    } catch (err) {
      const reason =
        err?.data?.error ??
        (err?.status === 413 ? 'Image file is too large. Please try a smaller photo.' : null) ??
        (err?.status === 'FETCH_ERROR' ? 'Could not reach the server. Please check your connection.' : null) ??
        `Verification failed${err?.status ? ` (${err.status})` : ''}. Please try again.`;
      setVerifyError(reason);
    }
  };

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (exam && !requireIdVerification) setVerifyStep('verified');
  }, [exam, requireIdVerification]);

  // ── In-exam proctoring ──
  // Every 60s, grab a fresh webcam frame and compare it against the verified
  // selfie via Rekognition to confirm the same person is still alone at the
  // screen. Also watches for the candidate switching tabs / losing window focus.
  const [proctorWarning, setProctorWarning] = useState(null);
  const [proctoringFlags, setProctoringFlags] = useState([]);
  const monitorVideoRef = useRef(null);
  const monitorStreamRef = useRef(null);
  const monitorIntervalRef = useRef(null);
  const proctorWarningTimeoutRef = useRef(null);

  const flagProctorEvent = (reason, message) => {
    setProctoringFlags((prev) => [...prev, { at: new Date().toISOString(), reason }]);
    setProctorWarning(message);
    clearTimeout(proctorWarningTimeoutRef.current);
    proctorWarningTimeoutRef.current = setTimeout(() => setProctorWarning(null), 8000);
  };

  const captureMonitorFrame = () => {
    const video = monitorVideoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const runPresenceCheck = async () => {
    const frame = captureMonitorFrame();
    if (!frame || !selfieImage) return;
    try {
      const res = await monitorExam({
        examId,
        candidateId,
        referenceImageBase64: selfieImage,
        currentImageBase64: await downscaleImage(frame, 800),
      }).unwrap();
      if (!res.ok) {
        const messages = {
          no_face: "We can't see your face — please make sure you're in view of the camera.",
          multiple_faces: 'More than one face was detected. Only the candidate should be in view during the exam.',
          face_mismatch: "The person in view doesn't match your verification photo.",
        };
        flagProctorEvent(res.reason, messages[res.reason] ?? 'Proctoring check failed. Please stay visible to the camera.');
      }
    } catch {
      // Network/Rekognition hiccups shouldn't interrupt the exam; just skip this check.
    }
  };

  // Start/stop the background monitoring camera + interval alongside the exam itself.
  useEffect(() => {
    if (!started || submitted || !requireIdVerification || !selfieImage) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        monitorStreamRef.current = stream;
        if (monitorVideoRef.current) monitorVideoRef.current.srcObject = stream;
      } catch {
        flagProctorEvent('camera_unavailable', 'Proctoring camera is unavailable — please keep your camera enabled during the exam.');
      }
    })();

    monitorIntervalRef.current = setInterval(runPresenceCheck, 60000);

    return () => {
      cancelled = true;
      clearInterval(monitorIntervalRef.current);
      monitorStreamRef.current?.getTracks().forEach((t) => t.stop());
      monitorStreamRef.current = null;
    };
  }, [started, submitted, requireIdVerification, selfieImage]);

  // Instant warning when the candidate switches tabs or the window loses focus.
  useEffect(() => {
    if (!started || submitted) return undefined;
    const handleVisibility = () => {
      if (document.hidden) flagProctorEvent('tab_switch', 'You switched away from the exam tab. Please stay on this page.');
    };
    const handleBlur = () => flagProctorEvent('window_blur', 'The exam window lost focus. Please return to the exam.');
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [started, submitted]);

  // Countdown
  useEffect(() => {
    if (!started || submitted) return;
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started]);

  const handleSubmit = async (autoSubmit = false) => {
    if (submitted) return;
    clearInterval(timerRef.current);
    const timeTaken = Math.round((Date.now() - (startTimeRef.current ?? Date.now())) / 1000);
    try {
      const res = await submitExam({
        examId,
        candidateId,
        candidateName,
        answers,
        timeTaken,
        proctoringFlags,
      }).unwrap();
      setResult(res);
      setSubmitted(true);
    } catch (err) {
      console.error('Submit failed:', err);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const answeredCount = Object.keys(answers).length;
  const totalQ = exam?.questions?.length ?? 0;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Spin size="large" tip="Loading exam…" />
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Result status="404" title="Exam not found" subTitle="This exam link may be invalid or expired." />
      </div>
    );
  }

  // ── Result screen ──
  if (submitted && result) {
    const pct = result.score;
    const passed = pct >= 60;
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ maxWidth: 520, width: '100%', textAlign: 'center', borderRadius: 12 }}>
          <TrophyOutlined style={{ fontSize: 56, color: passed ? '#52c41a' : '#ff4d4f', marginBottom: 16 }} />
          <Title level={2} style={{ margin: '0 0 8px' }}>
            {passed ? 'Assessment Complete!' : 'Assessment Submitted'}
          </Title>
          <Text type="secondary">Hi {candidateName}, here are your results:</Text>

          <div style={{ margin: '32px 0' }}>
            <Progress
              type="circle"
              percent={pct}
              size={140}
              strokeColor={passed ? '#52c41a' : '#ff4d4f'}
              format={(p) => <span style={{ fontSize: 28, fontWeight: 700 }}>{p}%</span>}
            />
          </div>

          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', background: '#fafafa', borderRadius: 8 }}>
              <Text strong>Correct answers</Text>
              <Text>{result.correct} / {result.total}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', background: '#fafafa', borderRadius: 8 }}>
              <Text strong>Time taken</Text>
              <Text>{Math.floor(result.timeTaken / 60)}m {result.timeTaken % 60}s</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', background: '#fafafa', borderRadius: 8 }}>
              <Text strong>Status</Text>
              <Tag color={passed ? 'success' : 'error'}>{passed ? 'PASSED' : 'NEEDS REVIEW'}</Tag>
            </div>
          </Space>

          <Text type="secondary" style={{ display: 'block', marginTop: 24, fontSize: 12 }}>
            Your responses have been recorded. The recruiter will be in touch shortly.
          </Text>
        </Card>
      </div>
    );
  }

  // ── Identity verification screen ──
  if (!started && verifyStep !== 'verified') {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ maxWidth: 520, width: '100%', textAlign: 'center', borderRadius: 12 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🪪</div>
          <Title level={2} style={{ margin: '0 0 8px' }}>Identity Verification</Title>
          <Text type="secondary">Hi {candidateName}, please verify your identity before starting your {exam.title}.</Text>

          {verifyStep === 'intro' && (
            <div style={{ marginTop: 24 }}>
              <div style={{ textAlign: 'left', marginBottom: 20 }}>
                {[
                  ['Take a live selfie using your camera', '🤳'],
                  ['Upload a photo of your government ID', '🪪'],
                  ["We'll match your face and name automatically", '✅'],
                  ['The exam timer starts only after verification', '⏱️'],
                ].map(([text, icon]) => (
                  <div key={text} style={{ padding: '8px 0', fontSize: 14 }}>{icon} {text}</div>
                ))}
              </div>
              <Button type="primary" size="large" block icon={<CameraOutlined />} onClick={openCamera} style={{ backgroundColor: '#2563eb', height: 48, fontSize: 16 }}>
                Start Verification
              </Button>
            </div>
          )}

          {verifyStep === 'camera' && (
            <div style={{ marginTop: 24 }}>
              {cameraError ? (
                <Alert type="error" showIcon message={cameraError} style={{ marginBottom: 16, textAlign: 'left' }} />
              ) : (
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 8, background: '#000', marginBottom: 16 }} />
              )}
              <Space direction="vertical" style={{ width: '100%' }}>
                {!cameraError && (
                  <Button type="primary" size="large" block icon={<CameraOutlined />} onClick={captureSelfie} style={{ backgroundColor: '#2563eb', height: 44 }}>
                    Capture Selfie
                  </Button>
                )}
                <Button block onClick={retryVerification}>Cancel</Button>
              </Space>
            </div>
          )}

          {verifyStep === 'review' && (
            <div style={{ marginTop: 24, textAlign: 'left' }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, justifyContent: 'center' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Selfie</Text>
                  <img src={selfieImage} alt="Selfie" style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                </div>
                {idImage && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>ID Document</Text>
                    <img src={idImage} alt="ID document" style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                  </div>
                )}
              </div>

              {!idImage ? (
                <Upload.Dragger accept="image/*" showUploadList={false} beforeUpload={handleIdUpload} style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 24, margin: 0 }}><IdcardOutlined /></p>
                  <p style={{ margin: 0 }}>Click or drag a photo of your government ID</p>
                </Upload.Dragger>
              ) : (
                <Button icon={<ReloadOutlined />} onClick={() => setIdImage(null)} style={{ marginBottom: 16 }}>
                  Retake ID Photo
                </Button>
              )}

              {verifyError && <Alert type="error" showIcon message={verifyError} style={{ marginBottom: 16 }} />}

              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  size="large"
                  block
                  loading={isVerifying}
                  disabled={!selfieImage || !idImage}
                  onClick={handleVerify}
                  style={{ backgroundColor: '#2563eb', height: 44 }}
                >
                  Verify Identity
                </Button>
                <Button block onClick={retryVerification}>Start Over</Button>
              </Space>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ── Start screen ──
  if (!started) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ maxWidth: 520, width: '100%', textAlign: 'center', borderRadius: 12 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <Title level={2} style={{ margin: '0 0 8px' }}>{exam.title}</Title>
          <Text type="secondary">Hi {candidateName}, welcome to your L1 assessment.</Text>
          {requireIdVerification && (
            <Alert type="success" showIcon message="Identity verified" style={{ margin: '16px 0', textAlign: 'left' }} />
          )}
          <div style={{ margin: '24px 0', textAlign: 'left' }}>
            {[
              [`${totalQ} multiple-choice questions`, '📝'],
              [`${timeLimitMinutes} minutes to complete`, '⏱️'],
              ['Timer starts when you click Start', '🚀'],
              ['Each question has one correct answer', '✅'],
            ].map(([text, icon]) => (
              <div key={text} style={{ padding: '8px 0', fontSize: 14 }}>
                {icon} {text}
              </div>
            ))}
          </div>

          {requireIdVerification && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 20, textAlign: 'left' }}
              message="This exam is proctored"
              description={
                <div style={{ fontSize: 13 }}>
                  <div style={{ marginBottom: 8 }}>While the assessment is in progress, we will:</div>
                  <ul style={{ margin: '0 0 10px', paddingLeft: 18 }}>
                    <li>Keep your camera on and capture your face to confirm you're the person who verified identity</li>
                    <li>You will be flagged if no face, more than one face, or a mismatched face is detected</li>
                    <li>You will be flagged if you switch tabs or the exam window loses focus</li>
                  </ul>
                  <Checkbox
                    checked={proctoringConsent}
                    onChange={(e) => setProctoringConsent(e.target.checked)}
                  >
                    I understand and consent to this proctoring for the duration of the exam.
                  </Checkbox>
                </div>
              }
            />
          )}

          <Button
            type="primary"
            size="large"
            block
            disabled={requireIdVerification && !proctoringConsent}
            onClick={() => setStarted(true)}
            style={{ backgroundColor: '#2563eb', height: 48, fontSize: 16 }}
          >
            Start Assessment
          </Button>
        </Card>
      </div>
    );
  }

  // ── Exam screen ──
  const timerColor = secondsLeft < 120 ? '#ff4d4f' : secondsLeft < 300 ? '#faad14' : '#52c41a';

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', padding: '24px 16px' }}>
      {/* Hidden background camera feed used for periodic proctoring checks */}
      <video ref={monitorVideoRef} autoPlay playsInline muted style={{ position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#fff', borderBottom: '1px solid #e8e8e8',
        padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 24, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}>
        <div>
          <Text strong style={{ fontSize: 15 }}>{exam.title}</Text>
          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            {answeredCount} / {totalQ} answered
          </Text>
        </div>
        <Space>
          <Progress percent={Math.round((answeredCount / totalQ) * 100)} showInfo={false} style={{ width: 120 }} strokeColor="#2563eb" />
          <Tag icon={<ClockCircleOutlined />} color={timerColor} style={{ fontSize: 16, padding: '4px 12px', fontWeight: 700 }}>
            {formatTime(secondsLeft)}
          </Tag>
        </Space>
      </div>

      {proctorWarning && (
        <div style={{ maxWidth: 760, margin: '0 auto 20px' }}>
          <Alert type="warning" showIcon message={proctorWarning} closable onClose={() => setProctorWarning(null)} />
        </div>
      )}

      {/* Questions */}
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {exam.questions.map((q, idx) => (
          <Card key={q.id} style={{ borderRadius: 10, border: answers[q.id] ? '1.5px solid #2563eb' : '1px solid #e8e8e8' }}>
            <Text strong style={{ display: 'block', marginBottom: 16, fontSize: 14 }}>
              {idx + 1}. {q.question}
            </Text>
            <Radio.Group
              value={answers[q.id]}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              {['A', 'B', 'C', 'D'].map((key) => (
                <Radio key={key} value={key} style={{ fontSize: 13 }}>
                  <Text strong>{key}.</Text> {q.options[key]}
                </Radio>
              ))}
            </Radio.Group>
          </Card>
        ))}

        <Button
          type="primary"
          size="large"
          block
          loading={isSubmitting}
          onClick={() => handleSubmit(false)}
          icon={<CheckCircleOutlined />}
          style={{ backgroundColor: '#2563eb', height: 48, fontSize: 15, marginBottom: 40 }}
        >
          Submit Assessment ({answeredCount}/{totalQ} answered)
        </Button>
      </div>
    </div>
  );
};

export default ExamPage;
