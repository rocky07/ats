import React, { useState, useEffect } from 'react';
import { Button, Card, Typography, Select, Drawer, Input, Empty, message, Dropdown, Modal, Radio, Space, Tooltip, Segmented, Tag } from 'antd';
import { PlusOutlined, TeamOutlined, SearchOutlined, DownOutlined, FileAddOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ShareAltOutlined, CopyOutlined, CompressOutlined, MailOutlined, CheckCircleOutlined, LinkOutlined, CalendarOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useGetRequirementsQuery } from '../redux/requirementsApi';
import { useGetPipelineStagesQuery, useSavePipelineStagesMutation } from '../redux/pipelineStagesApi';
import { useGetAllCandidatesQuery } from '../redux/candidateApi';
import { useRankCandidatesMutation } from '../redux/intelligenceApi';
import {
  useGenerateExamMutation,
  useGetExamByRequirementQuery,
  useSendExamInviteMutation,
} from '../redux/examApi';
import { API_BASE_URL } from '../config';
import ScheduleInterviewDrawer from './ScheduleInterviewDrawer';

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
  const [selectedReqId, setSelectedReqId] = useState(reqId);
  const [showAllPostings, setShowAllPostings] = useState(false); // default: open postings only
  const [compact, setCompact] = useState(false); // compact card view for long lists

  // Preselect the requirement when navigated here from "View Pipeline"
  useEffect(() => {
    if (reqId != null) setSelectedReqId(reqId);
  }, [reqId]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
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
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteCandidate, setInviteCandidate] = useState(null);

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

    const updated = { ...pipelineData };
    updated[sourceStage] = updated[sourceStage].filter((c) => c.id !== candidate.id);
    updated[targetStage] = [...updated[targetStage], candidate];
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
      const url = `${window.location.origin}/exam/${currentExam.id}`;
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
        examId: currentExam.id,
        jobTitle: requirement?.title ?? 'Job',
      }).unwrap();
      // Mark candidate as exam-invited in the pipeline
      const updated = { ...pipelineData };
      updated.l1 = updated.l1.map((c) =>
        String(c.id) === String(candidate.id) ? { ...c, examInvited: true, examId: currentExam.id } : c
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
    (req) => showAllPostings || isOpenPosting(req) || String(req.id) === String(selectedReqId)
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
          <Dropdown menu={{ items: examMenuItems, onClick: handleExamMenuClick }} trigger={['click']}>
            <Button loading={isGeneratingExam} style={{ height: 40, paddingInline: 20 }}>
              <Space>
                {currentExam ? '✅ Exam Ready' : 'Online Exam'}
                <DownOutlined />
              </Space>
            </Button>
          </Dropdown>
          
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
              {pipelineData[stage.key]?.map((candidate) => (
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
                      </Space>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12 }}>
                      <Text strong>{candidate.name}</Text>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                        EMAIL: {candidate.email}
                      </div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                        SKILLS: {(candidate.skills || []).join(', ')}
                      </div>
                      {candidate.score != null && (
                        <Tooltip title={candidate.rankSummary}>
                          <div style={{ marginTop: 8, padding: 8, backgroundColor: '#dbeafe', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'help' }}>
                            RANK SCORE: {candidate.score}/100
                          </div>
                        </Tooltip>
                      )}
                      {stage.key === 'l1' && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {candidate.examScore != null ? (
                            <Tag icon={<CheckCircleOutlined />} color="success">
                              Exam Score: {candidate.examScore}%
                            </Tag>
                          ) : candidate.examInvited ? (
                            <Tag icon={<MailOutlined />} color="orange">Exam Sent</Tag>
                          ) : (
                            <Button
                              size="small"
                              icon={<MailOutlined />}
                              onClick={(e) => { e.stopPropagation(); handleSendInvite(candidate); }}
                              style={{ fontSize: 11, height: 24 }}
                            >
                              Send Exam
                            </Button>
                          )}
                        </div>
                      )}
                      {(stage.key === 'l2' || stage.key === 'l3') && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {candidate.interviewData ? (
                            <>
                              <Tooltip title={`Teams: ${candidate.interviewData.teamsLink ?? 'N/A'}`}>
                                <Tag icon={<CalendarOutlined />} color="blue" style={{ fontSize: 11, cursor: 'default' }}>
                                  Interview: {new Date(candidate.interviewData.startISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </Tag>
                              </Tooltip>
                              <Button
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setScheduleCandidate(candidate);
                                  setScheduleDrawerOpen(true);
                                }}
                                style={{ fontSize: 11, height: 24 }}
                              >
                                Reschedule
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="small"
                              icon={<CalendarOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setScheduleCandidate(candidate);
                                setScheduleDrawerOpen(true);
                              }}
                              style={{ fontSize: 11, height: 24, borderColor: '#2563eb', color: '#2563eb' }}
                            >
                              Schedule Interview
                            </Button>
                          )}
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
