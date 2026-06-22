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
  Tooltip
} from 'antd';
import { 
  FireOutlined, 
  WarningOutlined, 
  DashboardOutlined, 
  InfoCircleOutlined, 
  BulbOutlined,
  SyncOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Requirements = () => {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Input 
          placeholder="Search requirements" 
          style={{ width: 400, borderRadius: 4 }} 
          prefix={<SearchOutlined />}
        />
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          style={{ backgroundColor: '#2563eb', height: 40, paddingInline: 24 }}
          onClick={showModal}
        >
          New Requirement
        </Button>
      </div>

      {/* Grid displaying current requirements */}
      <Row gutter={[16, 16]}>
        {requirements?.map((req) => (
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
                style={{ backgroundColor: '#2563eb', marginTop: 12, marginBottom: 8, height: 40 }}
              >
                Rank Ingested Candidates
              </Button>
              <Row gutter={8}>
                <Col xs={16}>
                  <Button 
                    block 
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