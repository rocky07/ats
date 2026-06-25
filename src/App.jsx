import React, { useState, useRef, useEffect } from 'react';
import { 
  Layout, 
  Menu, 
  Avatar, 
  Dropdown, 
  Space, 
  Typography,
  Button,
  Modal,
  Tooltip,
  Drawer,
  Input,
  Select,
  Spin
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  AppstoreOutlined,
  ArrowUpOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  GlobalOutlined,
  ShopOutlined,
  SendOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import Dashboard from './components/Dashboard';
import Candidates from './components/Candidates';
import Requirements from './components/Requirements';
import Pipeline from './components/Pipeline';
import Vendors from './components/Vendors';
import Settings from './components/Settings';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

// ─── Claude Chat Drawer ───────────────────────────────────────────────────────

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  text: "Hi! I'm Claude, your ATS assistant. Ask me to find candidates, summarise pipelines, or anything else about your recruitment data.",
  ts: new Date(),
};

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ClaudeDrawer = ({ open, onClose }) => {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now(), role: 'user', text, ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.text }));

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system:
            'You are an ATS (Applicant Tracking System) assistant embedded in Bourntec ATS. Help users find candidates, review job requirements, check pipeline status, and manage vendor relationships. Be concise and actionable.',
          messages: history,
        }),
      });

      const data = await res.json();
      const reply =
        data?.content?.find((b) => b.type === 'text')?.text ??
        'Sorry, I couldn\'t get a response. Please try again.';

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', text: reply, ts: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: 'Something went wrong. Please check your connection and try again.',
          ts: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Drawer
      title={
        <Space>
          <span style={{
            background: 'linear-gradient(135deg, #da7756, #c96442)',
            borderRadius: 8,
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
          }}>✦</span>
          <span style={{ fontWeight: 600 }}>Ask Claude AI</span>
        </Space>
      }
      placement="right"
      width={400}
      open={open}
      onClose={onClose}
      styles={{
        body: {
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          height: '100%',
          overflow: 'hidden',
        },
      }}
    >
      {/* ── Messages ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: isUser ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: 8,
              }}
            >
              {/* Avatar */}
              {!isUser && (
                <div style={{
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #da7756, #c96442)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  color: '#fff',
                  marginBottom: 2,
                }}>✦</div>
              )}

              <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 2, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                {/* Sender label */}
                <Text style={{ fontSize: 11, color: '#999', paddingLeft: isUser ? 0 : 2, paddingRight: isUser ? 2 : 0 }}>
                  {isUser ? 'You' : 'Claude'} · {formatTime(msg.ts)}
                </Text>

                {/* Bubble */}
                <div style={{
                  background: isUser ? 'linear-gradient(135deg, #da7756, #c96442)' : '#fff',
                  color: isUser ? '#fff' : '#1a1a1a',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '10px 14px',
                  fontSize: 13,
                  lineHeight: 1.55,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  border: isUser ? 'none' : '1px solid #f0f0f0',
                }}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{
              flexShrink: 0,
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #da7756, #c96442)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              color: '#fff',
            }}>✦</div>
            <div style={{
              background: '#fff',
              border: '1px solid #f0f0f0',
              borderRadius: '16px 16px 16px 4px',
              padding: '10px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <Spin size="small" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Bar ── */}
      <div style={{
        borderTop: '1px solid #f0f0f0',
        padding: '12px 16px',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about candidates, jobs, pipelines… (Enter to send)"
          autoSize={{ minRows: 2, maxRows: 5 }}
          style={{
            resize: 'none',
            borderRadius: 10,
            fontSize: 13,
            border: '1px solid #e8e8e8',
            background: '#fafafa',
          }}
          disabled={loading}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: '#bbb' }}>Shift+Enter for new line</Text>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={sendMessage}
            loading={loading}
            disabled={!input.trim()}
            style={{
              background: 'linear-gradient(135deg, #da7756, #c96442)',
              border: 'none',
              borderRadius: 8,
              paddingLeft: 16,
              paddingRight: 16,
            }}
          >
            Send
          </Button>
        </div>
      </div>
    </Drawer>
  );
};

// ─── Main App ────────────────────────────────────────────────────────────────

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('1');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [region, setRegion] = useState('global');
  const [pipelineReqId, setPipelineReqId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleViewPipeline = (reqId) => {
    setPipelineReqId(reqId);
    setSelectedMenu('4');
  };

  const regionOptions = [
    { value: 'global', label: 'Global' },
    { value: 'india', label: 'India' },
    { value: 'middleeast', label: 'Middle East' },
    { value: 'us', label: 'US' },
  ];

  const menuTitles = {
    '1': 'Dashboard',
    '2': 'Candidates',
    '3': 'Job Requirements',
    '4': 'Pipelines',
    '5': 'Vendors',
  };

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: 'My Profile' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true },
  ];

  const sidebarItems = [
    { key: '1', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '2', icon: <UserOutlined />, label: 'Candidates' },
    { key: '3', icon: <AppstoreOutlined />, label: 'Requirements' },
    { key: '4', icon: <ArrowUpOutlined />, label: 'Pipelines' },
    { key: '5', icon: <ShopOutlined />, label: 'Vendors' },
  ];

  return (
    <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row' }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        theme="dark"
        width={220}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          {!collapsed && (
            <Title level={3} style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>
              Bourntec ATS
            </Title>
          )}
          <Button
            type="text"
            onClick={() => setCollapsed(!collapsed)}
            icon={collapsed
              ? <MenuUnfoldOutlined style={{ color: '#fff', fontSize: 18 }} />
              : <MenuFoldOutlined style={{ color: '#fff', fontSize: 18 }} />}
          />
        </div>
        <Menu
          theme="dark"
          selectedKeys={[selectedMenu]}
          mode="inline"
          items={sidebarItems}
          onClick={(e) => setSelectedMenu(e.key)}
          style={{ marginTop: 16 }}
        />
      </Sider>

      {/* Settings Modal */}
      <Modal
        open={settingsOpen}
        onCancel={() => setSettingsOpen(false)}
        footer={null}
        width={840}
        destroyOnClose
        title="Settings"
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      >
        <Settings />
      </Modal>

      {/* Claude Chat Drawer */}
      <ClaudeDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Main area */}
      <Layout style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)',
          height: 64,
          width: '100%',
        }}>
          <Title level={3} style={{ margin: 0, whiteSpace: 'nowrap' }}>
            {menuTitles[selectedMenu]}
          </Title>

          <Space size="middle" style={{ display: 'flex', alignItems: 'center' }}>
            <Select
              value={region}
              onChange={setRegion}
              options={regionOptions}
              suffixIcon={<GlobalOutlined />}
              style={{ minWidth: 140 }}
              aria-label="Operating region"
            />
            <Tooltip title="Ask Claude AI">
              <Button
                type="text"
                onClick={() => setDrawerOpen(true)}
                icon={<ThunderboltOutlined style={{ fontSize: 18, color: '#da7756' }} />}
              />
            </Tooltip>
            <Button
              type="text"
              onClick={() => setSettingsOpen(true)}
              icon={<SettingOutlined style={{ fontSize: 18 }} />}
            />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} size="large" />
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: '24px 24px', flex: 1, overflowY: 'auto' }}>
          {selectedMenu === '1' && <Dashboard />}
          {selectedMenu === '3' && <Requirements onViewPipeline={handleViewPipeline} />}
          {selectedMenu === '2' && <Candidates />}
          {selectedMenu === '4' && <Pipeline reqId={pipelineReqId} />}
          {selectedMenu === '5' && <Vendors />}
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;