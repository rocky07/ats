import React from 'react';
import { Card, Col, Input, Row, Statistic, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, SearchOutlined } from '@ant-design/icons';
import { Pie, Bar, Column } from '@ant-design/charts';

const { Text } = Typography;

const Dashboard = () => {
  // 1. Mock Data for Sourcing Mix (LinkedIn vs Naukri vs Uploads)
  const sourcingData = [
    { type: 'LinkedIn', value: 512 },
    { type: 'Naukri', value: 421 },
    { type: 'Resume Upload', value: 195 },
  ];

  // 2. Mock Data for Recruitment Funnel
  const funnelData = [
    { stage: 'Ingested', count: 1128 },
    { stage: 'L1 Exam', count: 640 },
    { stage: 'L2 Interview', count: 210 },
    { stage: 'L3 Interview', count: 45 },
  ];

  // 3. Mock Data for Quality of Source per Stage
  const qualityData = [
    { stage: 'Ingested', source: 'LinkedIn', value: 512 },
    { stage: 'Ingested', source: 'Naukri', value: 421 },
    { stage: 'Ingested', source: 'Resume Upload', value: 195 },
    { stage: 'L1 Exam', source: 'LinkedIn', value: 310 },
    { stage: 'L1 Exam', source: 'Naukri', value: 210 },
    { stage: 'L1 Exam', source: 'Resume Upload', value: 120 },
    { stage: 'L2 Interview', source: 'LinkedIn', value: 130 },
    { stage: 'L2 Interview', source: 'Naukri', value: 50 },
    { stage: 'L2 Interview', source: 'Resume Upload', value: 30 },
    { stage: 'L3 Interview', source: 'LinkedIn', value: 30 },
    { stage: 'L3 Interview', source: 'Naukri', value: 8 },
    { stage: 'L3 Interview', source: 'Resume Upload', value: 7 },
  ];

  // Chart Configurations
  const pieConfig = {
    data: sourcingData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.6,
    label: { text: 'value', style: { fontWeight: 'bold' } },
    legend: { position: 'bottom' },
  };

  const funnelConfig = {
    data: funnelData,
    xField: 'stage',
    yField: 'count',
    conversionTag: {}, // Shows the % drops between stages dynamically
    label: { text: 'count', position: 'right' },
  };

  const qualityConfig = {
    data: qualityData,
    xField: 'stage',
    yField: 'value',
    colorField: 'source',
    stack: true, // Turns it into a stacked column chart
    label: { text: 'value', position: 'inside' },
  };

  return (
    <Row gutter={[24, 24]} style={{ display: 'flex', flexWrap: 'wrap', width: '100%', padding: '16px' }}>
      {/* KPI 1 */}
      <Col xs={24} md={6}>
        <Card size="small" style={{ borderRadius: 8 }}>
          <Statistic
            title={<span style={{ display: 'block', textAlign: 'center' }}>Total Candidates this week</span>}
            value={1128}
            prefix={<ArrowUpOutlined />}
            valueStyle={{ color: '#3f8600', fontSize: '26px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            style={{ textAlign: 'center' }}
          />
        </Card>
      </Col>

      {/* KPI 2 */}
      <Col xs={24} md={6}>
        <Card size="small" style={{ borderRadius: 8 }}>
          <Statistic
            title={<span style={{ block: 'block', textAlign: 'center' }}>Active Openings this week</span>}
            value={8}
            prefix={<ArrowDownOutlined />}
            valueStyle={{ color: '#cf1322', fontSize: '26px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            style={{ textAlign: 'center' }}
          />
        </Card>
      </Col>
       {/* KPI 3 */}
      <Col xs={24} md={6}>
        <Card size="small" style={{ borderRadius: 8 }}>
          <Statistic
            title={<span style={{ block: 'block', textAlign: 'center' }}>Interview to Offer Accept Rate (%)</span>}
            value={20}
            prefix={<ArrowDownOutlined />}
            valueStyle={{ color: '#cf1322', fontSize: '26px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            style={{ textAlign: 'center' }}
          />
        </Card>
      </Col>
       {/* KPI 4 */}
      <Col xs={24} md={6}>
        <Card size="small" style={{ borderRadius: 8 }}>
          <Statistic
            title={<span style={{ block: 'block', textAlign: 'center' }}>Applicant to screening passed rate</span>}
            value={4}
            prefix={<ArrowDownOutlined />}
            valueStyle={{ color: '#cf1322', fontSize: '26px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            style={{ textAlign: 'center' }}
          />
        </Card>
      </Col>

   
      {/* CHARTS LAYER */}
      
      {/* 1. Candidate Sourcing Breakdown */}
      <Col xs={24} md={8}>
        <Card title="Candidate Sourcing Channels" style={{ borderRadius: 8, height: '360px' }}>
          <div style={{ height: '260px' }}>
            <Pie {...pieConfig} />
          </div>
        </Card>
      </Col>

      {/* 2. Recruitment Funnel (Conversion Dropoff) */}
      <Col xs={24} md={16}>
        <Card title="Recruitment Pipeline Funnel" style={{ borderRadius: 8, height: '360px' }}>
          <div style={{ height: '260px' }}>
            <Bar {...funnelConfig} />
          </div>
        </Card>
      </Col>

      {/* 3. Source Quality Conversion Matrix */}
      <Col xs={24} md={16}>
        <Card title="Sourcing Platform Quality Matrix (By Stage Progression)" style={{ borderRadius: 8, height: '420px' }}>
          <div style={{ height: '320px' }}>
            <Column {...qualityConfig} />
          </div>
        </Card>
      </Col>

      {/* Recent Activity Section */}
      <Col xs={24} md={8}>
        <Card title="Recent Live Activity" style={{ borderRadius: 8, height: '420px', overflowY: 'auto' }}>
          <div style={{ padding: '4px 0' }}>
            <Text strong style={{ color: '#1677ff' }}>[LinkedIn Ingestion]</Text> <br />
            <Text strong>John Doe</Text> applied for Senior Backend Engineer.
          </div>
          <hr style={{ border: '0.5px solid #f0f0f0', margin: '12px 0' }} />
          <div style={{ padding: '4px 0' }}>
            <Text strong style={{ color: '#52c41a' }}>[Stage Clear]</Text> <br />
            Candidate <Text strong>Jane Smith</Text> cleared <Text code>L1 Exam</Text> and moved to L2 Interview.
          </div>
          <hr style={{ border: '0.5px solid #f0f0f0', margin: '12px 0' }} />
          <div style={{ padding: '4px 0' }}>
            <Text strong style={{ color: '#fa8c16' }}>[Naukri Ingestion]</Text> <br />
            <Text strong>Rahul Sharma</Text> applied for React UI Developer.
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default Dashboard;