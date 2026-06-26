import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useGetRequirementsQuery, useAddRequirementMutation, useUpdateRequirementMutation } from '../redux/requirementsApi';
import { useUploadResumeMutation,useGetAllCandidatesQuery } from '../redux/candidateApi';
import { useLazyGetPipelineStagesQuery, useSavePipelineStagesMutation } from '../redux/pipelineStagesApi';
import { useGetMarketIntelligenceMutation, useGenerateJobSummaryMutation } from '../redux/intelligenceApi';

// The fixed pipeline stages, in order.
const STAGE_KEYS = ['ingested', 'ranked', 'l1', 'l2', 'l3'];

// Flatten the backend stages object into a flat applicant list (with a stage field).
const stagesToApplicants = (stages = {}) =>
  STAGE_KEYS.flatMap((stage) => (stages[stage] ?? []).map((c) => ({ ...c, stage })));

// Rebuild the stages object from a flat applicant list.
const applicantsToStages = (applicants = []) => {
  const stages = STAGE_KEYS.reduce((acc, key) => ({ ...acc, [key]: [] }), {});
  applicants.forEach(({ stage, ...candidate }) => {
    (stages[stage] ?? stages.ingested).push(candidate);
  });
  return stages;
};
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Typography,
  Modal,
  Form,
  message,
  Select,
  Flex,
  Space,
  Progress,
  Badge,
  Slider,
  Tooltip,
  Upload,
  Tag,
  List,
  DatePicker,
  Divider,
  Empty,
  Avatar,
  Segmented,
  Table,
  InputNumber
} from 'antd';
import {
  FireOutlined,
  WarningOutlined,
  DashboardOutlined,
  InfoCircleOutlined,
  BulbOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  InboxOutlined,
  UserOutlined,
  AppstoreOutlined,
  TableOutlined
} from '@ant-design/icons';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;


// Pipeline stage display metadata
const STAGE_LABELS = { ingested: 'Ingested', ranked: 'Ranked', l1: 'L1 (Exam)', l2: 'L2 (Recruiter)', l3: 'L3 (Final)' };
const STAGE_COLORS = { ingested: 'blue', ranked: 'gold', l1: 'purple', l2: 'cyan', l3: 'green' };

const Requirements = ({ onViewPipeline }) => {
  // State management for Modal visibility and submitting loader
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { data: requirements, error, isLoading, isFetching } = useGetRequirementsQuery();
  // 3. Destructure the mutation trigger and its execution states
  const [addRequirement, { isLoading: isSubmitting }] = useAddRequirementMutation();
  const [updateRequirement] = useUpdateRequirementMutation();
  const [editingReq, setEditingReq] = useState(null); // null = create mode, object = edit mode
  // Live candidates from the backend
  const { data: candidateList = [] } = useGetAllCandidatesQuery();
  // Resume upload → backend parses the file and persists a candidate in lowdb
  const [uploadResume] = useUploadResumeMutation();
  // Pipeline stage persistence (load on open, save on change)
  const [loadPipeline] = useLazyGetPipelineStagesQuery();
  const [savePipelineStages] = useSavePipelineStagesMutation();
  // Dice market intelligence + AI job-summary generation
  const [fetchMarketIntelligence, { isLoading: isMarketLoading }] = useGetMarketIntelligenceMutation();
  const [generateJobSummary] = useGenerateJobSummaryMutation();
  
  // Ant Design form hook instance
  const [form] = Form.useForm();
  // Watch job type so we can conditionally show hourly-rate fields for W2 / C2C.
  const jobType = Form.useWatch('jobType', form);
  const watchedTitle = Form.useWatch('title', form);
  const watchedMustHaves = Form.useWatch('mustHaves', form);
  const watchedLocation = Form.useWatch('location', form);
  const watchedWorkMode = Form.useWatch('workMode', form);
  // Mock live market state (This would ideally update via your Dice MCP backend debounce)
  const [marketData, setMarketData] = useState({
    supply: { count: 0, level: 'High Competition', status: 'error' },
    velocity: { remotePct: 0, impact: 0 },
    salary: { marketMedian: 0, targetPercentile: 0 },
    gaps: { matchPct: 0, trending: [] }
  });

  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-fetch market intelligence when all required fields are filled
  useEffect(() => {
    const allFilled =
      watchedTitle?.trim() &&
      watchedLocation?.trim() &&
      watchedWorkMode &&
      jobType &&
      watchedMustHaves?.length > 0;

    if (!allFilled || !isModalOpen) return;

    const timer = setTimeout(async () => {
      try {
        const data = await fetchMarketIntelligence({
          title: watchedTitle,
          mustHaves: watchedMustHaves,
          location: watchedLocation,
          workMode: watchedWorkMode,
          jobType,
        }).unwrap();
        setMarketData(data);
      } catch (err) {
        console.error('Auto market intelligence failed:', err);
      }
    }, 800); // debounce so it doesn't fire on every keystroke

    return () => clearTimeout(timer);
  }, [watchedTitle, watchedMustHaves, watchedLocation, watchedWorkMode, jobType, isModalOpen]);

  // --- Layout & filtering ---
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'table'
  const [statusFilter, setStatusFilter] = useState('open'); // 'open' | 'draft' | 'closed' | 'all'

  const getStatus = (req) => req.status ?? (req.isClosed ? 'closed' : 'open');
  const STATUS_COLOR = { open: 'green', draft: 'default', closed: 'red' };
  const isOpenRequirement = (req) => getStatus(req) === 'open';
  const visibleRequirements = (requirements ?? []).filter(
    (req) => statusFilter === 'all' || getStatus(req) === statusFilter
  );

  // --- View Details modal: applicants & pipeline state ---
  const [viewReq, setViewReq] = useState(null);
  const [applicantsByReq, setApplicantsByReq] = useState({});
  const [addPick, setAddPick] = useState(null);

  const applicants = viewReq ? (applicantsByReq[viewReq.id] ?? []) : [];

  const handleView = async (req) => {
    setViewReq(req);
    // Load the persisted pipeline stages for this requirement from the backend.
    try {
      const stages = await loadPipeline(req.id).unwrap();
      setApplicantsByReq((prev) => ({ ...prev, [req.id]: stagesToApplicants(stages) }));
    } catch (err) {
      console.error('Failed to load pipeline:', err);
    }
  };

  // Apply an applicant-list change locally and persist the rebuilt stages to the backend.
  const persistApplicants = (reqId, updater) => {
    setApplicantsByReq((prev) => {
      const nextList = updater(prev[reqId] ?? []);
      savePipelineStages({ requirementId: reqId, stages: applicantsToStages(nextList) });
      return { ...prev, [reqId]: nextList };
    });
  };

  // Add a candidate from the database into the Ingested stage
  const handleAddFromDb = (candidateId) => {
    const cand = candidateList.find((c) => String(c.id) === String(candidateId));
    if (!cand || !viewReq) return;
    const list = applicantsByReq[viewReq.id] ?? [];
    if (list.some((c) => c.id === cand.id)) {
      message.info(`${cand.name} is already in this pipeline`);
      return;
    }
    persistApplicants(viewReq.id, (l) => [
      ...l,
      { id: cand.id, name: cand.name, email: cand.email, skills: cand.skills, stage: 'ingested' },
    ]);
    message.success(`${cand.name} added to pipeline (Ingested)`);
    setAddPick(null);
  };

  // Add a parsed candidate into the current requirement's Ingested stage.
  const addCandidateToPipeline = (reqId, candidate) => {
    persistApplicants(reqId, (list) =>
      list.some((c) => c.id === candidate.id)
        ? list
        : [
            ...list,
            {
              id: candidate.id,
              name: candidate.name,
              email: candidate.email,
              skills: candidate.skills,
              stage: 'ingested',
            },
          ],
    );
  };

  // Handle a dropped/uploaded resume — parses it on the backend, persists the
  // candidate to lowdb, then drops the parsed candidate into the Ingested stage.
  const handleResumeUpload = async (file) => {
    if (!viewReq) return false;
    const reqId = viewReq.id;
    try {
      const candidate = await uploadResume(file).unwrap();
      addCandidateToPipeline(reqId, candidate);
      message.success(`${candidate.name} parsed and added to Ingested`);
    } catch (err) {
      // 409 = duplicate candidate already in the database; still surface them.
      if (err?.status === 409 && err.data?.candidate) {
        addCandidateToPipeline(reqId, err.data.candidate);
        message.info(`${err.data.candidate.name} already exists — added from database`);
      } else {
        console.error('Resume upload failed:', err);
        message.error(`Failed to parse ${file.name}`);
      }
    }
    return false; // prevent antd from actually uploading
  };

  // AI-generate the job description from the collected form fields (via Claude on the backend).
  const handleAIFill = async () => {
    const values = form.getFieldsValue([
      'title', 'department', 'location', 'workMode', 'jobType',
      'salaryMin', 'salaryMax', 'hourlyRateMin', 'hourlyRateMax', 'mustHaves', 'niceToHaves',
    ]);
    if (!values.title) {
      message.warning('Please enter a Requirement Title first so the AI has context!');
      return;
    }

    setIsGenerating(true);
    try {
      const { summary } = await generateJobSummary(values).unwrap();
      form.setFieldsValue({ description: summary });
      message.success('Job description generated with AI!');
    } catch (err) {
      if (err?.status === 503) {
        message.error('AI is not configured on the server (missing ANTHROPIC_API_KEY).');
      } else {
        console.error('AI job summary failed:', err);
        message.error('Failed to generate job description.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch live Dice market intelligence based on the current form values.
  const handleRefreshMarket = async () => {
    const values = form.getFieldsValue(['title', 'mustHaves', 'location', 'workMode', 'jobType']);
    if (!values.title) {
      message.warning('Enter a Requirement Title to gather market intelligence.');
      return;
    }
    try {
      const data = await fetchMarketIntelligence(values).unwrap();
      setMarketData(data);
      message.success(`Market intelligence updated (${data.sampleSize ?? 0} live postings sampled).`);
    } catch (err) {
      console.error('Market intelligence failed:', err);
      message.error('Could not fetch live Dice market intelligence.');
    }
  };

  const showModal = (req = null) => {
    setEditingReq(req);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    form.resetFields();
    setEditingReq(null);
    setIsModalOpen(false);
  };

  // Form submission logic interacting with backend endpoint
  const onFinish = async (values) => {
    setSubmitting(true);
    const payload = {
      ...values,
      publishDate: values.publishDate ? values.publishDate.format('YYYY-MM-DD') : null,
    };
    try {
      if (editingReq) {
        await updateRequirement({ requirementId: editingReq.id, updatedRequirement: payload }).unwrap();
        message.success('Requirement updated successfully!');
      } else {
        await addRequirement(payload).unwrap();
        message.success('Requirement created successfully!');
      }
      form.resetFields();
      setEditingReq(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save the requirement:', err);
      message.error(`Failed to ${editingReq ? 'update' : 'create'} requirement. Please check backend connection.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Top Search Controls Frame */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <Space size={12}>
          <Input
            placeholder="Search requirements"
            style={{ width: 320, borderRadius: 4 }}
            prefix={<SearchOutlined />}
          />
          <Segmented
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: 'Open', value: 'open' },
              { label: 'Draft', value: 'draft' },
              { label: 'Closed', value: 'closed' },
              { label: 'All', value: 'all' },
            ]}
          />
        </Space>
        <Space size={12}>
          <Segmented
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: 'card', icon: <AppstoreOutlined /> },
              { value: 'table', icon: <TableOutlined /> },
            ]}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ backgroundColor: '#2563eb', height: 40, paddingInline: 24 }}
            onClick={() => showModal()}
          >
            New Requirement
          </Button>
        </Space>
      </div>

      {/* Grid displaying current requirements */}
      {viewMode === 'card' ? (
      <Row gutter={[16, 16]}>
        {visibleRequirements.map((req) => (
          <Col xs={24} sm={12} lg={6} key={req.id}>
            <Card bordered={true} style={{ background: '#fff', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <Title level={4} style={{ margin: 0 }}>{req.title}</Title>
                <Tag color={STATUS_COLOR[getStatus(req)]} style={{ marginLeft: 8, textTransform: 'capitalize' }}>
                  {getStatus(req)}
                </Tag>
              </div>
              <div style={{ fontSize: 12, marginBottom: 12 }}>
                <div><strong>Department:</strong> {req.department}</div>
                <div><strong>Open Date:</strong> {req.openDate}</div>
                {req.publishDate && <div><strong>Publish Date:</strong> {req.publishDate}</div>}
              </div>
              <div style={{ marginBottom: 12, fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                <strong>Description:</strong> {req.description ? `${req.description.slice(0, 100)}…` : 'No description.'}
              </div>
              <div style={{ marginBottom: 12, fontSize: 12 }}>
                <div><strong>Must-haves:</strong> {(req.mustHaves ?? []).join(', ') || '—'}</div>
                <div><strong>Nice-to-haves:</strong> {(req.niceToHaves ?? []).join(', ') || '—'}</div>
              </div>
              <Button
                type="primary"
                block
                icon={<EyeOutlined />}
                onClick={() => handleView(req)}
                style={{ backgroundColor: '#2563eb', marginTop: 12, marginBottom: 8, height: 40 }}
              >
                View Details
              </Button>
              <Row gutter={8}>
                <Col xs={16}>
                  <Button
                    block
                    onClick={() => onViewPipeline?.(req.id)}
                    style={{ borderColor: '#000', color: '#000', border: '1px solid #000', height: 40, background: 'transparent' }}
                  >
                    View Pipeline
                  </Button>
                </Col>
                <Col xs={8}>
                  <Button
                    onClick={() => showModal(req)}
                    style={{ borderColor: '#000', color: '#000', border: '1px solid #000', width: '100%', height: 40, background: 'transparent' }}
                  >
                    ✎
                  </Button>
                </Col>
              </Row>
            </Card>
          </Col>
        ))}
      </Row>
      ) : (
        <Table
          rowKey="id"
          dataSource={visibleRequirements}
          loading={isLoading || isFetching}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          columns={[
            { title: 'Title', dataIndex: 'title', sorter: (a, b) => String(a.title).localeCompare(String(b.title)) },
            { title: 'Department', dataIndex: 'department' },
            { title: 'Open Date', dataIndex: 'openDate' },
            { title: 'Publish Date', dataIndex: 'publishDate', render: (v) => v || '—' },
            {
              title: 'Status',
              key: 'status',
              render: (_, req) => (
                <Tag color={STATUS_COLOR[getStatus(req)]} style={{ textTransform: 'capitalize' }}>
                  {getStatus(req)}
                </Tag>
              ),
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, req) => (
                <Space>
                  <Button size="small" type="primary" icon={<EyeOutlined />} onClick={() => handleView(req)} style={{ backgroundColor: '#2563eb' }}>
                    View Details
                  </Button>
                  <Button size="small" onClick={() => onViewPipeline?.(req.id)}>
                    View Pipeline
                  </Button>
                  <Button size="small" onClick={() => showModal(req)}>
                    Edit
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      )}

      {/* --- View Details Modal: job details + applicants + add to pipeline --- */}
      <Modal
        title={viewReq ? <Title level={4} style={{ margin: 0 }}>{viewReq.title}</Title> : null}
        open={!!viewReq}
        onCancel={() => setViewReq(null)}
        footer={<Button onClick={() => setViewReq(null)}>Close</Button>}
        width={820}
        destroyOnClose
        styles={{ body: { maxHeight: '72vh', overflowY: 'auto' } }}
      >
        {viewReq && (
          <>
            {/* Job requirement details */}
            <Card size="small" style={{ marginBottom: 20, background: '#fafafa' }}>
              <Row gutter={[16, 8]} style={{ fontSize: 13 }}>
                <Col span={12}><Text strong>Department:</Text> {viewReq.department}</Col>
                <Col span={12}><Text strong>Open Date:</Text> {viewReq.openDate}</Col>
                <Col span={12}><Text strong>Publish Date:</Text> {viewReq.publishDate || '—'}</Col>
                <Col span={12}>
                  <Text strong>Status:</Text>{' '}
                  <Tag color={STATUS_COLOR[getStatus(viewReq)]} style={{ textTransform: 'capitalize' }}>
                    {getStatus(viewReq)}
                  </Tag>
                </Col>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <Text strong>Description:</Text> {viewReq.description || '—'}
              </div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                <Text strong>Must-haves:</Text> {(viewReq.mustHaves ?? []).join(', ') || '—'}
              </div>
              <div style={{ fontSize: 13 }}>
                <Text strong>Nice-to-haves:</Text> {(viewReq.niceToHaves ?? []).join(', ') || '—'}
              </div>
            </Card>

            {/* Applicants and their pipeline status */}
            <Title level={5} style={{ marginTop: 0 }}>Applicants & Pipeline Status ({applicants.length})</Title>
            {applicants.length === 0 ? (
              <Empty description="No applicants yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={applicants}
                renderItem={(c) => (
                  <List.Item actions={[<Tag color={STAGE_COLORS[c.stage]} key="stage">{STAGE_LABELS[c.stage]}</Tag>]}>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />}
                      title={c.name}
                      description={<span style={{ fontSize: 12 }}>{c.email}</span>}
                    />
                  </List.Item>
                )}
              />
            )}

            <Divider />

            {/* Add candidate from database */}
            <Title level={5}>Add Candidate to Pipeline</Title>
            <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
              <Select
                showSearch
                placeholder="Select a candidate from the database"
                value={addPick}
                onChange={setAddPick}
                optionFilterProp="label"
                style={{ flex: 1 }}
                options={candidateList.map((c) => {
                  const skills = (c.skills ?? []).join(', ');
                  const skillPreview = skills.length > 30 ? `${skills.slice(0, 30)}…` : skills;
                  return { value: c.id, label: `${c.name} — ${skillPreview}` };
                })}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                disabled={!addPick}
                onClick={() => handleAddFromDb(addPick)}
                style={{ backgroundColor: '#2563eb' }}
              >
                Add
              </Button>
            </Space.Compact>

            {/* Upload / drag-and-drop resume directly into the pipeline */}
            <Upload.Dragger
              multiple
              showUploadList={false}
              accept=".pdf,.doc,.docx"
              beforeUpload={handleResumeUpload}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Click or drag resume(s) here to add directly to the pipeline</p>
              <p className="ant-upload-hint">PDF, DOC, DOCX — each upload creates a candidate in the Ingested stage</p>
            </Upload.Dragger>
          </>
        )}
      </Modal>

      {/* --- New / Edit Requirement Modal Form --- */}
      <Modal
        title={<Title level={3} style={{ margin: 0 }}>{editingReq ? 'Edit Requirement' : 'Create Requirement'}</Title>}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width={600}
        afterOpenChange={(open) => {
          if (open) {
            if (editingReq) {
              form.setFieldsValue({
                ...editingReq,
                publishDate: editingReq.publishDate ? dayjs(editingReq.publishDate) : null,
              });
            } else {
              form.resetFields();
            }
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          style={{ marginTop: 16 }}
          requiredMark="optional"
        >
          {/* Title input field */}
          <Form.Item
            name="title"
            label="Requirement Title"
            rules={[{ required: true, message: 'Please enter job title (e.g., Sr. Java Engineer)' }]}
          >
            <Input placeholder="e.g., Sr. Node.js Developer" size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              {/* Department Dropdown */}
              <Form.Item
                name="department"
                label="Department"
                rules={[{ required: true, message: 'Please choose a department' }]}
              >
                <Select placeholder="Select department" size="large">
                  <Select.Option value="Engineering">Engineering</Select.Option>
                  <Select.Option value="Product">Product Management</Select.Option>
                  <Select.Option value="Data">Data Analytics</Select.Option>
                  <Select.Option value="QA">Quality Assurance</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              {/* Target Stack Tag Fields */}
              <Form.Item
                name="mustHaves"
                label="Must-Haves Core Stack"
                rules={[{ required: true, message: 'Provide at least one core skill' }]}
              >
                <Select mode="tags" placeholder="Press enter to add skills" size="large" />
              </Form.Item>
            </Col>
          </Row>

          {/* Optional Infrastructure requirements */}
          <Form.Item name="niceToHaves" label="Nice-to-Haves / Infrastructure Stack">
            <Select mode="tags" placeholder="e.g., Docker, AWS, Bedrock" size="large" />
          </Form.Item>

          {/* Location & work mode */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="location"
                label="Location"
                rules={[{ required: true, message: 'Enter a location (e.g., Reston, VA)' }]}
              >
                <Input placeholder="e.g., Reston, VA" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="workMode"
                label="Work Mode"
                rules={[{ required: true, message: 'Select a work mode' }]}
              >
                <Select placeholder="Select work mode" size="large">
                  <Select.Option value="Onsite">Onsite</Select.Option>
                  <Select.Option value="Hybrid">Hybrid</Select.Option>
                  <Select.Option value="Remote">Remote</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Publish Date & Status */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="publishDate" label="Publish Date">
                <DatePicker style={{ width: '100%' }} size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Status"
                initialValue="draft"
                rules={[{ required: true, message: 'Select a status' }]}
              >
                <Select size="large">
                  <Select.Option value="draft">Draft</Select.Option>
                  <Select.Option value="open">Open</Select.Option>
                  <Select.Option value="closed">Closed</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Job type & salary range */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="jobType"
                label="Job Type"
                rules={[{ required: true, message: 'Select an employment type' }]}
              >
                <Select placeholder="Select job type" size="large">
                  <Select.Option value="Full-time">Full-time</Select.Option>
                  <Select.Option value="W2">W2 (Contract)</Select.Option>
                  <Select.Option value="C2C">C2C (Corp-to-Corp)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Annual Salary Range ($)">
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item name="salaryMin" noStyle>
                    <InputNumber
                      size="large"
                      placeholder="Min"
                      min={0}
                      step={5000}
                      style={{ width: '50%' }}
                      formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                      parser={(v) => (v ? v.replace(/[^\d]/g, '') : '')}
                    />
                  </Form.Item>
                  <Form.Item name="salaryMax" noStyle>
                    <InputNumber
                      size="large"
                      placeholder="Max"
                      min={0}
                      step={5000}
                      style={{ width: '50%' }}
                      formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                      parser={(v) => (v ? v.replace(/[^\d]/g, '') : '')}
                    />
                  </Form.Item>
                </Space.Compact>
              </Form.Item>
            </Col>
          </Row>

          {/* Hourly rate — only relevant for W2 / C2C contract roles */}
          {(jobType === 'W2' || jobType === 'C2C') && (
            <Form.Item label={`Hourly Rate Range — ${jobType} ($/hr)`}>
              <Space.Compact style={{ width: '100%' }}>
                <Form.Item
                  name="hourlyRateMin"
                  noStyle
                  rules={[{ required: true, message: 'Enter a minimum hourly rate' }]}
                >
                  <InputNumber size="large" placeholder="Min $/hr" min={0} step={5} style={{ width: '50%' }} />
                </Form.Item>
                <Form.Item
                  name="hourlyRateMax"
                  noStyle
                  rules={[{ required: true, message: 'Enter a maximum hourly rate' }]}
                >
                  <InputNumber size="large" placeholder="Max $/hr" min={0} step={5} style={{ width: '50%' }} />
                </Form.Item>
              </Space.Compact>
            </Form.Item>
          )}

          {/* Core Job Context description block */}
          {/* <Form.Item
            name="description"
            label="Job Description Summary"
            rules={[{ required: true, message: 'Please add brief description metrics' }]}
          > */}
          <Form.Item
            name="description"
            required
            label={
              <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                <span>Job Description Summary</span>
                <Tooltip title="Auto-fill optimized description using AI">
                  <Button
                    type="text"
                    size="small"
                    icon={<ThunderboltOutlined style={{ color: '#722ed1' }} />} // Native Antd Icon
                    loading={isGenerating}
                    onClick={handleAIFill}
                    style={{
                      color: '#722ed1',
                      backgroundColor: '#f9f0ff',
                      borderRadius: '4px',
                      padding: '0 8px',
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                  >
                    Auto-Fill with AI
                  </Button>
                </Tooltip>
              </Flex>
            }
          >
            <TextArea rows={4} placeholder="Enter job role baseline description..." />
          </Form.Item>

        {/* Live Market Intelligence Section */}
        <Card 
          style={{ marginTop: 24, backgroundColor: '#fafafa', border: '1px solid #f0f0f0' }}
          bodyStyle={{ padding: 16 }}
        >
          <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
            <Space>
              <span role="img" aria-label="chart">📊</span>
              <Text strong style={{ fontSize: 15 }}>Live Dice Market Intelligence</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ({isMarketLoading ? <SyncOutlined spin style={{ marginRight: 4 }} /> : null}
                {isMarketLoading ? 'Querying Dice MCP…' : 'via Dice MCP'})
              </Text>
            </Space>
            <Button
              size="small"
              icon={<SyncOutlined spin={isMarketLoading} />}
              loading={isMarketLoading}
              onClick={handleRefreshMarket}
            >
              Refresh
            </Button>
          </Flex>

          {/* Grid Layout for the 4 Intel Widgets */}
          <Flex gap="middle" wrap="wrap" justify="space-between">
            
            {/* 1. Supply Index */}
            <Card size="small" style={{ flex: '1 1 80px', textAlign: 'center' }}>
              <Text type="secondary" strong style={{ display: 'block', marginBottom: 8 }}>Supply Index</Text>
              <FireOutlined style={{ fontSize: 28, color: '#ff4d4f', marginBottom: 8 }} />
              <Progress percent={Math.min(100, Math.round((marketData.supply.count / 2000) * 100))} showInfo={false} strokeColor="#ff4d4f" size={['100%', 6]} />
              <div style={{ marginTop: 8, fontSize: 12, lineHeight: '1.4' }}>
                <Badge status={marketData.supply.status} text={<strong>{marketData.supply.level}</strong>} /><br />
                <Text type="secondary">(marketData{marketData.supply.count} Active Roles)</Text><br />
                <Text type="secondary" style={{ fontSize: 11 }}>Live count of competing postings for this stack.</Text>
              </div>
            </Card>

            {/* 2. Velocity Index */}
            <Card size="small" style={{ flex: '1 1 80px', textAlign: 'center' }}>
              <Text type="secondary" strong style={{ display: 'block', marginBottom: 8 }}>Velocity Index</Text>
              <DashboardOutlined style={{ fontSize: 28, color: '#faad14', marginBottom: 8 }} />
              <Progress percent={marketData.velocity.remotePct} type="dashboard" size={40} strokeColor="#faad14" gapDegree={120} />
              <div style={{ marginTop: 8, fontSize: 12, lineHeight: '1.4' }}>
                <Text type="warning" strong><WarningOutlined /> Remote / Hybrid Demand</Text><br />
                <Text type="secondary">({marketData.velocity.remotePct}% Remote/Hybrid)</Text><br />
                <Text type="secondary" style={{ fontSize: 11 }}>An onsite-only requirement restricts the pool by ~{marketData.velocity.impact}%.</Text>
              </div>
            </Card>

            {/* 3. Salary Benchmark */}
            <Card size="small" style={{ flex: '1 1 85px' }}>
              <Text type="secondary" strong style={{ display: 'block', textAlign: 'center', marginBottom: 8 }}>Salary Benchmark</Text>
              <div style={{ padding: '0 10px' }}>
                <Text type="secondary" style={{ fontSize: 11, textAlign: 'center', display: 'block' }}>Median</Text>
                <Slider defaultValue={45} disabled tooltip={{ open: false }} style={{ margin: '8px 0' }} />
                <Text strong style={{ display: 'block', textAlign: 'center', fontSize: 12 }}>${(marketData.salary.marketMedian || 0).toLocaleString()}</Text>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, lineHeight: '1.4', textAlign: 'center' }}>
                <Badge status="processing" text={<strong>Market Median</strong>} /><br />
                <Text type="secondary">({marketData.salary.targetPercentile}th Percentile)</Text><br />
                <Text type="secondary" style={{ fontSize: 11 }}>Median annual salary parsed from live Dice postings.</Text>
              </div>
            </Card>

            {/* 4. Gaps Index */}
            <Card size="small" style={{ flex: '1 1 80px', textAlign: 'center' }}>
              <Text type="secondary" strong style={{ display: 'block', marginBottom: 4 }}>Gaps Index</Text>
              <Progress type="circle" percent={marketData.gaps.matchPct} size={45} strokeColor="#52c41a" />
              <div style={{ marginTop: 8, fontSize: 12, lineHeight: '1.4', textAlign: 'left' }}>
                <Text strong style={{ display: 'block', textAlign: 'center' }}>
                  <Badge status="warning" /> {marketData.gaps.matchPct}% Market Stack Match
                </Text>
                <div style={{ marginTop: 4, background: '#fff', padding: '6px', borderRadius: 4, border: '1px solid #e8e8e8' }}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}><BulbOutlined style={{ color: '#faad14' }} /> Missing Skills:</Text>
                  <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
                    {marketData.gaps.trending.map(([skill, gain]) => (
                      <li key={skill}>
                        {skill} <Text type="success" style={{ fontSize: 10 }}>({gain >= 0 ? `+${gain}%` : `${gain}%`})</Text>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

          </Flex>
        </Card>

          {/* Form Action Controls */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button onClick={handleCancel} size="large">
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              size="large"
              style={{ backgroundColor: '#2563eb' }}
            >
              {editingReq ? 'Update Requirement' : 'Submit Requirement'}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default Requirements;