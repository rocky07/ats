import React, { useState } from 'react';
import { 
  Layout, 
  Menu, 
  Avatar, 
  Dropdown, 
  Space, 
  Typography, 
  Button
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  AppstoreOutlined,
  ArrowUpOutlined
} from '@ant-design/icons';
import Dashboard from './components/Dashboard';
import Candidates from './components/Candidates';
import Requirements from './components/Requirements';
import Pipeline from './components/Pipeline';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('1');

  const menuTitles = {
    '1': 'Dashboard',
    '2': 'Candidates',
    '3': 'Requirements',
    '4': 'Pipelines',
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
    },
  ];

  const sidebarItems = [
    {
      key: '1',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '2',
      icon: <UserOutlined />,
      label: 'Candidates',
    },
    {
      key: '3',
      icon: <AppstoreOutlined />,
      label: 'Requirements',
    },
    {
      key: '4',
      icon: <ArrowUpOutlined />,
      label: 'Pipelines',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row' }}>
      {/* --- Left Sidebar --- */}
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        theme="dark"
        width={220}
      >
        {/* Top Left Corner: Logo Area */}
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '0 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Title level={3} style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>
            {collapsed ? 'ATS' : 'ATS Dashboard'}
          </Title>
        </div>

        <Menu 
          theme="dark" 
          defaultSelectedKeys={['1']} 
          mode="inline" 
          items={sidebarItems}
          onClick={(e) => setSelectedMenu(e.key)}
          style={{ marginTop: 16 }}
        />
      </Sider>

      {/* --- Right side Viewport Wrapper --- */}
      <Layout style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        
        {/* --- Top Header Area --- */}
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)',
          height: 64,
          width: '100%'
        }}>
          {/* Top Left within header frame */}
          <Title level={3} style={{ margin: 0, whiteSpace: 'nowrap' }}>
            {menuTitles[selectedMenu]}
          </Title>
           
          {/* Strictly Anchored to Top Right corner */}
          <Space size="middle" style={{ display: 'flex', alignItems: 'center' }}>
            <Button type="text" icon={<SettingOutlined style={{ fontSize: 18 }} />} />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} size="large" />
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* --- Middle Content Area --- */}
        <Content style={{ margin: '24px 24px', flex: 1, overflowY: 'auto' }}>
          
          {/* Dashboard */}
          {selectedMenu === '1' && <Dashboard />}

          {/* Requirements */}
          {selectedMenu === '3' && <Requirements />}

          {/* Candidates */}
          {selectedMenu === '2' && <Candidates />}

          {/* Pipelines */}
          {selectedMenu === '4' && <Pipeline />}
        </Content>

      </Layout>
    </Layout>
  );
};

export default App;
