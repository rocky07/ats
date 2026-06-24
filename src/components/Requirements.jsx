import React, { useState } from 'react';
import { useGetRequirementsQuery,useAddRequirementMutation} from '../redux/requirementsApi';
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
  Divider,
  Empty,
  Avatar,
  Segmented,
  Table
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

// Mock candidate database (would come from an API in production)
const CANDIDATE_DB = [
  { id: 101, name: 'Maria Lopez', email: 'maria.lopez@example.com', skills: ['Node.js', 'AWS'] },
  { id: 102, name: 'Aiden Clark', email: 'aiden.clark@example.com', skills: ['React', 'TypeScript'] },
  { id: 103, name: 'Priya Nair', email: 'priya.nair@example.com', skills: ['Node.js', 'Kafka'] },
  { id: 104, name: 'Lucas Meyer', email: 'lucas.meyer@example.com', skills: ['Vue', 'Docker'] },
  { id: 105, name: 'Sara Khan', email: 'sara.khan@example.com', skills: ['Python', 'AWS'] },
  { id: 106, name: 'David Okoro', email: 'david.okoro@example.com', skills: ['Go', 'Kubernetes'] },
];

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
  
  // Ant Design form hook instance
  const [form] = Form.useForm();
  // Mock live market state (This would ideally update via your Dice MCP backend debounce)
  const [marketData, setMarketData] = useState({
    supply: { count: 1420, level: 'High Competition', status: 'error' },
    velocity: { remotePct: 78, impact: 60 },
    salary: { marketMedian: 158000, targetPercentile: 55 },
    gaps: { matchPct: 55, trending: [['AWS Bedrock', 24], ['Kafka', 18]] }
  });

  const [isGenerating, setIsGenerating] = useState(false);

  // --- Layout & filtering ---
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'table'
  const [showAllReqs, setShowAllReqs] = useState(false); // default: open requirements only

  // A requirement is open unless its isClosed flag is true
  const isOpenRequirement = (req) => !req.isClosed;
  const visibleRequirements = (requirements ?? []).filter(
    (req) => showAllReqs || isOpenRequirement(req)
  );

  // --- View Details modal: applicants & pipeline state ---
  const [viewReq, setViewReq] = useState(null);
  const [applicantsByReq, setApplicantsByReq] = useState({});
  const [addPick, setAddPick] = useState(null);

  const applicants = viewReq ? (applicantsByReq[viewReq.id] ?? []) : [];

  const handleView = (req) => {
    // Seed mock applicants the first time a requirement is opened
    setApplicantsByReq((prev) =>
      prev[req.id]
        ? prev
        : {
            ...prev,
            [req.id]: [
              { id: 1, name: 'Janon Belha', email: 'janon.belha@example.com', stage: 'l1' },
              { id: 2, name: 'Maria Lopez', email: 'maria.lopez@example.com', stage: 'ranked' },
              { id: 3, name: 'Aiden Clark', email: 'aiden.clark@example.com', stage: 'ingested' },
            ],
          }
    );
    setViewReq(req);
  };

  // Add a candidate from the database into the Ingested stage
  const handleAddFromDb = (candidateId) => {
    const cand = CANDIDATE_DB.find((c) => c.id === candidateId);
    if (!cand || !viewReq) return;
    setApplicantsByReq((prev) => {
      const list = prev[viewReq.id] ?? [];
      if (list.some((c) => c.id === cand.id)) {
        message.info(`${cand.name} is already in this pipeline`);
        return prev;
      }
      message.success(`${cand.name} added to pipeline (Ingested)`);
      return { ...prev, [viewReq.id]: [...list, { id: cand.id, name: cand.name, email: cand.email, stage: 'ingested' }] };
    });
    setAddPick(null);
  };

  // Handle a dropped/uploaded resume — creates a candidate in the Ingested stage
  const handleResumeUpload = (file) => {
    if (!viewReq) return false;
    const derivedName = file.name.replace(/\.(pdf|docx?|txt)$/i, '').replace(/[_-]+/g, ' ').trim();
    const newCand = {
      id: `r-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      name: derivedName || 'New Candidate',
      email: 'pending — parsing resume',
      stage: 'ingested',
    };
    setApplicantsByReq((prev) => ({
      ...prev,
      [viewReq.id]: [...(prev[viewReq.id] ?? []), newCand],
    }));
    message.success(`${file.name} uploaded — candidate added to Ingested`);
    return false; // prevent antd from actually uploading
  };

  // Simulated AI Generation Function
  const handleAIFill = async () => {
    const values = form.getFieldsValue(['title', 'mustHaves']);
    if (!values.title) {
      message.warning('Please enter a Requirement Title first so the AI has context!');
      return;
    }

    setIsGenerating(true);
    
    // Simulate API delay from your LLM/MCP backend
    setTimeout(() => {
      const coreSkills = values.mustHaves ? values.mustHaves.join(', ') : 'core technologies';
      const generatedText = `We are seeking a talented ${values.title} to join our team. In this role, you will be responsible for designing, developing, and maintaining high-performance systems. The ideal candidate has deep expertise across our primary stack, including ${coreSkills}, and thrives in an agile engineering environment.`;
      
      form.setFieldsValue({ description: generatedText });
      setIsGenerating(false);
      message.success('Job description optimized with AI insights!');
    }, 1200);
  };

  // Handle opening and resetting form
  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    form.resetFields();
    setIsModalOpen(false);
  };

  // Form submission logic interacting with backend endpoint
  const onFinish = async (values) => {
    setSubmitting(true);
   try {
      // Execute the Redux action hook and unwrap the promise response
      await addRequirement(values).unwrap();
      
      message.success('Requirement created successfully!');
      form.resetFields();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save the requirement:', err);
      message.error('Failed to create requirement. Please check backend connection.');
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
          <Tooltip title="Show open requirements only, or all (including closed)">
            <Segmented
              value={showAllReqs ? 'all' : 'open'}
              onChange={(val) => setShowAllReqs(val === 'all')}
              options={[
                { label: 'Open', value: 'open' },
                { label: 'All', value: 'all' },
              ]}
            />
          </Tooltip>
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
            onClick={showModal}
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
              <Title level={4} style={{ margin: '0 0 12px 0' }}>{req.title}</Title>
              <div style={{ fontSize: 12, marginBottom: 12 }}>
                <div><strong>Department:</strong>{req.department}</div>
                <div><strong>Open Date:</strong> {req.openDate}</div>
              </div>
              <div style={{ marginBottom: 12, fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                <strong>Description:</strong> Lorem ipsum dolor sit amet, consectetuer donec commos sec. alicd oulsmef, simuntatus...
              </div>
              <div style={{ marginBottom: 12, fontSize: 12 }}>
                <div><strong>Must-haves:</strong> [Node.js, React, ...]</div>
                <div><strong>Nice-to-haves:</strong> [AWS, Docker, ...]</div>
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
            {
              title: 'Status',
              key: 'status',
              render: (_, req) =>
                isOpenRequirement(req)
                  ? <Tag color="green">Open</Tag>
                  : <Tag color="red">Closed</Tag>,
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
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <Text strong>Description:</Text> Lorem ipsum dolor sit amet, consectetuer donec commos sec. alicd oulsmef, simuntatus...
              </div>
              <div style={{ fontSize: 13 }}><Text strong>Must-haves:</Text> [Node.js, React, ...]</div>
              <div style={{ fontSize: 13 }}><Text strong>Nice-to-haves:</Text> [AWS, Docker, ...]</div>
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
                options={CANDIDATE_DB.map((c) => ({ value: c.id, label: `${c.name} — ${c.skills.join(', ')}` }))}
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

      {/* --- New Requirement Data Intake Modal Form --- */}
      <Modal
        title={<Title level={3} style={{ margin: 0 }}>Create Requirement</Title>}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null} // Using Form buttons inside instead of default Modal footer buttons
        width={600}
        destroyOnClose
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
                (<SyncOutlined spin style={{ marginRight: 4 }} />Just Now via MCP)
              </Text>
            </Space>
          </Flex>

          {/* Grid Layout for the 4 Intel Widgets */}
          <Flex gap="middle" wrap="wrap" justify="space-between">
            
            {/* 1. Supply Index */}
            <Card size="small" style={{ flex: '1 1 80px', textAlign: 'center' }}>
              <Text type="secondary" strong style={{ display: 'block', marginBottom: 8 }}>Supply Index</Text>
              <FireOutlined style={{ fontSize: 28, color: '#ff4d4f', marginBottom: 8 }} />
              <Progress percent={85} showInfo={false} strokeColor="#ff4d4f" size={['100%', 6]} />
              <div style={{ marginTop: 8, fontSize: 12, lineHeight: '1.4' }}>
                <Badge status="error" text={<strong>High Competition</strong>} /><br />
                <Text type="secondary">({marketData.supply.count} Active Roles)</Text><br />
                <Text type="secondary" style={{ fontSize: 11 }}>Reston/DC area listings; expect longer time-to-hire.</Text>
              </div>
            </Card>

            {/* 2. Velocity Index */}
            <Card size="small" style={{ flex: '1 1 80px', textAlign: 'center' }}>
              <Text type="secondary" strong style={{ display: 'block', marginBottom: 8 }}>Velocity Index</Text>
              <DashboardOutlined style={{ fontSize: 28, color: '#faad14', marginBottom: 8 }} />
              <Progress percent={marketData.velocity.remotePct} type="dashboard" size={40} strokeColor="#faad14" gapDegree={120} />
              <div style={{ marginTop: 8, fontSize: 12, lineHeight: '1.4' }}>
                <Text type="warning" strong><WarningOutlined /> Market Mismatch</Text><br />
                <Text type="secondary">({marketData.velocity.remotePct}% Remote)</Text><br />
                <Text type="secondary" style={{ fontSize: 11 }}>Your 3-day on-site requirement restricts pool by ~{marketData.velocity.impact}%.</Text>
              </div>
            </Card>

            {/* 3. Salary Benchmark */}
            <Card size="small" style={{ flex: '1 1 85px' }}>
              <Text type="secondary" strong style={{ display: 'block', textAlign: 'center', marginBottom: 8 }}>Salary Benchmark</Text>
              <div style={{ padding: '0 10px' }}>
                <Text type="secondary" style={{ fontSize: 11, textAlign: 'center', display: 'block' }}>Median</Text>
                <Slider defaultValue={45} disabled tooltip={{ open: false }} style={{ margin: '8px 0' }} />
                <Text strong style={{ display: 'block', textAlign: 'center', fontSize: 12 }}>${marketData.salary.marketMedian.toLocaleString()}</Text>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, lineHeight: '1.4', textAlign: 'center' }}>
                <Badge status="warning" text={<strong>Below Median</strong>} /><br />
                <Text type="secondary">({marketData.salary.targetPercentile}th Percentile)</Text><br />
                <Text type="secondary" style={{ fontSize: 11 }}>Dice localized stack rate is $158k. Target $145k may cause candidate drop-off.</Text>
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
              Submit Requirement
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default Requirements;