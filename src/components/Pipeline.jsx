import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Typography, Select, Drawer, Input, Empty, message, Dropdown, Modal, Radio, Space, Tooltip, Segmented, Tag, Descriptions, Rate, Popconfirm } from 'antd';
import { PlusOutlined, TeamOutlined, SearchOutlined, DownOutlined, FileAddOutlined, DeleteOutlined, ShareAltOutlined, CopyOutlined, CompressOutlined, MailOutlined, CheckCircleOutlined, LinkOutlined, CalendarOutlined, ArrowLeftOutlined, UserOutlined, ThunderboltOutlined, UploadOutlined } from '@ant-design/icons';
import { useGetRequirementsQuery } from '../redux/requirementsApi';
import { useGetPipelineStagesQuery, useSavePipelineStagesMutation } from '../redux/pipelineStagesApi';
import { useGetAllCandidatesQuery, useReparseWithAiMutation, useUploadResumeMutation } from '../redux/candidateApi';
import { useRankCandidatesMutation } from '../redux/intelligenceApi';
import { useGetUserSettingsQuery } from '../redux/settingsApi';
import {
  useGenerateExamMutation,
  useGetExamByRequirementQuery,
  useSendExamInviteMutation,
  useLazyGetSubmissionQuery,
} from '../redux/examApi';
import { API_BASE_URL } from '../config';
import ScheduleInterviewDrawer from './ScheduleInterviewDrawer';
import EditableCandidateField from './EditableCandidateField';

// The canonical empty pipeline — one array per stage.
const EMPTY_STAGES = { ingested: [], ranked: [], l1: [], l2: [], l3: [] };

const { Title, Text } = Typography;

const OPTION_KEYS = ['A', 'B', 'C', 'D'];
const EXAM_LINK = 'https://ats.bourntec.com/exam/sr-nodejs-l1';

// Sample online exam — 10 multiple-choice questions, options A–D
const SAMPLE_EXAM = {
  title: 'L1 Online Exam — Sr. Node.js Developer',
  questions: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    question: [
      'What does the `require` function return in Node.js?',
      'Which method is used to read a file asynchronously?',
      'What is the event loop primarily responsible for?',
      'Which hook runs after every render in React?',
      'What is the default port for an HTTP server?',
      'Which keyword declares a block-scoped variable?',
      'What does `npm` stand for?',
      'Which HTTP method is idempotent?',
      'What is a Promise in JavaScript?',
      'Which database is document-oriented?',
    ][i],
    options: {
      A: ['module.exports', 'fs.read()', 'Garbage collection', 'useMemo', '443', 'var', 'Node Package Manager', 'POST', 'A styling API', 'PostgreSQL'][i],
      B: ['undefined', 'fs.readFile()', 'Handling async callbacks', 'useEffect', '80', 'let', 'New Project Mode', 'GET', 'A future value', 'MongoDB'][i],
      C: ['A new process', 'fs.open()', 'Compiling code', 'useState', '3000', 'const', 'Node Process Monitor', 'PATCH', 'A loop', 'MySQL'][i],
      D: ['null', 'fs.write()', 'Memory allocation', 'useRef', '8080', 'static', 'Network Protocol Map', 'CONNECT', 'A class', 'Redis'][i],
    },
  })),
};

// Mock candidate database (would come from an API in production)

const Pipeline = ({ reqId = null, region = 'global', onBack = null, backLabel = 'Back' }) => {
  const { data: requirements, isLoading } = useGetRequirementsQuery();
  const { data: candidateList = [] } = useGetAllCandidatesQuery();
  const {data: userSettings} = useGetUserSettingsQuery();
  const [selectedReqId, setSelectedReqId] = useState(reqId);
  const [showAllPostings, setShowAllPostings] = useState(false); // default: open postings only
  const [compact, setCompact] = useState(false); // compact card view for long lists
  const isGenerateExamEnabled = userSettings?.aiSettings?.enableExamGeneration ?? true;
  // Preselect the requirement when navigated here from "View Pipeline"
  useEffect(() => {
    if (reqId != null) setSelectedReqId(reqId);
  }, [reqId]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const resumeFileInputRef = useRef(null);
  const [uploadResume, { isLoading: isUploadingResume }] = useUploadResumeMutation();
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [examMode, setExamMode] = useState('view'); // 'view' | 'edit'
  const [examDraft, setExamDraft] = useState(SAMPLE_EXAM);
  const [answers, setAnswers] = useState({}); // { [questionId]: 'A'|'B'|'C'|'D' }
  const [pipelineData, setPipelineData] = useState(EMPTY_STAGES);
  const [draggedCandidate, setDraggedCandidate] = useState(null);

  // Load the persisted stages for the selected requirement from the backend.
  const { data: savedStages, isFetching: isLoadingStages } = useGetPipelineStagesQuery(
    selectedReqId,
    { skip: selectedReqId == null },
  );
  const [savePipelineStages] = useSavePipelineStagesMutation();
  const [rankCandidatesApi, { isLoading: isRanking }] = useRankCandidatesMutation();

  // Exam
  const { data: currentExam, refetch: refetchExam } = useGetExamByRequirementQuery(
    selectedReqId,
    { skip: selectedReqId == null },
  );
  const [generateExamApi, { isLoading: isGeneratingExam }] = useGenerateExamMutation();
  const [sendExamInviteApi] = useSendExamInviteMutation();
  const [fetchSubmission] = useLazyGetSubmissionQuery();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteCandidate, setInviteCandidate] = useState(null);

  // Candidate profile modal
  const [profileCandidate, setProfileCandidate] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileStage, setProfileStage] = useState(null);
  const [reparseWithAi, { isLoading: isReparsingWithAi }] = useReparseWithAiMutation();

  const handleReparseWithAi = async () => {
    try {
      const updated = await reparseWithAi(profileCandidate.id).unwrap();
      setProfileCandidate(updated);
      message.success('Resume parsed with Claude — profile updated');
    } catch (e) {
      message.error(e?.data?.error ?? 'Failed to parse resume with Claude');
    }
  };

  // Keep the open profile modal and the pipeline card in sync after an inline field edit.
  const handleProfileFieldSaved = (updated) => {
    setProfileCandidate(updated);
    if (profileStage) {
      setPipelineData((prev) => ({
        ...prev,
        [profileStage]: (prev[profileStage] ?? []).map((c) =>
          String(c.id) === String(updated.id) ? { ...c, ...updated } : c
        ),
      }));
    }
  };

  // Poll for completed exam submissions every 30s when there are invited candidates without a score.
  useEffect(() => {
    const check = async () => {
      const pending = (pipelineData.l1 ?? []).filter((c) => c.examInvited && c.examScore == null && c.examId);
      if (pending.length === 0) return;
      let updated = false;
      const nextL1 = [...(pipelineData.l1 ?? [])];
      for (const c of pending) {
        try {
          const sub = await fetchSubmission({ examId: c.examId, candidateId: c.id }).unwrap();
          if (sub?.score != null) {
            const idx = nextL1.findIndex((x) => String(x.id) === String(c.id));
            if (idx !== -1) { nextL1[idx] = { ...nextL1[idx], examScore: sub.score }; updated = true; }
          }
        } catch { /* not submitted yet */ }
      }
      if (updated) persistStages({ ...pipelineData, l1: nextL1 });
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [pipelineData.l1, selectedReqId]);

  // Schedule interview drawer
  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false);
  const [scheduleCandidate, setScheduleCandidate] = useState(null);

  // Populate the board whenever a new requirement's stages arrive (or none selected).
  useEffect(() => {
    if (selectedReqId == null) {
      setPipelineData(EMPTY_STAGES);
    } else if (savedStages) {
      setPipelineData({ ...EMPTY_STAGES, ...savedStages });
    }
  }, [selectedReqId, savedStages]);

  // Apply a stage change locally and persist it to the backend.
  const persistStages = (nextData) => {
    setPipelineData(nextData);
    if (selectedReqId != null) {
      savePipelineStages({ requirementId: selectedReqId, stages: nextData });
    }
  };

  // Remove a candidate card from the pipeline entirely and persist it.
  const handleRemoveCandidate = (stageKey, candidateId) => {
    const candidate = pipelineData[stageKey]?.find((c) => String(c.id) === String(candidateId));
    const nextData = {
      ...pipelineData,
      [stageKey]: pipelineData[stageKey].filter((c) => String(c.id) !== String(candidateId)),
    };
    persistStages(nextData);
    message.success(`${candidate?.name ?? 'Candidate'} removed from pipeline`);
  };

  // Rate a candidate (L2/L3 interview rounds only) and persist it.
  const handleRateCandidate = (stageKey, candidateId, rating) => {
    const nextData = {
      ...pipelineData,
      [stageKey]: pipelineData[stageKey].map((c) =>
        String(c.id) === String(candidateId) ? { ...c, rating } : c
      ),
    };
    persistStages(nextData);
    if (profileCandidate?.id === candidateId) {
      setProfileCandidate((prev) => (prev ? { ...prev, rating } : prev));
    }
  };

  // Rank one or more candidates via Claude and move them to the ranked stage.
  // `candidates` can be a subset (single drag) or the full ingested list (button).
  const rankAndMove = async (candidates, sourceStage = 'ingested') => {
    if (!selectedReqId) {
      message.warning('Select a requirement first');
      return;
    }
    const requirement = (requirements ?? []).find((r) => String(r.id) === String(selectedReqId));
    if (!requirement) {
      message.warning('Could not find the selected requirement');
      return;
    }
    if (candidates.length === 0) {
      message.info('No candidates to rank');
      return;
    }

    const hide = message.loading(`Ranking ${candidates.length} candidate(s) with Claude…`, 0);
    try {
      const { results } = await rankCandidatesApi({ candidates, requirement }).unwrap();

      // Merge scores back into candidates
      const scored = candidates.map((c) => {
        const r = results.find((res) => String(res.id) === String(c.id));
        return r ? { ...c, score: r.score, rankSummary: r.summary } : c;
      });

      // Remove from source stage, add (with scores) to ranked
      const updated = { ...pipelineData };
      const scoredIds = new Set(scored.map((c) => String(c.id)));
      updated[sourceStage] = updated[sourceStage].filter((c) => !scoredIds.has(String(c.id)));
      // Keep any existing ranked candidates that weren't part of this batch
      const existingRanked = updated.ranked.filter((c) => !scoredIds.has(String(c.id)));
      // Sort new additions by score descending
      const sortedScored = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      updated.ranked = [...existingRanked, ...sortedScored];

      persistStages(updated);
      message.success(`${scored.length} candidate(s) ranked and moved to Ranked`);
    } catch (err) {
      console.error('Ranking failed:', err);
      message.error('Ranking failed. Check that the backend has ANTHROPIC_API_KEY set.');
    } finally {
      hide();
    }
  };

  const handleDragStart = (e, candidate, sourceStage) => {
    setDraggedCandidate({ candidate, sourceStage });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    if (!draggedCandidate) return;

    const { candidate, sourceStage } = draggedCandidate;
    setDraggedCandidate(null);

    if (sourceStage === targetStage) return;

    // Dropping onto ranked triggers Claude ranking
    if (targetStage === 'ranked') {
      rankAndMove([candidate], sourceStage);
      return;
    }

    // Moving to a different stage resets any interview rating from the previous round.
    const { rating, ...movedCandidate } = candidate;

    const updated = { ...pipelineData };
    updated[sourceStage] = updated[sourceStage].filter((c) => c.id !== candidate.id);
    updated[targetStage] = [...updated[targetStage], movedCandidate];
    persistStages(updated);

    // Dropping onto L1 → prompt to send exam invite
    // if (targetStage === 'l1' && currentExam) {
    //   Modal.confirm({
    //     title: `Send exam invite to ${candidate.name}?`,
    //     content: `This will email the L1 assessment link to ${candidate.email || 'the candidate'}.`,
    //     okText: 'Send Invite',
    //     okButtonProps: { style: { backgroundColor: '#2563eb' } },
    //     onOk: () => handleSendInvite(candidate),
    //   });
    // }
  };

  // True if a candidate already exists in any pipeline stage
  const isInPipeline = (candidateId) =>
    Object.values(pipelineData).some((stage) => stage.some((c) => c.id === candidateId));

  // Add a candidate from the database into the Ingested stage
  const handleAddToIngested = (candidate) => {
    if (selectedReqId == null) {
      message.warning('Select a requirement first');
      return;
    }
    if (isInPipeline(candidate.id)) {
      message.info(`${candidate.name} is already in the pipeline`);
      return;
    }
    persistStages({
      ...pipelineData,
      ingested: [...pipelineData.ingested, candidate],
    });
    message.success(`${candidate.name} added to Ingested`);
  };

  // Upload one or more resumes and add each successfully-parsed candidate straight to Ingested.
  const handleUploadResumeClick = () => {
    if (selectedReqId == null) {
      message.warning('Select a requirement first');
      return;
    }
    resumeFileInputRef.current?.click();
  };

  const handleResumeFilesSelected = async (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;

    const hide = files.length > 1 ? message.loading(`Uploading ${files.length} resume(s)…`, 0) : null;
    let successCount = 0;
    let duplicateCount = 0;
    let failCount = 0;

    for (const file of files) {
      try {
        const candidate = await uploadResume(file).unwrap();
        successCount++;
        handleAddToIngested(candidate);
      } catch (err) {
        if (err?.status === 409) duplicateCount++;
        else failCount++;
      }
    }

    if (hide) hide();
    if (files.length === 1) {
      if (successCount) message.success('Resume uploaded and added to Ingested');
      else if (duplicateCount) message.warning('Duplicate candidate — already exists in the database');
      else message.error('Failed to upload resume');
    } else {
      if (successCount) message.success(`${successCount} resume(s) uploaded and added to Ingested`);
      if (duplicateCount) message.warning(`${duplicateCount} duplicate resume(s) skipped`);
      if (failCount) message.error(`${failCount} resume(s) failed to upload`);
    }
  };

  // --- Online Exam handlers ---
  const openExam = (mode) => {
    setExamMode(mode);
    setExamDraft(SAMPLE_EXAM);
    setExamModalOpen(true);
  };

  const handleExamMenuClick = async ({ key }) => {
    if (key === 'generate') {
      if (!selectedReqId) { message.warning('Select a requirement first'); return; }
      const hide = message.loading('Generating exam with Claude…', 0);
      try {
        await generateExamApi(selectedReqId).unwrap();
        refetchExam();
        message.success('Exam generated and saved!');
      } catch (err) {
        message.error('Failed to generate exam. Check ANTHROPIC_API_KEY.');
      } finally { hide(); }
    } else if (key === 'view') {
      if (!currentExam) { message.info('Generate an exam first.'); return; }
      setExamDraft(currentExam);
      openExam('view');
    } else if (key === 'edit') {
      if (!currentExam) { message.info('Generate an exam first.'); return; }
      setExamDraft(currentExam);
      openExam('edit');
    } else if (key === 'link') {
      if (!currentExam) { message.info('Generate an exam first.'); return; }
      const url = `${window.location.origin}/exam/${currentExam.requirementId}`;
      navigator.clipboard.writeText(url).then(
        () => message.success('Exam link copied to clipboard'),
        () => message.info(`Exam link: ${url}`),
      );
    } else if (key === 'delete') {
      Modal.confirm({
        title: 'Delete online exam?',
        content: 'This will remove the current L1 online exam. This action cannot be undone.',
        okText: 'Delete',
        okButtonProps: { danger: true },
        onOk: () => message.success('Online exam deleted'),
      });
    }
  };

  const handleSendInvite = async (candidate) => {
    if (!currentExam) { message.warning('Generate an exam for this requirement first.'); return; }
    const requirement = (requirements ?? []).find((r) => String(r.id) === String(selectedReqId));
    try {
      const { examUrl } = await sendExamInviteApi({
        candidateId: candidate.id,
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        examId: currentExam.requirementId,
        jobTitle: requirement?.title ?? 'Job',
      }).unwrap();
      // Mark candidate as exam-invited in the pipeline
      const updated = { ...pipelineData };
      updated.l1 = updated.l1.map((c) =>
        String(c.id) === String(candidate.id) ? { ...c, examInvited: true, examId: currentExam.requirementId } : c
      );
      persistStages(updated);
      message.success(`Exam invite sent to ${candidate.name}! Link: ${examUrl}`);
    } catch {
      message.error('Failed to send invite. Check EMAIL_USER/EMAIL_PASS env vars.');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(EXAM_LINK);
      message.success('Exam link copied to clipboard');
    } catch {
      message.error('Could not copy link');
    }
  };

  const updateDraftQuestion = (questionId, value) => {
    setExamDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === questionId ? { ...q, question: value } : q)),
    }));
  };

  const updateDraftOption = (questionId, optKey, value) => {
    setExamDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId ? { ...q, options: { ...q.options, [optKey]: value } } : q
      ),
    }));
  };

  const examMenuItems = [
    { key: 'generate', icon: <FileAddOutlined />, label: currentExam ? 'Regenerate Exam' : 'Generate Exam' },
    { key: 'link', icon: <LinkOutlined />, label: 'Copy Exam Link', disabled: !currentExam },
    { type: 'divider' },
    { key: 'delete', icon: <DeleteOutlined />, label: 'Delete Exam', danger: true, disabled: !currentExam },
  ];

  const isOpenPosting = (req) => (req.status ?? 'open') === 'open';
  const visibleRequirements = (requirements ?? []).filter(
    (req) =>
      (region === 'global' || (req.regions ?? []).includes(region)) &&
      (showAllPostings || isOpenPosting(req) || String(req.id) === String(selectedReqId))
  );

  const filteredDb = candidateList.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      (c.skills ?? []).some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBack && (
            <Button icon={<ArrowLeftOutlined />} onClick={onBack} style={{ height: 40 }}>
              {backLabel}
            </Button>
          )}
          <Title level={4} style={{ margin: 0, whiteSpace: 'nowrap' }}>Pipeline:</Title>
          <Select
            showSearch
            placeholder="Select a requirement"
            value={selectedReqId}
            onChange={setSelectedReqId}
            loading={isLoading}
            optionFilterProp="label"
            style={{ minWidth: 280 }}
            options={visibleRequirements.map((r) => ({ value: r.id, label: r.title }))}
          />
          <Tooltip title="Toggle between open job postings only and all postings (including closed)">
            <Segmented
              value={showAllPostings ? 'all' : 'open'}
              onChange={(val) => setShowAllPostings(val === 'all')}
              options={[
                { label: 'Open', value: 'open' },
                { label: 'All', value: 'all' },
              ]}
            />
          </Tooltip>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
        <Tooltip title={isGenerateExamEnabled ? 'Auto-generate L1 exam using AI' : 'AI Exam Generation is disabled in Settings'}>
            <span>
              <Dropdown
                menu={{ items: examMenuItems, onClick: handleExamMenuClick }}
                trigger={['click']}
                disabled={!isGenerateExamEnabled}
              >
                <Button
                  disabled={!isGenerateExamEnabled}
                  type={currentExam ? 'default' : 'primary'}
                  size="small"
                  loading={isGeneratingExam}
                  style={{ height: 40, paddingInline: 20 }}>
                  <Space>
                    {currentExam ? '✅ Exam Ready' : 'Online Exam'}
                    <DownOutlined />
                  </Space>
                </Button>
              </Dropdown>
            </span>
          </Tooltip>
          <Button
            icon={<TeamOutlined />}
            onClick={() => setDrawerOpen(true)}
            style={{ height: 40, paddingInline: 20, borderColor: '#2563eb', color: '#2563eb' }}
          >
            Add Candidates
          </Button>
          <Button
            type="primary"
            loading={isRanking}
            onClick={() => rankAndMove(pipelineData.ingested ?? [], 'ingested')}
            style={{ backgroundColor: '#2563eb', height: 40, paddingInline: 24 }}
          >
            Trigger Ranking
          </Button>
          <Tooltip title="Toggle compact cards to fit more candidates per column">
            <Button
              icon={<CompressOutlined />}
              type={compact ? 'primary' : 'default'}
              onClick={() => setCompact((v) => !v)}
              style={{ height: 40, paddingInline: 20, ...(compact ? { backgroundColor: '#2563eb' } : {}) }}
            >
            </Button>
          </Tooltip>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, minHeight: compact ? 'auto' : 600, alignItems: 'start' }}>
        {[
          { key: 'ingested', label: 'Ingested (Claude Parsed)' },
          { key: 'ranked', label: 'Ranked (Claude Scored)' },
          { key: 'l1', label: 'L1 (Exam)' },
          { key: 'l2', label: 'L2 (Recruiter)' },
          { key: 'l3', label: 'L3 (Final)' }
        ].map((stage) => (
          <div
            key={stage.key}
            style={{
              background: '#f5f5f5',
              borderRadius: 8,
              padding: 12,
              minHeight: compact ? 120 : 400,
              border: draggedCandidate?.sourceStage !== stage.key ? '2px solid transparent' : '2px dashed #2563eb'
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.key)}
          >
            <Title level={5} style={{ marginBottom: compact ? 10 : 16, fontSize: 12, fontWeight: 600 }}>
              {stage.label}
              <div style={{ fontSize: 11, color: '#666', fontWeight: 400 }}>
                {pipelineData[stage.key]?.length || 0} Candidates
              </div>
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 12 }}>
              {[...(pipelineData[stage.key] ?? [])]
                .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || (b.rating ?? 0) - (a.rating ?? 0))
                .map((candidate) => (
                <Card
                  key={candidate.id}
                  style={{
                    background: '#fff',
                    cursor: 'grab',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    opacity: draggedCandidate?.candidate.id === candidate.id ? 0.5 : 1
                  }}
                  styles={{ body: { padding: compact ? '6px 10px' : 12 } }}
                  hoverable
                  draggable
                  onDragStart={(e) => handleDragStart(e, candidate, stage.key)}
                >
                  {compact ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                      <Text strong ellipsis style={{ flex: 1 }}>{candidate.name}</Text>
                      <Space size={4}>
                        <Tooltip title="View candidate profile">
                          <Button
                            size="small"
                            icon={<UserOutlined />}
                            onClick={(e) => { e.stopPropagation(); setProfileCandidate(candidate); setProfileStage(stage.key); setProfileModalOpen(true); }}
                            style={{ fontSize: 10, height: 20, padding: '0 4px' }}
                          />
                        </Tooltip>
                        {candidate.score != null && (
                          <Tooltip title={candidate.rankSummary}>
                            <Tag color="blue" style={{ fontSize: 10, cursor: 'help', margin: 0 }}>{candidate.score}/100</Tag>
                          </Tooltip>
                        )}
                        {stage.key === 'l1' && candidate.examScore != null && (
                          <Tag color="green" style={{ fontSize: 10, margin: 0 }}>Score: {candidate.examScore}%</Tag>
                        )}
                        {stage.key === 'l1' && candidate.examInvited && candidate.examScore == null && (
                          <Tag color="orange" style={{ fontSize: 10, margin: 0 }}>Exam Sent</Tag>
                        )}
                        {(stage.key === 'l2' || stage.key === 'l3') && (
                          <Tooltip title={candidate.interviewData
                            ? `Scheduled: ${new Date(candidate.interviewData.startISO).toLocaleString()} — click to reschedule`
                            : 'Schedule Interview'
                          }>
                            <Button
                              size="small"
                              icon={<CalendarOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setScheduleCandidate(candidate);
                                setScheduleDrawerOpen(true);
                              }}
                              style={{
                                fontSize: 10, height: 20, padding: '0 4px',
                                ...(candidate.interviewData
                                  ? { backgroundColor: '#2563eb', borderColor: '#2563eb', color: '#fff' }
                                  : { borderColor: '#2563eb', color: '#2563eb' }),
                              }}
                            />
                          </Tooltip>
                        )}
                        {(stage.key === 'l2' || stage.key === 'l3') && candidate.rating > 0 && (
                          <Tag color="gold" style={{ fontSize: 10, margin: 0 }}>★ {candidate.rating}</Tag>
                        )}
                        <Popconfirm
                          title="Remove this candidate from the pipeline?"
                          onConfirm={() => handleRemoveCandidate(stage.key, candidate.id)}
                        >
                          <Tooltip title="Remove from pipeline">
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={(e) => e.stopPropagation()}
                              style={{ fontSize: 10, height: 20, padding: '0 4px' }}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </Space>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12 }}>
                      {/* Name row with view profile button */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <div>
                          <Text strong style={{ fontSize: 12 }}>{candidate.name}</Text>
                          {candidate.title && (
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{candidate.title}</div>
                          )}
                          {!candidate.title && candidate.email && (
                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{candidate.email}</div>
                          )}
                        </div>
                        <Space size={4} style={{ flexShrink: 0 }}>
                          <Tooltip title="View candidate profile">
                            <Button
                              size="small"
                              icon={<UserOutlined />}
                              onClick={(e) => { e.stopPropagation(); setProfileCandidate(candidate); setProfileStage(stage.key); setProfileModalOpen(true); }}
                              style={{ fontSize: 10, height: 22, padding: '0 6px' }}
                            />
                          </Tooltip>
                          <Popconfirm
                            title="Remove this candidate from the pipeline?"
                            onConfirm={() => handleRemoveCandidate(stage.key, candidate.id)}
                          >
                            <Tooltip title="Remove from pipeline">
                              <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={(e) => e.stopPropagation()}
                                style={{ fontSize: 10, height: 22, padding: '0 6px' }}
                              />
                            </Tooltip>
                          </Popconfirm>
                        </Space>
                      </div>

                      {/* Skills */}
                      {(candidate.skills || []).length > 0 && (() => {
                        const visible = candidate.skills.slice(0, 4);
                        const extra = candidate.skills.length - visible.length;
                        return (
                          <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {visible.map((s) => (
                              <Tag key={s} style={{ fontSize: 10, margin: 0, padding: '0 5px', lineHeight: '18px' }}>{s}</Tag>
                            ))}
                            {extra > 0 && (
                              <Tag style={{ fontSize: 10, margin: 0, padding: '0 5px', lineHeight: '18px', color: '#9ca3af', borderColor: '#d1d5db', background: '#f9fafb' }}>+{extra}</Tag>
                            )}
                          </div>
                        );
                      })()}

                      {/* Rank score */}
                      {candidate.score != null && (
                        <div style={{ marginTop: 6 }}>
                          <Tooltip title={candidate.rankSummary}>
                            <Tag color="blue" style={{ fontSize: 10, cursor: candidate.rankSummary ? 'help' : 'default', margin: 0 }}>
                              Rank Score: {candidate.score}/100
                            </Tag>
                          </Tooltip>
                        </div>
                      )}

                      {/* Exam score */}
                      {candidate.examScore != null && (
                        <div style={{ marginTop: 4 }}>
                          <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 10, margin: 0 }}>
                            Exam Score: {candidate.examScore}%
                          </Tag>
                        </div>
                      )}

                      {/* Exam action */}
                      {stage.key === 'l1' && candidate.examScore == null && (
                        <div style={{ marginTop: 4 }}>
                          {candidate.examInvited ? (
                            <Tooltip title="Resend exam invite link">
                              <Button
                                size="small"
                                icon={<MailOutlined />}
                                onClick={(e) => { e.stopPropagation(); handleSendInvite(candidate); }}
                                style={{ fontSize: 10, height: 22, color: '#9ca3af', borderColor: '#d1d5db', backgroundColor: '#f9fafb' }}
                              >
                                Resend Link
                              </Button>
                            </Tooltip>
                          ) : (
                            <Button
                              size="small"
                              icon={<MailOutlined />}
                              onClick={(e) => { e.stopPropagation(); handleSendInvite(candidate); }}
                              style={{ fontSize: 10, height: 22 }}
                            >
                              Send Exam
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Interview actions */}
                      {(stage.key === 'l2' || stage.key === 'l3') && (
                        <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {candidate.interviewData ? (
                            <>
                              <Tooltip title={`Teams: ${candidate.interviewData.teamsLink ?? 'N/A'}`}>
                                <Tag icon={<CalendarOutlined />} color="blue" style={{ fontSize: 10, cursor: 'default', margin: 0 }}>
                                  {new Date(candidate.interviewData.startISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </Tag>
                              </Tooltip>
                              <Button
                                size="small"
                                onClick={(e) => { e.stopPropagation(); setScheduleCandidate(candidate); setScheduleDrawerOpen(true); }}
                                style={{ fontSize: 10, height: 22 }}
                              >
                                Reschedule
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="small"
                              icon={<CalendarOutlined />}
                              onClick={(e) => { e.stopPropagation(); setScheduleCandidate(candidate); setScheduleDrawerOpen(true); }}
                              style={{ fontSize: 10, height: 22, borderColor: '#2563eb', color: '#2563eb' }}
                            >
                              Schedule
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Interview rating */}
                      {(stage.key === 'l2' || stage.key === 'l3') && (
                        <div style={{ marginTop: 6 }} onMouseDown={(e) => e.stopPropagation()}>
                          <Rate
                            value={candidate.rating ?? 0}
                            onChange={(val) => handleRateCandidate(stage.key, candidate.id, val)}
                            style={{ fontSize: 14 }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
              {pipelineData[stage.key]?.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: 20, 
                  color: '#bfbfbf',
                  fontSize: 12
                }}>
                  Drag candidates here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* --- Candidate Database Drawer --- */}
      <Drawer
        title="Add Candidates from Database"
        placement="right"
        width={380}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <input
          ref={resumeFileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          multiple
          style={{ display: 'none' }}
          onChange={handleResumeFilesSelected}
        />

        <Button
          block
          icon={<UploadOutlined />}
          loading={isUploadingResume}
          onClick={handleUploadResumeClick}
          style={{ marginBottom: 16, backgroundColor: '#2563eb', color: '#fff', borderColor: '#2563eb' }}
        >
          Upload Resume(s)
        </Button>

        <Input
          placeholder="Search by name, email or skill"
          prefix={<SearchOutlined />}
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 16 }}
        />

        {filteredDb.length === 0 ? (
          <Empty description="No candidates found" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredDb.map((candidate) => {
              const added = isInPipeline(candidate.id);
              return (
                <Card
                  key={candidate.id}
                  size="small"
                  style={{ border: '1px solid #e5e7eb', borderRadius: 6 }}
                  styles={{ body: { padding: 12 } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontSize: 12 }}>
                      <Text strong>{candidate.name}</Text>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{candidate.email}</div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                        SKILLS: {(candidate.skills || []).join(', ')}
                      </div>
                    </div>
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      disabled={added}
                      onClick={() => handleAddToIngested(candidate)}
                      style={added ? undefined : { backgroundColor: '#2563eb' }}
                    >
                      {added ? 'Added' : 'Add'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Drawer>

      {/* --- Schedule Interview Drawer --- */}
      <ScheduleInterviewDrawer
        open={scheduleDrawerOpen}
        onClose={() => { setScheduleDrawerOpen(false); setScheduleCandidate(null); }}
        onScheduled={(interviewData) => {
          if (!scheduleCandidate) return;
          const updated = { ...pipelineData };
          for (const stageKey of ['l2', 'l3']) {
            updated[stageKey] = updated[stageKey].map((c) =>
              String(c.id) === String(scheduleCandidate.id)
                ? { ...c, interviewData }
                : c
            );
          }
          persistStages(updated);
        }}
        candidate={scheduleCandidate}
        region={region}
        requirement={(requirements ?? []).find((r) => String(r.id) === String(selectedReqId))}
      />

      {/* --- Candidate Profile Modal --- */}
      <Modal
        title="Candidate Profile"
        open={profileModalOpen}
        onCancel={() => setProfileModalOpen(false)}
        afterClose={() => { setProfileCandidate(null); setProfileStage(null); }}
        width={760}
        destroyOnClose
        footer={
          <Space>
            <Tooltip title={profileCandidate?.aiParsed ? 'Already parsed with Claude' : (!profileCandidate?.resumeS3Key ? 'No resume on file' : '')}>
              <Button
                icon={<ThunderboltOutlined />}
                loading={isReparsingWithAi}
                disabled={!!profileCandidate?.aiParsed || !profileCandidate?.resumeS3Key}
                onClick={handleReparseWithAi}
              >
                Parse with Claude
              </Button>
            </Tooltip>
            <Button key="close" onClick={() => setProfileModalOpen(false)}>Close</Button>
          </Space>
        }
        styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
      >
        {profileCandidate && (
          <div style={{ marginTop: 8 }}>
            {profileCandidate.summary && (
              <div style={{
                background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 6,
                padding: '10px 14px', marginBottom: 16, color: '#1d3557', fontSize: 13,
              }}>
                {profileCandidate.summary}
              </div>
            )}

            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Full Name" span={2}>
                <strong>{profileCandidate.name || 'N/A'}</strong>
                {profileCandidate.title && (
                  <span style={{ marginLeft: 8, color: '#6b7280', fontWeight: 400 }}>— {profileCandidate.title}</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                <EditableCandidateField candidate={profileCandidate} field="email" placeholder="Email" onSaved={handleProfileFieldSaved} />
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                <EditableCandidateField candidate={profileCandidate} field="phone" placeholder="Phone" onSaved={handleProfileFieldSaved} />
              </Descriptions.Item>
              {profileCandidate.location && (
                <Descriptions.Item label="Location">{profileCandidate.location}</Descriptions.Item>
              )}
              {profileCandidate.yearsOfExperience > 0 && (
                <Descriptions.Item label="Experience">
                  {profileCandidate.yearsOfExperience} year{profileCandidate.yearsOfExperience !== 1 ? 's' : ''}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Skills" span={2}>
                <Space size={[4, 6]} wrap>
                  {(profileCandidate.skills || []).length > 0
                    ? profileCandidate.skills.map((s) => <Tag color="blue" key={s}>{s}</Tag>)
                    : <span style={{ color: '#9ca3af' }}>None</span>
                  }
                </Space>
              </Descriptions.Item>
              {(profileCandidate.certifications || []).length > 0 && (
                <Descriptions.Item label="Certifications" span={2}>
                  <Space size={[4, 6]} wrap>
                    {profileCandidate.certifications.map((c) => <Tag color="green" key={c}>{c}</Tag>)}
                  </Space>
                </Descriptions.Item>
              )}
              {(profileCandidate.languages || []).length > 0 && (
                <Descriptions.Item label="Languages" span={2}>
                  {profileCandidate.languages.join(', ')}
                </Descriptions.Item>
              )}
              {profileCandidate.score != null && (
                <Descriptions.Item label="Rank Score" span={2}>
                  <Tooltip title={profileCandidate.rankSummary}>
                    <Tag color="blue" style={{ cursor: 'help' }}>{profileCandidate.score}/100</Tag>
                  </Tooltip>
                  {profileCandidate.rankSummary && (
                    <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>{profileCandidate.rankSummary}</span>
                  )}
                </Descriptions.Item>
              )}
              {(profileStage === 'l2' || profileStage === 'l3') && (
                <Descriptions.Item label="Interview Rating" span={2}>
                  <Rate
                    value={profileCandidate.rating ?? 0}
                    onChange={(val) => handleRateCandidate(profileStage, profileCandidate.id, val)}
                  />
                </Descriptions.Item>
              )}
            </Descriptions>

            {(profileCandidate.experience || []).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>Work Experience</div>
                {profileCandidate.experience.map((exp, i) => (
                  <div key={i} style={{ borderLeft: '3px solid #6366f1', paddingLeft: 12, marginBottom: 12 }}>
                    <div style={{ fontWeight: 600 }}>{exp.title} <span style={{ color: '#6b7280', fontWeight: 400 }}>@ {exp.company}</span></div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>{exp.startDate} – {exp.endDate}</div>
                    {exp.description && <div style={{ fontSize: 13 }}>{exp.description}</div>}
                  </div>
                ))}
              </div>
            )}

            {(profileCandidate.education || []).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>Education</div>
                {profileCandidate.education.map((edu, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <span style={{ fontWeight: 500 }}>{edu.degree}</span>
                    {edu.institution && <span style={{ color: '#6b7280' }}> — {edu.institution}</span>}
                    {edu.year && <span style={{ color: '#9ca3af', fontSize: 12 }}> ({edu.year})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* --- Online Exam Modal (View / Edit) --- */}
      <Modal
        open={examModalOpen}
        onCancel={() => setExamModalOpen(false)}
        width={760}
        destroyOnClose
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 32 }}>
            <span>{examMode === 'edit' ? 'Edit Online Exam' : 'Online Exam Preview'}</span>
            <Space>
              <Tooltip title={EXAM_LINK}>
                <Button icon={<CopyOutlined />} onClick={handleCopyLink}>Copy Link</Button>
              </Tooltip>
              <Button type="primary" icon={<ShareAltOutlined />} onClick={handleCopyLink} style={{ backgroundColor: '#2563eb' }}>
                Share with Candidates
              </Button>
            </Space>
          </div>
        }
        footer={
          examMode === 'edit' ? (
            <Space>
              <Button onClick={() => setExamModalOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                style={{ backgroundColor: '#2563eb' }}
                onClick={() => {
                  message.success('Exam saved');
                  setExamModalOpen(false);
                }}
              >
                Save Exam
              </Button>
            </Space>
          ) : (
            <Button onClick={() => setExamModalOpen(false)}>Close</Button>
          )
        }
        styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
      >
        <Title level={5} style={{ marginTop: 0 }}>{examDraft.title}</Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          10 questions · select one option (A–D) per question
        </Text>

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {examDraft.questions.map((q, idx) => (
            <div key={q.id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
              {examMode === 'edit' ? (
                <Input
                  value={q.question}
                  onChange={(e) => updateDraftQuestion(q.id, e.target.value)}
                  prefix={<Text strong>{idx + 1}.</Text>}
                  style={{ marginBottom: 12 }}
                />
              ) : (
                <Text strong style={{ display: 'block', marginBottom: 12 }}>
                  {idx + 1}. {q.question}
                </Text>
              )}

              {examMode === 'edit' ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {OPTION_KEYS.map((key) => (
                    <Input
                      key={key}
                      addonBefore={key}
                      value={q.options[key]}
                      onChange={(e) => updateDraftOption(q.id, key, e.target.value)}
                    />
                  ))}
                </Space>
              ) : (
                <Radio.Group
                  value={answers[q.id]}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  {OPTION_KEYS.map((key) => (
                    <Radio key={key} value={key}>
                      <Text strong>{key}.</Text> {q.options[key]}
                    </Radio>
                  ))}
                </Radio.Group>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
};

export default Pipeline;
