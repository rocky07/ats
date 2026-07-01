import React from 'react';
import { Card, Col, Row, Statistic, Typography, Spin, Alert, Tag, Empty } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, UserOutlined, CalendarOutlined, TeamOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Pie, Bar, Column } from '@ant-design/charts';
import { useGetDashboardQuery } from '../redux/dashboardApi';

const { Text } = Typography;

const SOURCE_COLORS = {
  LinkedIn:      '#0077B5',
  Naukri:        '#f5a623',
  'Resume Upload': '#52c41a',
  Manual:        '#8c8c8c',
  Upload:        '#52c41a',
};

const ACTIVITY_COLORS = {
  candidate: '#1677ff',
  interview: '#52c41a',
};

const ACTIVITY_ICONS = {
  candidate: <UserOutlined />,
  interview: <CalendarOutlined />,
};

const Dashboard = () => {
  const { data, isLoading, isError } = useGetDashboardQuery(undefined, { pollingInterval: 30000 });

  // First-ever load with no cached data yet
  if (isLoading && !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" tip="Loading dashboard…" />
      </div>
    );
  }

  // No data at all (never loaded successfully) — hard error
  if (!data) {
    return <Alert type="error" message="Failed to load dashboard data. Make sure the backend is running." style={{ margin: 24 }} />;
  }

  const { kpis, sourcingData, funnelData, qualityData, recentActivity } = data;

  const pieConfig = {
    data: sourcingData.length ? sourcingData : [{ type: 'No data', value: 1 }],
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.6,
    label: { text: 'value', style: { fontWeight: 'bold' } },
    legend: { position: 'bottom' },
    color: ({ type }) => SOURCE_COLORS[type] ?? '#6366f1',
  };

  const funnelConfig = {
    data: funnelData,
    xField: 'stage',
    yField: 'count',
    label: { text: 'count', position: 'right' },
    color: '#2563eb',
  };

  const qualityConfig = {
    data: qualityData,
    xField: 'stage',
    yField: 'value',
    colorField: 'source',
    stack: true,
    label: { text: 'value', position: 'inside' },
  };

  const kpiCards = [
    {
      title:  'New Candidates (7 days)',
      value:  kpis.totalCandidatesThisWeek,
      icon:   <UserOutlined />,
      color:  kpis.totalCandidatesThisWeek > 0 ? '#3f8600' : '#8c8c8c',
      arrow:  kpis.totalCandidatesThisWeek > 0 ? <ArrowUpOutlined /> : null,
    },
    {
      title:  'Active Job Openings',
      value:  kpis.activeOpenings,
      icon:   <TeamOutlined />,
      color:  kpis.activeOpenings > 0 ? '#2563eb' : '#8c8c8c',
      arrow:  null,
    },
    {
      title:  'Interview → Offer Rate (%)',
      value:  kpis.offerAcceptRate,
      suffix: '%',
      icon:   <CheckCircleOutlined />,
      color:  kpis.offerAcceptRate >= 50 ? '#3f8600' : '#cf1322',
      arrow:  kpis.offerAcceptRate >= 50 ? <ArrowUpOutlined /> : <ArrowDownOutlined />,
    },
    {
      title:  'Applicant → Screening Pass (%)',
      value:  kpis.screeningPassRate,
      suffix: '%',
      icon:   <CheckCircleOutlined />,
      color:  kpis.screeningPassRate >= 50 ? '#3f8600' : '#cf1322',
      arrow:  kpis.screeningPassRate >= 50 ? <ArrowUpOutlined /> : <ArrowDownOutlined />,
    },
  ];

  return (
    <Row gutter={[24, 24]} style={{ width: '100%', padding: '16px' }}>
      {/* Stale-data warning — only shown when a background poll fails but we still have data */}
      {isError && (
        <Col span={24}>
          <Alert
            type="warning"
            message="Could not reach the server — showing last known data. Dashboard will refresh automatically when the connection is restored."
            closable
            showIcon
            style={{ marginBottom: 0 }}
          />
        </Col>
      )}
      {/* KPI Cards */}
      {kpiCards.map((kpi) => (
        <Col key={kpi.title} xs={24} md={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title={<span style={{ display: 'block', textAlign: 'center' }}>{kpi.title}</span>}
              value={kpi.value}
              suffix={kpi.suffix}
              prefix={kpi.arrow}
              valueStyle={{ color: kpi.color, fontSize: 26, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              style={{ textAlign: 'center' }}
            />
          </Card>
        </Col>
      ))}

      {/* Sourcing Pie */}
      <Col xs={24} md={8}>
        <Card title="Candidate Sourcing Channels" style={{ borderRadius: 8, height: 360 }}>
          <div style={{ height: 260 }}>
            {sourcingData.length ? <Pie {...pieConfig} /> : <Empty description="No candidate data yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </div>
        </Card>
      </Col>

      {/* Recruitment Funnel */}
      <Col xs={24} md={16}>
        <Card title="Recruitment Pipeline Funnel" style={{ borderRadius: 8, height: 360 }}>
          <div style={{ height: 260 }}>
            {funnelData.some((d) => d.count > 0)
              ? <Bar {...funnelConfig} />
              : <Empty description="No pipeline data yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </div>
        </Card>
      </Col>

      {/* Source Quality Matrix */}
      <Col xs={24} md={16}>
        <Card title="Sourcing Platform Quality Matrix (By Stage)" style={{ borderRadius: 8, height: 420 }}>
          <div style={{ height: 320 }}>
            {qualityData.length
              ? <Column {...qualityConfig} />
              : <Empty description="No stage progression data yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </div>
        </Card>
      </Col>

      {/* Recent Activity */}
      <Col xs={24} md={8}>
        <Card title="Recent Activity" style={{ borderRadius: 8, height: 420, overflowY: 'auto' }}>
          {recentActivity.length === 0 ? (
            <Empty description="No recent activity" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            recentActivity.map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <hr style={{ border: '0.5px solid #f0f0f0', margin: '10px 0' }} />}
                <div style={{ padding: '4px 0' }}>
                  <Tag color={ACTIVITY_COLORS[item.type]} icon={ACTIVITY_ICONS[item.type]}>
                    {item.label}
                  </Tag>
                  <br />
                  <Text strong>{item.name}</Text>
                  {item.detail && <Text type="secondary"> — {item.detail}</Text>}
                  {item.ts && (
                    <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
                      {new Date(item.ts).toLocaleString()}
                    </div>
                  )}
                </div>
              </React.Fragment>
            ))
          )}
        </Card>
      </Col>
    </Row>
  );
};

export default Dashboard;
