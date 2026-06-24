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
  MailOutlined,
  GlobalOutlined,
  RobotOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LinkOutlined,
  SaveOutlined,
  ReloadOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import settingsData from '../../settings.json';

const { Title, Text, Paragraph } = Typography;
const { Password } = Input;

// Loads configuration from settings.json (cloned so edits don't mutate the import)
const loadSettings = () =>
  new Promise((resolve) =>
    setTimeout(() => resolve(structuredClone(settingsData)), 400)
  );

// ─── Job Board Card ───────────────────────────────────────────────────────────
const boardMeta = {
  linkedin: { label: 'LinkedIn', color: '#0A66C2', icon: '🔵' },
  naukri: { label: 'Naukri', color: '#FF7555', icon: '🟠' },
  monster: { label: 'Monster', color: '#6E34D5', icon: '🟣' },
  indeed: { label: 'Indeed', color: '#003A9B', icon: '🔷' },
};

const JobBoardCard = ({ boardKey, config, onChange }) => {
  const meta = boardMeta[boardKey];
  const [showToken, setShowToken] = useState(false);

  return (
    <Card
      style={{
        borderRadius: 10,
        border: `1.5px solid ${config.enabled ? meta.color + '55' : '#e8e8e8'}`,
        transition: 'border 0.2s',
        marginBottom: 16,
      }}
      bodyStyle={{ padding: '16px 20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <span style={{ fontSize: 20 }}>{meta.icon}</span>
          <Text strong style={{ fontSize: 15, color: meta.color }}>
            {meta.label}
          </Text>
          <Badge
            status={config.enabled ? 'success' : 'default'}
            text={
              <Text type={config.enabled ? 'success' : 'secondary'} style={{ fontSize: 12 }}>
                {config.enabled ? 'Active' : 'Disabled'}
              </Text>
            }
          />
        </Space>
        <Switch
          checked={config.enabled}
          onChange={(val) => onChange(boardKey, 'enabled', val)}
          checkedChildren="ON"
          unCheckedChildren="OFF"
          style={{ backgroundColor: config.enabled ? meta.color : undefined }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Form.Item label="API Token" style={{ marginBottom: 0 }}>
          <Input.Password
            disabled={!config.enabled}
            value={config.apiToken}
            placeholder="Enter API token"
            onChange={(e) => onChange(boardKey, 'apiToken', e.target.value)}
            visibilityToggle
          />
        </Form.Item>

        <Form.Item label="Sync Interval (mins)" style={{ marginBottom: 0 }}>
          <InputNumber
            disabled={!config.enabled}
            min={15}
            max={1440}
            value={config.syncInterval}
            onChange={(val) => onChange(boardKey, 'syncInterval', val)}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </div>

      <div style={{ marginTop: 12 }}>
        <Space>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Auto-post new openings:
          </Text>
          <Switch
            size="small"
            disabled={!config.enabled}
            checked={config.autoPost}
            onChange={(val) => onChange(boardKey, 'autoPost', val)}
          />
          {config.enabled && (
            <Tooltip title="Test connection">
              <Button size="small" icon={<LinkOutlined />} type="link">
                Test Connection
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>
    </Card>
  );
};

// ─── Main Settings Component ──────────────────────────────────────────────────
const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadSettings().then((data) => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  const update = (path, value) => {
    setSettings((prev) => {
      const next = structuredClone(prev);
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
    setDirty(true);
  };

  const handleJobBoardChange = (board, field, value) => update(`jobBoards.${board}.${field}`, value);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
    setDirty(false);
    message.success('Settings saved successfully');
  };

  const handleReset = async () => {
    setLoading(true);
    const data = await loadSettings();
    setSettings(data);
    setLoading(false);
    setDirty(false);
    message.info('Settings reloaded from file');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Spin size="large" tip="Loading configuration…" />
      </div>
    );
  }

  const tabItems = [
    // ── Email ──────────────────────────────────────────────────────────────────
    {
      key: 'email',
      label: (
        <Space>
          <MailOutlined />
          Email
          {settings.email.enabled ? (
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#bbb', fontSize: 12 }} />
          )}
        </Space>
      ),
      children: (
        <div style={{ maxWidth: 680 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <Title level={5} style={{ margin: 0 }}>
                Email Communication
              </Title>
              <Text type="secondary">Configure outbound email for candidate notifications</Text>
            </div>
            <Space>
              <Text type="secondary">Enable email</Text>
              <Switch
                checked={settings.email.enabled}
                onChange={(v) => update('email.enabled', v)}
                checkedChildren="ON"
                unCheckedChildren="OFF"
              />
            </Space>
          </div>

          <Card style={{ borderRadius: 10, marginBottom: 16 }}>
            <Title level={5} style={{ marginTop: 0 }}>
              SMTP Configuration
            </Title>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <Form.Item label="SMTP Host" style={{ marginBottom: 0 }}>
                <Input
                  disabled={!settings.email.enabled}
                  value={settings.email.smtpHost}
                  onChange={(e) => update('email.smtpHost', e.target.value)}
                />
              </Form.Item>
              <Form.Item label="Port" style={{ marginBottom: 0 }}>
                <InputNumber
                  disabled={!settings.email.enabled}
                  value={settings.email.smtpPort}
                  onChange={(v) => update('email.smtpPort', v)}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label="From Address" style={{ marginBottom: 0 }}>
                <Input
                  disabled={!settings.email.enabled}
                  value={settings.email.fromAddress}
                  onChange={(e) => update('email.fromAddress', e.target.value)}
                />
              </Form.Item>
              <Form.Item label="Reply-To" style={{ marginBottom: 0 }}>
                <Input
                  disabled={!settings.email.enabled}
                  value={settings.email.replyTo}
                  onChange={(e) => update('email.replyTo', e.target.value)}
                />
              </Form.Item>
            </div>
            <div style={{ marginTop: 16 }}>
              <Space>
                <Text>Use TLS/SSL:</Text>
                <Switch
                  size="small"
                  disabled={!settings.email.enabled}
                  checked={settings.email.useTLS}
                  onChange={(v) => update('email.useTLS', v)}
                />
                <Tag color={settings.email.useTLS ? 'green' : 'default'}>
                  {settings.email.useTLS ? 'Secure' : 'Plain'}
                </Tag>
              </Space>
            </div>
          </Card>

          <Card style={{ borderRadius: 10 }}>
            <Title level={5} style={{ marginTop: 0 }}>
              Email Templates
            </Title>
            <Paragraph type="secondary" style={{ fontSize: 13 }}>
              Choose which automated emails are sent to candidates
            </Paragraph>
            {Object.entries(settings.email.templates).map(([key, val]) => {
              const labels = {
                interviewInvite: 'Interview Invitation',
                offerLetter: 'Offer Letter',
                rejection: 'Rejection Notice',
                applicationConfirmation: 'Application Confirmation',
              };
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <Text>{labels[key]}</Text>
                  <Switch
                    size="small"
                    disabled={!settings.email.enabled}
                    checked={val}
                    onChange={(v) => update(`email.templates.${key}`, v)}
                  />
                </div>
              );
            })}
          </Card>
        </div>
      ),
    },

    // ── Job Boards ─────────────────────────────────────────────────────────────
    {
      key: 'jobBoards',
      label: (
        <Space>
          <GlobalOutlined />
          Job Boards
        </Space>
      ),
      children: (
        <div style={{ maxWidth: 680 }}>
          <div style={{ marginBottom: 20 }}>
            <Title level={5} style={{ margin: 0 }}>
              Job Board Integrations
            </Title>
            <Text type="secondary">Enable and configure external job portals for sourcing candidates</Text>
          </div>

          {Object.entries(settings.jobBoards).map(([key, cfg]) => (
            <JobBoardCard key={key} boardKey={key} config={cfg} onChange={handleJobBoardChange} />
          ))}
        </div>
      ),
    },

    // ── AI Settings ───────────────────────────────────────────────────────────
    {
      key: 'ai',
      label: (
        <Space>
          <RobotOutlined />
          AI / LLM
        </Space>
      ),
      children: (
        <div style={{ maxWidth: 680 }}>
          <div style={{ marginBottom: 20 }}>
            <Title level={5} style={{ margin: 0 }}>
              AI & Language Model Settings
            </Title>
            <Text type="secondary">Control AI-powered features and token usage</Text>
          </div>

          <Card style={{ borderRadius: 10, marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item label="Model" style={{ marginBottom: 0 }}>
                <Select
                  value={settings.aiSettings.model}
                  onChange={(v) => update('aiSettings.model', v)}
                  options={[
                    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
                    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
                    { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
                  ]}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    Token Limit
                    <Tooltip title="Max tokens per AI request. Higher = more detailed output, higher cost.">
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        ⓘ
                      </Text>
                    </Tooltip>
                  </Space>
                }
                style={{ marginBottom: 0 }}
              >
                <InputNumber
                  min={256}
                  max={8192}
                  step={256}
                  value={settings.aiSettings.tokenLimit}
                  onChange={(v) => update('aiSettings.tokenLimit', v)}
                  style={{ width: '100%' }}
                  formatter={(v) => `${v} tokens`}
                  parser={(v) => parseInt(v.replace(' tokens', ''), 10)}
                />
              </Form.Item>

              <Form.Item label="Temperature (creativity)" style={{ marginBottom: 0 }}>
                <InputNumber
                  min={0}
                  max={1}
                  step={0.1}
                  value={settings.aiSettings.temperature}
                  onChange={(v) => update('aiSettings.temperature', v)}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>
          </Card>

          <Card style={{ borderRadius: 10 }}>
            <Title level={5} style={{ marginTop: 0 }}>
              Feature Toggles
            </Title>
            {[
              { key: 'enableResumeScreening', label: 'AI Resume Screening', desc: 'Auto-score resumes against JD' },
              { key: 'enableJdGeneration', label: 'JD Generation', desc: 'Generate job descriptions with AI' },
              { key: 'enableCandidateSummary', label: 'Candidate Summary', desc: 'Auto-summarise candidate profiles' },
              { key: 'enableExamGeneration', label: 'Generate Exam', desc: 'Auto-Generate L1 Exam' },
            ].map(({ key, label, desc }) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div>
                  <Text strong>{label}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {desc}
                  </Text>
                </div>
                <Switch
                  checked={settings.aiSettings[key]}
                  onChange={(v) => update(`aiSettings.${key}`, v)}
                />
              </div>
            ))}
          </Card>
        </div>
      ),
    },

    // ── General ───────────────────────────────────────────────────────────────
    {
      key: 'general',
      label: (
        <Space>
          <SettingOutlined />
          General
        </Space>
      ),
      children: (
        <div style={{ maxWidth: 680 }}>
          <div style={{ marginBottom: 20 }}>
            <Title level={5} style={{ margin: 0 }}>
              General Settings
            </Title>
            <Text type="secondary">Regional, session, and file upload preferences</Text>
          </div>

          <Card style={{ borderRadius: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item label="Timezone" style={{ marginBottom: 0 }}>
                <Select
                  value={settings.general.timezone}
                  onChange={(v) => update('general.timezone', v)}
                  options={[
                    { value: 'Asia/Kolkata', label: 'IST (Asia/Kolkata)' },
                    { value: 'UTC', label: 'UTC' },
                    { value: 'America/New_York', label: 'EST (New York)' },
                    { value: 'Europe/London', label: 'GMT (London)' },
                  ]}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item label="Date Format" style={{ marginBottom: 0 }}>
                <Select
                  value={settings.general.dateFormat}
                  onChange={(v) => update('general.dateFormat', v)}
                  options={[
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                  ]}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item label="Session Timeout (mins)" style={{ marginBottom: 0 }}>
                <InputNumber
                  min={5}
                  max={480}
                  value={settings.general.sessionTimeout}
                  onChange={(v) => update('general.sessionTimeout', v)}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item label="Max Upload Size (MB)" style={{ marginBottom: 0 }}>
                <InputNumber
                  min={1}
                  max={50}
                  value={settings.general.maxUploadSizeMB}
                  onChange={(v) => update('general.maxUploadSizeMB', v)}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <Form.Item label="Allowed Resume File Types" style={{ marginBottom: 0 }}>
              <Select
                mode="multiple"
                value={settings.general.allowedFileTypes}
                onChange={(v) => update('general.allowedFileTypes', v)}
                options={['pdf', 'doc', 'docx', 'txt', 'rtf'].map((t) => ({ value: t, label: `.${t}` }))}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Configuration
          </Title>
          <Text type="secondary">Manage your ATS integrations and system preferences</Text>
        </div>
        <Space>
          {dirty && (
            <Alert
              message="Unsaved changes"
              type="warning"
              showIcon
              style={{ padding: '2px 12px', borderRadius: 6 }}
            />
          )}
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Reset
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
            disabled={!dirty}
          >
            Save Changes
          </Button>
        </Space>
      </div>

      <Tabs items={tabItems} type="card" />
    </div>
  );
};

export default Settings;
