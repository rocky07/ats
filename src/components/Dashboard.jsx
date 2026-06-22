import React from 'react';
import { Button, Card, Col, Input, Row, Statistic, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, SearchOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const Dashboard = () => {
  return (
    <Row gutter={[24, 24]} style={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}>
      <Col xs={24} md={6}>
        <Card size="small" style={{ borderRadius: 8 }}>
          <Statistic
            title={<span style={{ display: 'block', textAlign: 'center' }}>Total Candidates</span>}
            value={1128}
            prefix={<ArrowUpOutlined />}
            valueStyle={{ color: '#3f8600', fontSize: '26px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            style={{ textAlign: 'center' }}
          />
        </Card>
      </Col>

      <Col xs={24} md={6}>
        <Card size="small" style={{ borderRadius: 8 }}>
          <Statistic
            title={<span style={{ display: 'block', textAlign: 'center' }}>Active Projects</span>}
            value={8}
            prefix={<ArrowDownOutlined />}
            valueStyle={{ color: '#cf1322', fontSize: '26px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            style={{ textAlign: 'center' }}
          />
        </Card>
      </Col>

      <Col xs={24} md={12} style={{ display: 'flex', alignItems: 'center' }}>
        <Input 
          placeholder="Search candidates, projects..." 
          prefix={<SearchOutlined />} 
          allowClear 
          size="large"
          style={{ width: '100%', borderRadius: 6, height: '50px' }}
        />
      </Col>

      <Col xs={24} style={{ marginTop: 12 }}>
        <Card title="Recent Activity" style={{ borderRadius: 8 }}>
          <div style={{ padding: '8px 0' }}>
            <Text strong>Candidate John Doe</Text> applied for Software Engineer position.
          </div>
          <hr style={{ border: '0.5px solid #f0f0f0', margin: '12px 0' }} />
          <div style={{ padding: '8px 0' }}>
            <Text strong>Project Alpha</Text> has been updated with new requirements.
          </div>
          <hr style={{ border: '0.5px solid #f0f0f0', margin: '12px 0' }} />
          <div style={{ padding: '8px 0' }}>
            <Text strong>Pipeline Beta</Text> has moved to the next stage.
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default Dashboard;
