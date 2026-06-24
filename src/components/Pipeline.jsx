import React, { useState, useEffect } from 'react';
import { Button, Card, Typography, Select, Drawer, Input, Empty, message, Dropdown, Modal, Radio, Space, Tooltip, Segmented } from 'antd';
import { PlusOutlined, TeamOutlined, SearchOutlined, DownOutlined, FileAddOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ShareAltOutlined, CopyOutlined, CompressOutlined } from '@ant-design/icons';
import { useGetRequirementsQuery } from '../redux/requirementsApi';

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
const CANDIDATE_DB = [
  { id: 101, name: 'Maria Lopez', email: 'maria.lopez@example.com', skills: ['Node.js', 'AWS'] },
  { id: 102, name: 'Aiden Clark', email: 'aiden.clark@example.com', skills: ['React', 'TypeScript'] },
  { id: 103, name: 'Priya Nair', email: 'priya.nair@example.com', skills: ['Node.js', 'Kafka'] },
  { id: 104, name: 'Lucas Meyer', email: 'lucas.meyer@example.com', skills: ['Vue', 'Docker'] },
  { id: 105, name: 'Sara Khan', email: 'sara.khan@example.com', skills: ['Python', 'AWS'] },
  { id: 106, name: 'David Okoro', email: 'david.okoro@example.com', skills: ['Go', 'Kubernetes'] },
  { id: 107, name: 'Elena Rossi', email: 'elena.rossi@example.com', skills: ['Java', 'Spring'] },
  { id: 108, name: 'Tom Becker', email: 'tom.becker@example.com', skills: ['Node.js', 'GraphQL'] },
];

const Pipeline = ({ reqId = null }) => {
  const { data: requirements, isLoading } = useGetRequirementsQuery();
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
  const [pipelineData, setPipelineData] = useState({
    ingested: [
      { id: 1, name: 'Candidate 1', email: 'candidate1@example.com', skills: ['Node.js', 'React'] },
      { id: 2, name: 'Candidate 2', email: 'candidate2@example.com', skills: ['Node.js', 'Vue'] },
    ],
    ranked: [
      { id: 3, name: 'Candidate Name 1', email: 'candidate3@example.com', skills: ['Skill 1', 'Skill 2'], score: 85 },
      { id: 4, name: 'Candidate Name 2', email: 'candidate4@example.com', skills: ['Skill 1', 'Skill 2'], score: 75 },
    ],
    l1: [],
    l2: [],
    l3: [],
  });
  const [draggedCandidate, setDraggedCandidate] = useState(null);

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

    if (sourceStage === targetStage) {
      setDraggedCandidate(null);
      return;
    }

    setPipelineData(prev => {
      const updated = { ...prev };
      
      // Remove from source stage
      updated[sourceStage] = updated[sourceStage].filter(c => c.id !== candidate.id);
      
      // Add to target stage
      updated[targetStage] = [...updated[targetStage], candidate];
      
      return updated;
    });

    setDraggedCandidate(null);
  };

  // True if a candidate already exists in any pipeline stage
  const isInPipeline = (candidateId) =>
    Object.values(pipelineData).some((stage) => stage.some((c) => c.id === candidateId));

  // Add a candidate from the database into the Ingested stage
  const handleAddToIngested = (candidate) => {
    if (isInPipeline(candidate.id)) {
      message.info(`${candidate.name} is already in the pipeline`);
      return;
    }
    setPipelineData((prev) => ({
      ...prev,
      ingested: [...prev.ingested, candidate],
    }));
    message.success(`${candidate.name} added to Ingested`);
  };

  // --- Online Exam handlers ---
  const openExam = (mode) => {
    setExamMode(mode);
    setExamDraft(SAMPLE_EXAM);
    setExamModalOpen(true);
  };

  const handleExamMenuClick = ({ key }) => {
    if (key === 'generate') {
      message.success('New exam generated from the requirement (sample)');
      openExam('edit');
    } else if (key === 'view') {
      openExam('view');
    } else if (key === 'edit') {
      openExam('edit');
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
    { key: 'generate', icon: <FileAddOutlined />, label: 'Generate New' },
    { key: 'view', icon: <EyeOutlined />, label: 'View' },
    { key: 'edit', icon: <EditOutlined />, label: 'Edit' },
    { type: 'divider' },
    { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
  ];

  // A posting is treated as open unless its isClosed flag is true
  const isOpenPosting = (req) => !req.isClosed;
  const visibleRequirements = (requirements ?? []).filter(
    (req) => showAllPostings || isOpenPosting(req) || req.id === selectedReqId
  );

  const filteredDb = CANDIDATE_DB.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.skills.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
            <Button style={{ height: 40, paddingInline: 20 }}>
              <Space>
                Online Exam
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
          <Button type="primary" style={{ backgroundColor: '#2563eb', height: 40, paddingInline: 24 }}>
            Trigger Ranking (Opus)
          </Button>
        </div>
      </div>
<Tooltip title="Toggle compact cards to fit more candidates per column">
            <Button
              icon={<CompressOutlined />}
              type={compact ? 'primary' : 'default'}
              onClick={() => setCompact((v) => !v)}
              style={{ height: 40, paddingInline: 20, ...(compact ? { backgroundColor: '#2563eb' } : {}) }}
            >
            </Button>
          </Tooltip>
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
                      {candidate.score && (
                        <span style={{ padding: '1px 6px', backgroundColor: '#dbeafe', borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {candidate.score}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12 }}>
                      <Text strong>{candidate.name}</Text>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                        EMAIL: {candidate.email}
                      </div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                        SKILLS: {candidate.skills.join(', ')}
                      </div>
                      {candidate.score && (
                        <div style={{ marginTop: 8, padding: 8, backgroundColor: '#dbeafe', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                          RANK SCORE: {candidate.score}-100
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
                        SKILLS: {candidate.skills.join(', ')}
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
