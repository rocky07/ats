import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useGetExamPublicQuery, useSubmitExamMutation } from '../redux/examApi';
import { Button, Card, Radio, Progress, Typography, Space, Result, Spin, Tag } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, TrophyOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const TOTAL_SECONDS = 15 * 60; // 15 minutes

const ExamPage = () => {
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const candidateId = searchParams.get('candidateId') ?? 'guest';
  const candidateName = searchParams.get('name') ?? 'Candidate';

  const { data: exam, isLoading, error } = useGetExamPublicQuery(examId);
  const [submitExam, { isLoading: isSubmitting }] = useSubmitExamMutation();

  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

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

  // ── Start screen ──
  if (!started) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ maxWidth: 520, width: '100%', textAlign: 'center', borderRadius: 12 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <Title level={2} style={{ margin: '0 0 8px' }}>{exam.title}</Title>
          <Text type="secondary">Hi {candidateName}, welcome to your L1 assessment.</Text>
          <div style={{ margin: '24px 0', textAlign: 'left' }}>
            {[
              [`${totalQ} multiple-choice questions`, '📝'],
              ['15 minutes to complete', '⏱️'],
              ['Timer starts when you click Start', '🚀'],
              ['Each question has one correct answer', '✅'],
            ].map(([text, icon]) => (
              <div key={text} style={{ padding: '8px 0', fontSize: 14 }}>
                {icon} {text}
              </div>
            ))}
          </div>
          <Button
            type="primary"
            size="large"
            block
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
