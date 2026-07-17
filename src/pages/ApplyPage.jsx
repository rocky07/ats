import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card, Typography, Form, Input, Button, Upload, Alert, Spin, Result, Tag, Space, InputNumber,
} from 'antd';
import { UploadOutlined, LinkedinOutlined, SendOutlined } from '@ant-design/icons';
import ReCAPTCHA from 'react-google-recaptcha';
import 'react-quill-new/dist/quill.snow.css';
import { API_BASE_URL } from '../config';

const { Title, Text, Paragraph } = Typography;

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '';

const ApplyPage = () => {
  const { reqId } = useParams();
  const [job, setJob]               = useState(null);
  const [jobError, setJobError]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetch(`${API_BASE_URL}/public/jobs/${reqId}`)
      .then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      })
      .then((data) => { setJob(data); setLoading(false); })
      .catch((e) => { setJobError(e.error ?? 'Job not found'); setLoading(false); });
  }, [reqId]);

  const onFinish = async (values) => {
    if (SITE_KEY && !captchaToken) {
      setSubmitError('Please complete the CAPTCHA before submitting.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const fd = new FormData();
      if (values.name)  fd.append('name',  values.name);
      if (values.email) fd.append('email', values.email);
      if (values.resume?.file) fd.append('resume', values.resume.file);
      if (captchaToken) fd.append('g-recaptcha-response', captchaToken);

      const skillExperience = {};
      (job.mustHaves ?? []).forEach((skill) => {
        skillExperience[skill] = Number(values.skillExperience?.[skill] ?? 0);
      });
      fd.append('skillExperience', JSON.stringify(skillExperience));

      const res = await fetch(`${API_BASE_URL}/public/jobs/${reqId}/apply`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Submission failed');
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message);
      // Reset CAPTCHA on failure so the user can retry
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (jobError) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <Result status="404" title="Position Not Found" subTitle={jobError} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <Result
          status="success"
          title="Application Submitted!"
          subTitle="Thank you for applying. Our team will review your profile and get back to you soon."
        />
      </div>
    );
  }

  const EMPLOYMENT_TYPE_MAP = {
    'Full-time': 'FULL_TIME',
    W2: 'CONTRACTOR',
    C2C: 'CONTRACTOR',
    Contract: 'CONTRACTOR',
    'Contract-1099': 'CONTRACTOR',
  };

  // schema.org JobPosting — lets Google understand & index this listing for Google for Jobs.
  const jobPostingLd = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description || job.title,
    datePosted: job.openDate,
    hiringOrganization: { '@type': 'Organization', name: 'Bourntec' },
    employmentType: EMPLOYMENT_TYPE_MAP[job.jobType] ?? undefined,
    ...(job.workMode === 'Remote'
      ? { jobLocationType: 'TELECOMMUTE', applicantLocationRequirements: { '@type': 'Country', name: job.location || 'US' } }
      : job.location
        ? { jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location } } }
        : {}),
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingLd) }} />

      {/* Header */}
      <div style={{ maxWidth: 640, width: '100%', marginBottom: 24, textAlign: 'center' }}>
        <Space>
          <LinkedinOutlined style={{ fontSize: 28, color: '#0A66C2' }} />
          <Title level={3} style={{ margin: 0 }}>Job Application</Title>
        </Space>
      </div>

      {/* Job detail card */}
      <Card style={{ maxWidth: 640, width: '100%', borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <Title level={4} style={{ marginBottom: 4 }}>{job.title}</Title>
        {job.department && <Tag color="blue" style={{ marginBottom: 12 }}>{job.department}</Tag>}
        {job.description && (
          <div
            className="ql-editor"
            style={{ padding: 0, marginBottom: 0, color: 'rgba(0,0,0,0.45)' }}
            dangerouslySetInnerHTML={{ __html: job.description }}
          />
        )}
      </Card>

      {/* Application form */}
      <Card
        title="Submit Your Application"
        style={{ maxWidth: 640, width: '100%', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
      >
        {submitError && <Alert type="error" message={submitError} style={{ marginBottom: 16 }} closable onClose={() => setSubmitError(null)} />}

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Full Name">
            <Input placeholder="Your full name" size="large" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email Address"
            rules={[{ type: 'email', message: 'Enter a valid email' }]}
          >
            <Input placeholder="you@example.com" size="large" />
          </Form.Item>

          <Form.Item
            name="resume"
            label="Resume / CV"
            extra="Upload PDF or DOCX. We'll extract your details automatically."
          >
            <Upload
              beforeUpload={() => false}
              maxCount={1}
              accept=".pdf,.doc,.docx"
            >
              <Button icon={<UploadOutlined />} size="large">Choose File</Button>
            </Upload>
          </Form.Item>

          {(job.mustHaves ?? []).length > 0 && (
            <Card size="small" type="inner" title="Must-Have Skills" style={{ marginBottom: 20 }}>
              <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
                Enter your years of experience for each required skill below.
              </Paragraph>
              {job.mustHaves.map((skill) => (
                <Form.Item
                  key={skill}
                  name={['skillExperience', skill]}
                  label={skill}
                  initialValue={0}
                  style={{ marginBottom: 12 }}
                >
                  <InputNumber min={0} max={50} style={{ width: '100%' }} addonAfter="years" />
                </Form.Item>
              ))}
            </Card>
          )}

          {/* CAPTCHA — only rendered when site key is configured */}
          {SITE_KEY ? (
            <Form.Item label={null} style={{ marginBottom: 20 }}>
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={SITE_KEY}
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </Form.Item>
          ) : null}

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={submitting}
              icon={<SendOutlined />}
              block
              disabled={SITE_KEY ? !captchaToken : false}
              style={{ background: '#0A66C2' }}
            >
              Submit Application
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Text type="secondary" style={{ marginTop: 24, fontSize: 12 }}>
        Your information is kept confidential and used only for this application.
      </Text>
    </div>
  );
};

export default ApplyPage;
