import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Card,
  Switch,
  Input,
  InputNumber,
  Select,
  Button,
  Form,
  Divider,
  Typography,
  Tag,
  Space,
  Spin,
  Alert,
  Badge,
  Tooltip,
  message,
} from 'antd';
import {
  GlobalOutlined,
  RobotOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LinkOutlined,
  SaveOutlined,
  LockOutlined,
  UserOutlined,
  BellOutlined,
  LinkedinOutlined,
  FileTextOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { useAuth, getStoredToken } from '../auth/AuthContext';
import { REGION_OPTIONS } from '../constants/regions';
import {
  useGetSystemSettingsQuery,
  useUpdateSystemSettingsMutation,
  useGetUserSettingsQuery,
  useUpdateUserSettingsMutation,
  useGetExamSettingsQuery,
  useUpdateExamSettingsMutation,
} from '../redux/settingsApi';

const { Title, Text, Paragraph } = Typography;


// ─── Locked section placeholder shown to non-admins ──────────────────────────
const AdminLockedCard = ({ title }) => (
  <Card
    style={{ borderRadius: 10, marginBottom: 16, borderColor: '#f0f0f0', background: '#fafafa' }}
    bodyStyle={{ padding: '16px 20px' }}
  >
    <Space>
      <LockOutlined style={{ color: '#bbb', fontSize: 16 }} />
      <div>
        <Text strong style={{ color: '#999' }}>{title}</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12 }}>
          This section is managed by an administrator
        </Text>
      </div>
      <Tag color="red" style={{ marginLeft: 8 }}>Admin Only</Tag>
    </Space>
  </Card>
);



// ─── Personal LinkedIn card (all users) ──────────────────────────────────────
const PersonalLinkedInCard = () => {
  const { data: userData, refetch } = useGetUserSettingsQuery();
  const [updateUser, { isLoading: disconnecting }] = useUpdateUserSettingsMutation();
  const li = userData?.personalLinkedin ?? {};
  const isConnected = !!(li.enabled && li.accessToken && li.linkedinUrn);
  const tokenExpired = li.tokenExpiry && Date.now() > li.tokenExpiry;
  const autoPostOnCreate = li.autoPostOnCreate ?? true;

  const handleAutoPostToggle = async (checked) => {
    try {
      await updateUser({ personalLinkedin: { ...li, autoPostOnCreate: checked } }).unwrap();
      message.success(checked ? 'New requirements will auto-post to LinkedIn' : 'Auto-posting to LinkedIn disabled');
    } catch {
      message.error('Failed to update preference');
    }
  };

  // Check for ?linkedin= query param on mount (redirect back from OAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('linkedin');
    if (status === 'connected') {
      message.success('LinkedIn account connected successfully!');
      refetch();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (status === 'denied') {
      message.warning('LinkedIn authorization was cancelled.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (status === 'error') {
      message.error('LinkedIn connection failed. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = () => {
    // Pass token as query param since browser navigation can't set headers
    const token = getStoredToken() ?? '';
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/auth/linkedin?token=${encodeURIComponent(token)}`;
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/auth/linkedin`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getStoredToken() ?? ''}` },
      });
      await refetch();
      message.success('LinkedIn account disconnected');
    } catch {
      message.error('Failed to disconnect');
    }
  };

  return (
    <Card
      title={<Space><LinkedinOutlined style={{ color: '#0A66C2' }} /><Text strong style={{ color: '#0A66C2' }}>Personal LinkedIn</Text><Tag color="blue" style={{ fontSize: 10 }}>Your Account</Tag></Space>}
      style={{ borderRadius: 10, marginBottom: 20, borderColor: '#0A66C244' }}
    >
      <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
        Connect your personal LinkedIn account to auto-post new job openings to your LinkedIn feed with a public apply link.
        Candidates who apply will land directly in the ingested pipeline stage.
      </Paragraph>

      {isConnected && !tokenExpired ? (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            type="success"
            icon={<CheckCircleOutlined />}
            showIcon
            message={
              <Space>
                <Text strong>Connected as {li.linkedinName || li.linkedinEmail}</Text>
                {li.connectedAt && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    since {new Date(li.connectedAt).toLocaleDateString()}
                  </Text>
                )}
              </Space>
            }
          />
          <Space>
            <Button danger onClick={handleDisconnect} loading={disconnecting} size="small">
              Disconnect LinkedIn
            </Button>
            <Button onClick={handleConnect} size="small">
              Re-authenticate
            </Button>
          </Space>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', borderRadius: 8, border: '1px solid #f0f0f0', width: '100%',
          }}>
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: 13 }}>Auto-post new requirements</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Automatically post to your LinkedIn feed whenever a new job requirement is created
              </Text>
            </Space>
            <Switch checked={autoPostOnCreate} onChange={handleAutoPostToggle} checkedChildren="ON" unCheckedChildren="OFF" />
          </div>
        </Space>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {tokenExpired && (
            <Alert type="warning" showIcon message="Your LinkedIn token has expired. Please reconnect." style={{ marginBottom: 8 }} />
          )}
          <Button
            type="primary"
            icon={<LinkedinOutlined />}
            onClick={handleConnect}
            style={{ backgroundColor: '#0A66C2', borderColor: '#0A66C2' }}
          >
            Connect with LinkedIn
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            You'll be redirected to LinkedIn to authorize this app. Make sure your LinkedIn app has the{' '}
            <Text code style={{ fontSize: 12 }}>w_member_social</Text> scope enabled.
          </Text>
        </Space>
      )}
    </Card>
  );
};

// Board metadata
const BOARD_META = {
  linkedinCompany: { label: 'LinkedIn (Company Posts)', color: '#0A66C2', icon: '🔵', desc: 'Post company updates and articles to your LinkedIn company page' },
  linkedinJobs: { label: 'LinkedIn (Job Postings)', color: '#0A66C2', icon: '💼', desc: 'Publish job openings directly to LinkedIn Jobs' },
  monster: { label: 'Monster', color: '#6E34D5', icon: '🟣', desc: 'Post job listings to Monster.com' },
  naukri: { label: 'Naukri', color: '#FF7555', icon: '🟠', desc: 'Post job listings to Naukri.com' },
  indeed: { label: 'Indeed', color: '#003A9B', icon: '🔷', desc: 'Sponsor and post jobs on Indeed' },
};

const BOARD_KEYS = ['linkedinCompany', 'linkedinJobs', 'monster', 'naukri', 'indeed'];

// Admin view: full credentials + enable toggle
const AdminBoardCard = ({ boardKey, config = {}, onSave }) => {
  const meta = BOARD_META[boardKey];
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) form.setFieldsValue(config);
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(boardKey, form.getFieldsValue());
      message.success(`${meta.label} settings saved`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      style={{
        borderRadius: 10,
        border: `1.5px solid ${config.enabled ? meta.color + '55' : '#e8e8e8'}`,
        marginBottom: 16,
        transition: 'border 0.2s',
      }}
      bodyStyle={{ padding: '16px 20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <Space align="start">
          <span style={{ fontSize: 20 }}>{meta.icon}</span>
          <div>
            <Text strong style={{ fontSize: 15, color: meta.color }}>{meta.label}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{meta.desc}</Text>
          </div>
        </Space>
        <Space>
          <Badge status={config.enabled ? 'success' : 'default'} text={<Text type={config.enabled ? 'success' : 'secondary'} style={{ fontSize: 12 }}>{config.enabled ? 'Active' : 'Disabled'}</Text>} />
          <Form form={form}>
            <Form.Item name="enabled" valuePropName="checked" noStyle>
              <Switch
                checkedChildren="ON"
                unCheckedChildren="OFF"
                style={{ backgroundColor: config.enabled ? meta.color : undefined }}
              />
            </Form.Item>
          </Form>
        </Space>
      </div>

      <Form form={form} layout="vertical">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {(boardKey === 'linkedinCompany') && (
            <>
              <Form.Item name="accessToken" label="Access Token" style={{ marginBottom: 0 }}><Input.Password placeholder="OAuth access token" /></Form.Item>
              <Form.Item name="organizationId" label="Organization ID" style={{ marginBottom: 0 }}><Input placeholder="LinkedIn Org ID" /></Form.Item>
            </>
          )}
          {(boardKey === 'linkedinJobs') && (
            <>
              <Form.Item name="clientId" label="Client ID" style={{ marginBottom: 0 }}><Input placeholder="LinkedIn App Client ID" /></Form.Item>
              <Form.Item name="clientSecret" label="Client Secret" style={{ marginBottom: 0 }}><Input.Password /></Form.Item>
              <Form.Item name="organizationId" label="Organization ID" style={{ marginBottom: 0 }}><Input placeholder="LinkedIn Org ID" /></Form.Item>
            </>
          )}
          {(boardKey === 'monster' || boardKey === 'indeed') && (
            <Form.Item name="apiToken" label="API Token / Key" style={{ marginBottom: 0, gridColumn: '1 / -1' }}><Input.Password placeholder="API key" /></Form.Item>
          )}
          {boardKey === 'naukri' && (
            <>
              <Form.Item name="username" label="Username" style={{ marginBottom: 0 }}><Input /></Form.Item>
              <Form.Item name="password" label="Password" style={{ marginBottom: 0 }}><Input.Password /></Form.Item>
              <Form.Item name="apiToken" label="API Token" style={{ marginBottom: 0, gridColumn: '1 / -1' }}><Input.Password /></Form.Item>
            </>
          )}
          {boardKey === 'indeed' && (
            <Form.Item name="publisherId" label="Publisher ID" style={{ marginBottom: 0 }}><Input /></Form.Item>
          )}
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Text type="secondary" style={{ fontSize: 13 }}>Auto-post new openings:</Text>
            <Form.Item name="autoPost" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>
          </Space>
          <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave} style={{ backgroundColor: meta.color, borderColor: meta.color }}>
            Save
          </Button>
        </div>
      </Form>
    </Card>
  );
};

// Google Search (Indexing API) — org-wide only, no per-recruiter opt-in: every
// open job either gets indexed/removed automatically, or it doesn't. Admin-only.
const GoogleJobsCard = ({ config = {}, onSave }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      enabled: config.enabled ?? false,
      autoPost: config.autoPost ?? false,
      serviceAccountKeyJson: config.serviceAccountKeyJson ?? '',
    });
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave('google', form.getFieldsValue());
      message.success('Google job indexing settings saved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      style={{ borderRadius: 10, border: `1.5px solid ${config.enabled ? '#4285F455' : '#e8e8e8'}`, marginBottom: 16 }}
      bodyStyle={{ padding: '16px 20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <Space align="start">
          <span style={{ fontSize: 20 }}>🔍</span>
          <div>
            <Text strong style={{ fontSize: 15, color: '#4285F4' }}>Google Search (Indexing API)</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Notifies Google to index open jobs (Google for Jobs) and to remove them once closed
            </Text>
          </div>
        </Space>
        <Space>
          <Badge status={config.enabled ? 'success' : 'default'} text={<Text type={config.enabled ? 'success' : 'secondary'} style={{ fontSize: 12 }}>{config.enabled ? 'Active' : 'Disabled'}</Text>} />
          <Form form={form}>
            <Form.Item name="enabled" valuePropName="checked" noStyle><Switch checkedChildren="ON" unCheckedChildren="OFF" /></Form.Item>
          </Form>
        </Space>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="serviceAccountKeyJson"
          label="Service Account Key (JSON)"
          style={{ marginBottom: 12 }}
          extra="Paste the full JSON key for a Google Cloud service account with the Indexing API enabled, added as an Owner in Search Console for this domain."
        >
          <Input.TextArea rows={4} placeholder='{ "type": "service_account", "client_email": "...", "private_key": "..." }' />
        </Form.Item>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Text type="secondary" style={{ fontSize: 13 }}>Auto-index on create / remove on close:</Text>
            <Form.Item name="autoPost" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>
          </Space>
          <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave} style={{ backgroundColor: '#4285F4', borderColor: '#4285F4' }}>
            Save
          </Button>
        </div>
      </Form>
    </Card>
  );
};

// Recruiter view: enable/disable only, credentials locked
const RecruiterBoardToggle = ({ boardKey, sysConfig = {}, userEnabled, onChange }) => {
  const meta = BOARD_META[boardKey];
  const systemEnabled = sysConfig.enabled ?? false;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      borderRadius: 10,
      border: '1px solid #f0f0f0',
      marginBottom: 10,
      background: systemEnabled ? '#fafafa' : '#f5f5f5',
      opacity: systemEnabled ? 1 : 0.6,
    }}>
      <Space>
        <span style={{ fontSize: 18 }}>{meta.icon}</span>
        <div>
          <Text strong style={{ color: systemEnabled ? meta.color : '#999' }}>{meta.label}</Text>
          {!systemEnabled && (
            <><br /><Text type="secondary" style={{ fontSize: 11 }}>Not enabled by admin</Text></>
          )}
        </div>
      </Space>
      <Space>
        {systemEnabled && (
          <Tooltip title="Toggle whether your job postings are sent to this platform">
            <Switch
              size="small"
              checked={userEnabled}
              onChange={onChange}
              checkedChildren="Post"
              unCheckedChildren="Skip"
            />
          </Tooltip>
        )}
        <Tooltip title="Credentials are configured by the administrator">
          <LockOutlined style={{ color: '#ccc', fontSize: 13 }} />
        </Tooltip>
      </Space>
    </div>
  );
};

// ─── Job Boards Tab ───────────────────────────────────────────────────────────
const JobBoardsTab = ({ isAdmin }) => {
  const { data: sysData, isLoading: sysLoading } = useGetSystemSettingsQuery();
  const [updateSystem] = useUpdateSystemSettingsMutation();
  const { data: userData, isLoading: userLoading } = useGetUserSettingsQuery();
  const [updateUser, { isLoading: savingUser }] = useUpdateUserSettingsMutation();

  const jobBoards = sysData?.jobBoards ?? {};
  const toggles = userData?.jobBoardToggles ?? {};

  const handleAdminSaveBoard = async (boardKey, values) => {
    await updateSystem({ jobBoards: { ...jobBoards, [boardKey]: { ...jobBoards[boardKey], ...values } } }).unwrap();
  };

  const handleToggle = async (boardKey, val) => {
    await updateUser({ jobBoardToggles: { ...toggles, [boardKey]: val } }).unwrap();
  };

  if (sysLoading || userLoading) return <Spin tip="Loading…" />;

  return (
    <div style={{ maxWidth: 700 }}>
      <Title level={5} style={{ marginBottom: 4 }}>Job Board Integrations</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Connect job portals to automatically distribute open positions
      </Text>

      {/* Personal LinkedIn — available to all users */}
      <PersonalLinkedInCard />

      <Divider orientation="left" style={{ marginBottom: 16 }}>
        <Space>
          <GlobalOutlined />
          <Text strong>Company Platforms</Text>
          {!isAdmin && <Tag color="orange" style={{ fontSize: 10 }}>Configured by Admin</Tag>}
        </Space>
      </Divider>

      {isAdmin ? (
        <>
          <Alert
            type="warning"
            showIcon
            message="Admin credentials — these are company-wide settings visible only to admins"
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
          {BOARD_KEYS.map((key) => (
            <AdminBoardCard
              key={key}
              boardKey={key}
              config={jobBoards[key]}
              onSave={handleAdminSaveBoard}
            />
          ))}

          <Divider orientation="left" style={{ marginBottom: 16 }}>
            <Space><GlobalOutlined /><Text strong>Search Engines</Text></Space>
          </Divider>
          <GoogleJobsCard config={jobBoards.google} onSave={handleAdminSaveBoard} />
        </>
      ) : (
        <>
          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
            Choose which platforms your job postings are sent to. Platforms must be enabled by an admin before they can be used.
          </Text>
          {BOARD_KEYS.map((key) => (
            <RecruiterBoardToggle
              key={key}
              boardKey={key}
              sysConfig={jobBoards[key]}
              userEnabled={toggles[key] ?? false}
              onChange={(val) => handleToggle(key, val)}
            />
          ))}
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={savingUser}
            onClick={async () => { await updateUser({ jobBoardToggles: toggles }).unwrap(); message.success('Preferences saved'); }}
            style={{ backgroundColor: '#2563eb', marginTop: 8 }}
          >
            Save Preferences
          </Button>

          {jobBoards.google?.enabled && (
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 16 }}
              message="Google Search indexing is active"
              description="Open jobs are automatically submitted to Google for Jobs and removed when closed — no action needed from you."
            />
          )}
        </>
      )}
    </div>
  );
};

// ─── AI Settings Tab ─────────────────────────────────────────────────────────
const AISettingsTab = () => {
  const { data: userData, isLoading } = useGetUserSettingsQuery();
  const [updateUser, { isLoading: saving }] = useUpdateUserSettingsMutation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (userData) form.setFieldsValue({
      model: userData.aiSettings?.model ?? 'claude-sonnet-4-6',
      tokenLimit: userData.aiSettings?.tokenLimit ?? 4096,
      temperature: userData.aiSettings?.temperature ?? 0.7,
      enableAIResumeParsing: userData.aiSettings?.enableAIResumeParsing ?? false,
      enableResumeScreening: userData.aiSettings?.enableResumeScreening ?? false,
      enableJdGeneration: userData.aiSettings?.enableJdGeneration ?? true,
      enableCandidateSummary: userData.aiSettings?.enableCandidateSummary ?? true,
      enableExamGeneration: userData.aiSettings?.enableExamGeneration ?? true,
      enableMarketIntelligence: userData.aiSettings?.enableMarketIntelligence ?? true,
      enableAutoRankIngested: userData.aiSettings?.enableAutoRankIngested ?? false,
    });
  }, [userData]);

  const onSave = async () => {
    const v = form.getFieldsValue();
    await updateUser({ aiSettings: v }).unwrap();
    message.success('AI settings saved');
  };

  if (isLoading) return <Spin tip="Loading AI settings…" />;

  const TOGGLES = [
    { key: 'enableAIResumeParsing', label: 'AI Resume Parsing', desc: 'Use Claude AI to extract name, email, phone and skills from resumes. Falls back to rule-based parsing when off.' },
    { key: 'enableResumeScreening', label: 'AI Resume Screening', desc: 'Auto-score resumes against JD' },
    { key: 'enableJdGeneration', label: 'Parse with AI', desc: 'Auto-fill requirement fields (including the JD) by parsing pasted text with AI' },
    { key: 'enableCandidateSummary', label: 'Candidate Summary', desc: 'Auto-summarise candidate profiles' },
    { key: 'enableExamGeneration', label: 'Generate Exam', desc: 'Auto-Generate L1 Exam' },
    { key: 'enableMarketIntelligence', label: 'Live Dice Market Intelligence', desc: 'Auto-fetch live market data (supply, salary, velocity) while creating a requirement' },
    { key: 'enableAutoRankIngested', label: 'Auto-Rank Ingested Resumes', desc: 'Automatically rank newly ingested resumes with Claude and move them to the Ranked column' },
  ];

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={5} style={{ margin: 0 }}>AI & Language Model Settings</Title>
        <Text type="secondary">Control AI-powered features and token usage</Text>
      </div>
      <Form form={form} layout="vertical">
        <Card style={{ borderRadius: 10, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="model" label="Model" style={{ marginBottom: 0 }}>
              <Select options={[
                { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
                { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
                { value: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
              ]} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="tokenLimit" label="Token Limit" style={{ marginBottom: 0 }}>
              <InputNumber min={256} max={8192} step={256} style={{ width: '100%' }} formatter={(v) => `${v} tokens`} parser={(v) => parseInt(v.replace(' tokens', ''), 10)} />
            </Form.Item>
            <Form.Item name="temperature" label="Temperature (creativity)" style={{ marginBottom: 0 }}>
              <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Card>

        <Card style={{ borderRadius: 10, marginBottom: 16 }}>
          <Title level={5} style={{ marginTop: 0 }}>Feature Toggles</Title>
          {TOGGLES.map(({ key, label, desc }) => (
            <Form.Item key={key} name={key} valuePropName="checked" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <Text strong>{label}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{desc}</Text>
                </div>
                <Form.Item name={key} valuePropName="checked" noStyle>
                  <Switch
                    onChange={(checked) => {
                      if (key === 'enableAIResumeParsing') {
                        form.setFieldValue('enableCandidateSummary', checked);
                      }
                    }}
                  />
                </Form.Item>
              </div>
            </Form.Item>
          ))}
        </Card>

        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave} style={{ backgroundColor: '#2563eb' }}>
          Save AI Settings
        </Button>
      </Form>
    </div>
  );
};

// ─── Exams Tab ────────────────────────────────────────────────────────────────
const ExamSettingsTab = () => {
  const { data: examData, isLoading } = useGetExamSettingsQuery();
  const [updateExam, { isLoading: saving }] = useUpdateExamSettingsMutation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (examData) form.setFieldsValue({
      requireIdVerification: examData.requireIdVerification ?? true,
      questionCount: examData.questionCount ?? 20,
      timeLimitMinutes: examData.timeLimitMinutes ?? 15,
    });
  }, [examData]);

  const onSave = async () => {
    const v = form.getFieldsValue();
    try {
      await updateExam({
        requireIdVerification: v.requireIdVerification,
        questionCount: v.questionCount,
        timeLimitMinutes: v.timeLimitMinutes,
      }).unwrap();
      message.success('Exam settings saved');
    } catch (err) {
      message.error(err?.data?.error ?? 'Failed to save exam settings');
    }
  };

  if (isLoading) return <Spin tip="Loading exam settings…" />;

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={5} style={{ margin: 0 }}>Exam Settings</Title>
        <Text type="secondary">
          Org-wide default for the L1 online assessment. Individual job requirements can override
          these via the gear icon on each job's exam settings.
        </Text>
      </div>
      <Form form={form} layout="vertical">
        <Card style={{ borderRadius: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div>
              <Text strong><IdcardOutlined /> Photo ID Verification</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Require a live selfie + government ID match before the exam timer starts
              </Text>
            </div>
            <Form.Item name="requireIdVerification" valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <Form.Item
              name="questionCount"
              label="Number of Questions"
              extra={<Text type="secondary" style={{ fontSize: 12 }}>Default: 20</Text>}
              style={{ marginBottom: 0 }}
            >
              <InputNumber min={5} max={100} style={{ width: '100%' }} placeholder="20" />
            </Form.Item>
            <Form.Item
              name="timeLimitMinutes"
              label="Time to Complete (minutes)"
              extra={<Text type="secondary" style={{ fontSize: 12 }}>Default: 15</Text>}
              style={{ marginBottom: 0 }}
            >
              <InputNumber min={1} max={180} style={{ width: '100%' }} placeholder="15" />
            </Form.Item>
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
            Question count applies to newly generated exams; existing exams keep their original question set.
            Time limit and ID verification apply immediately to all exams, including ones already generated.
          </Text>
        </Card>

        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave} style={{ backgroundColor: '#2563eb' }}>
          Save Exam Settings
        </Button>
      </Form>
    </div>
  );
};

// ─── System Settings Tab (admin only) ────────────────────────────────────────
const SystemSettingsTab = () => {
  const { data: sysData, isLoading } = useGetSystemSettingsQuery();
  const [updateSystem, { isLoading: saving }] = useUpdateSystemSettingsMutation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (sysData) form.setFieldsValue({
      companyName: sysData.companyName,
      defaultTimezone: sysData.defaultTimezone,
      anthropicApiKey: sysData.anthropicApiKey,
      mseTenantId: sysData.msGraph?.tenantId,
      mseClientId: sysData.msGraph?.clientId,
      mseClientSecret: sysData.msGraph?.clientSecret,
      mseOrganizerEmail: sysData.msGraph?.organizerEmail,
      cognitoUserPoolId: sysData.cognito?.userPoolId,
      cognitoClientId: sysData.cognito?.clientId,
      cognitoRegion: sysData.cognito?.region,
    });
  }, [sysData]);

  const onSave = async () => {
    const v = form.getFieldsValue();
    await updateSystem({
      companyName: v.companyName,
      defaultTimezone: v.defaultTimezone,
      anthropicApiKey: v.anthropicApiKey,
      msGraph: { tenantId: v.mseTenantId, clientId: v.mseClientId, clientSecret: v.mseClientSecret, organizerEmail: v.mseOrganizerEmail },
      cognito: { userPoolId: v.cognitoUserPoolId, clientId: v.cognitoClientId, region: v.cognitoRegion },
    }).unwrap();
    message.success('System settings saved');
  };

  if (isLoading) return <Spin tip="Loading system settings…" />;

  return (
    <div style={{ maxWidth: 700 }}>
      <Alert type="warning" showIcon message="Admin Only" description="These settings affect all users and contain sensitive credentials. Handle with care." style={{ marginBottom: 20 }} />
      <Form form={form} layout="vertical">
        <Card title="General" style={{ borderRadius: 10, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="companyName" label="Company Name"><Input /></Form.Item>
            <Form.Item name="defaultTimezone" label="Default Timezone">
              <Select options={[
                { value: 'America/New_York', label: 'EST (New York)' },
                { value: 'America/Los_Angeles', label: 'PST (Los Angeles)' },
                { value: 'UTC', label: 'UTC' },
                { value: 'Asia/Kolkata', label: 'IST (Kolkata)' },
                { value: 'Europe/London', label: 'GMT (London)' },
              ]} />
            </Form.Item>
          </div>
        </Card>

        <Card title={<Space><RobotOutlined />Anthropic / AI</Space>} style={{ borderRadius: 10, marginBottom: 16 }}>
          <Form.Item name="anthropicApiKey" label="Anthropic API Key">
            <Input.Password placeholder="sk-ant-api03-…" />
          </Form.Item>
        </Card>

        <Card title={<Space><GlobalOutlined />Microsoft Graph (Teams Interviews)</Space>} style={{ borderRadius: 10, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="mseTenantId" label="Tenant ID"><Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></Form.Item>
            <Form.Item name="mseClientId" label="Client ID"><Input /></Form.Item>
            <Form.Item name="mseClientSecret" label="Client Secret"><Input.Password /></Form.Item>
            <Form.Item name="mseOrganizerEmail" label="Organizer Email"><Input placeholder="ats@company.com" /></Form.Item>
          </div>
        </Card>

        <Card title={<Space><LockOutlined />AWS Cognito</Space>} style={{ borderRadius: 10, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="cognitoUserPoolId" label="User Pool ID"><Input placeholder="us-east-1_xxxxxxxxx" /></Form.Item>
            <Form.Item name="cognitoClientId" label="App Client ID"><Input /></Form.Item>
            <Form.Item name="cognitoRegion" label="Region"><Input placeholder="us-east-1" /></Form.Item>
          </div>
          <Alert type="info" message="Restart the backend server after changing Cognito settings." style={{ marginTop: 8 }} />
        </Card>

        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave} style={{ backgroundColor: '#2563eb' }}>
          Save System Settings
        </Button>
      </Form>
    </div>
  );
};

// ─── User Preferences Tab ─────────────────────────────────────────────────────
const UserSettingsTab = ({ onSettingsChange }) => {
  const { data: userData, isLoading } = useGetUserSettingsQuery();
  const [updateUser, { isLoading: saving }] = useUpdateUserSettingsMutation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (userData) form.setFieldsValue({
      timezone: userData.timezone,
      language: userData.language,
      defaultRegion: userData.defaultRegion ?? 'global',
      examSubmitted: userData.emailNotifications?.examSubmitted,
      interviewScheduled: userData.emailNotifications?.interviewScheduled,
      candidateMoved: userData.emailNotifications?.candidateMoved,
      dailyDigest: userData.emailNotifications?.dailyDigest,
    });
  }, [userData]);

  const onSave = async () => {
    const v = form.getFieldsValue();
    await updateUser({
      timezone: v.timezone,
      language: v.language,
      defaultRegion: v.defaultRegion,
      emailNotifications: {
        examSubmitted: v.examSubmitted,
        interviewScheduled: v.interviewScheduled,
        candidateMoved: v.candidateMoved,
        dailyDigest: v.dailyDigest,
      },
    }).unwrap();
    message.success('Preferences saved');
    onSettingsChange?.();
  };

  if (isLoading) return <Spin tip="Loading preferences…" />;

  const notifItems = [
    { key: 'examSubmitted', label: 'Exam submitted', desc: 'When a candidate completes their online assessment' },
    { key: 'interviewScheduled', label: 'Interview scheduled', desc: 'Confirmation when a Teams meeting is created' },
    { key: 'candidateMoved', label: 'Candidate stage change', desc: 'When a candidate is moved between pipeline stages' },
    { key: 'dailyDigest', label: 'Daily digest', desc: 'Morning summary of pipeline activity' },
  ];

  return (
    <div style={{ maxWidth: 620 }}>
      <Form form={form} layout="vertical">
        <Card title={<Space><UserOutlined />Regional Preferences</Space>} style={{ borderRadius: 10, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="timezone" label="My Timezone">
              <Select options={[
                { value: 'America/New_York', label: 'EST (New York)' },
                { value: 'America/Chicago', label: 'CST (Chicago)' },
                { value: 'America/Los_Angeles', label: 'PST (Los Angeles)' },
                { value: 'UTC', label: 'UTC' },
                { value: 'Asia/Kolkata', label: 'IST (Kolkata)' },
                { value: 'Asia/Dubai', label: 'GST (Dubai)' },
                { value: 'Europe/London', label: 'GMT (London)' },
              ]} />
            </Form.Item>
            <Form.Item name="language" label="Language">
              <Select options={[
                { value: 'en', label: 'English' }
              ]} />
            </Form.Item>
            <Form.Item name="defaultRegion" label="Default Region">
              <Select options={REGION_OPTIONS} />
            </Form.Item>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>The region selected automatically each time you log in</Text>
        </Card>

        <Card title={<Space><BellOutlined />Email Notifications</Space>} style={{ borderRadius: 10, marginBottom: 16 }}>
          {notifItems.map(({ key, label, desc }) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div>
                <Text strong style={{ fontSize: 13 }}>{label}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>{desc}</Text>
              </div>
              <Form.Item name={key} valuePropName="checked" noStyle><Switch /></Form.Item>
            </div>
          ))}
        </Card>

        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave} style={{ backgroundColor: '#2563eb' }}>
          Save My Preferences
        </Button>
      </Form>
    </div>
  );
};

// ─── Main Settings Component ──────────────────────────────────────────────────
const Settings = ({ onSettingsChange }) => {
  const { isAdmin } = useAuth();

  const tabItems = [
    // My Preferences
    {
      key: 'myPreferences',
      label: <Space><UserOutlined />My Preferences</Space>,
      children: <UserSettingsTab onSettingsChange={onSettingsChange} />,
    },

    // Job Boards
    {
      key: 'jobBoards',
      label: <Space><GlobalOutlined />Job Boards</Space>,
      children: <JobBoardsTab isAdmin={isAdmin} />,
    },

    // AI / LLM
    {
      key: 'ai',
      label: <Space><RobotOutlined />AI / LLM</Space>,
      children: <AISettingsTab />,
    },

    // Exams — default config; admin only (per-job overrides live on each requirement)
    ...(isAdmin ? [{
      key: 'exams',
      label: <Space><FileTextOutlined /><span>Exams</span><Tag color="red" style={{ fontSize: 10, marginLeft: 0 }}>Admin</Tag></Space>,
      children: <ExamSettingsTab />,
    }] : []),

    // System Settings (admin only)
    ...(isAdmin ? [{
      key: 'systemSettings',
      label: <Space><LockOutlined /><span>System Settings</span><Tag color="red" style={{ fontSize: 10, marginLeft: 0 }}>Admin</Tag></Space>,
      children: <SystemSettingsTab />,
    }] : []),
  ];

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Configuration</Title>
          <Text type="secondary">Manage your ATS integrations and system preferences</Text>
        </div>
      </div>

      <Tabs items={tabItems} type="card" />
    </div>
  );
};

export default Settings;
