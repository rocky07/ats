import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Divider, Space, Tag } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';

const { Title, Text } = Typography;

const LoginPage = () => {
  const { login, cognitoConfigured } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onFinish = async ({ email, password }) => {
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message ?? 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <Card style={{ width: '100%', maxWidth: 420, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Logo / brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #2563eb, #1e3a5f)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            <SafetyOutlined style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: '0 0 4px' }}>Bourntec ATS</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Applicant Tracking System</Text>
        </div>

        {!cognitoConfigured && (
          <Alert
            type="info"
            showIcon
            message="Development Mode"
            description="Cognito is not configured. Using local authentication."
            style={{ marginBottom: 20, fontSize: 12 }}
          />
        )}

        {cognitoConfigured && (
          <Space style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
            <Tag icon={<SafetyOutlined />} color="blue">Secured by AWS Cognito</Tag>
          </Space>
        )}

        {error && (
          <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
        )}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Enter your email' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input
              size="large"
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="you@yourcompany.com"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Enter your password' }]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{ backgroundColor: '#2563eb', height: 46, fontSize: 15 }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <Divider />
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', fontSize: 12 }}>
          Contact your administrator to get access.
        </Text>
      </Card>
    </div>
  );
};

export default LoginPage;
