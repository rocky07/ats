import React from 'react';
import { Button, Modal, Descriptions, Tag, Tooltip, Space, message } from 'antd';
import { DownloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useGetResumeUrlQuery, useReparseWithAiMutation } from '../redux/candidateApi';
import EditableCandidateField from './EditableCandidateField';

const ResumeDownloadButton = ({ candidateId }) => {
  const { data, isFetching, isError } = useGetResumeUrlQuery(candidateId, { skip: !candidateId });

  const handleDownload = () => {
    if (data?.url) window.open(data.url, '_blank');
  };

  if (isError) return <Tooltip title="No resume on file"><Button icon={<DownloadOutlined />} disabled>Download Resume</Button></Tooltip>;

  return (
    <Button
      icon={<DownloadOutlined />}
      loading={isFetching}
      onClick={handleDownload}
      disabled={!data?.url}
    >
      Download Resume
    </Button>
  );
};

// Shared candidate profile modal — used from the Candidates list and the
// Requirement Details pipeline table so clicking a candidate anywhere shows the same view.
const CandidateProfileModal = ({ candidate, open, onClose, onCandidateUpdate }) => {
  const [reparseWithAi, { isLoading: isReparsingWithAi }] = useReparseWithAiMutation();

  const handleReparseWithAi = async () => {
    try {
      const updated = await reparseWithAi(candidate.id).unwrap();
      onCandidateUpdate?.(updated);
      message.success('Resume parsed with Claude — profile updated');
    } catch (e) {
      message.error(e?.data?.error ?? 'Failed to parse resume with Claude');
    }
  };

  return (
    <Modal
      title="Candidate Profile Details"
      open={open}
      onCancel={onClose}
      footer={[
        candidate?.resumeS3Key
          ? <ResumeDownloadButton key="download" candidateId={candidate.id} />
          : null,
        <Tooltip
          key="parse-tooltip"
          title={candidate?.aiParsed ? 'Already parsed with Claude' : (!candidate?.resumeS3Key ? 'No resume on file' : '')}
        >
          <Button
            icon={<ThunderboltOutlined />}
            loading={isReparsingWithAi}
            disabled={!!candidate?.aiParsed || !candidate?.resumeS3Key}
            onClick={handleReparseWithAi}
          >
            Parse with Claude
          </Button>
        </Tooltip>,
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>,
      ].filter(Boolean)}
      width={800}
      destroyOnClose
    >
      {candidate && (
        <div style={{ marginTop: 16 }}>
          {/* Summary banner — only shown when AI-parsed */}
          {candidate.summary && (
            <div style={{
              background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 6,
              padding: '10px 14px', marginBottom: 16, color: '#1d3557', fontSize: 13,
            }}>
              {candidate.summary}
            </div>
          )}

          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Full Name" span={2}>
              <strong>{candidate.name || 'N/A'}</strong>
              {candidate.title && (
                <span style={{ marginLeft: 8, color: '#6b7280', fontWeight: 400 }}>
                  — {candidate.title}
                </span>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              <EditableCandidateField candidate={candidate} field="email" placeholder="Email" onSaved={onCandidateUpdate} />
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              <EditableCandidateField candidate={candidate} field="phone" placeholder="Phone" onSaved={onCandidateUpdate} />
            </Descriptions.Item>
            {candidate.location && (
              <Descriptions.Item label="Location">{candidate.location}</Descriptions.Item>
            )}
            {candidate.yearsOfExperience > 0 && (
              <Descriptions.Item label="Experience">
                {candidate.yearsOfExperience} year{candidate.yearsOfExperience !== 1 ? 's' : ''}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Source">{candidate.source || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Date Added">{candidate.date || 'N/A'}</Descriptions.Item>

            <Descriptions.Item label="Skills" span={2}>
              <Space size={[4, 8]} wrap>
                {(candidate.skills || []).length > 0 ? (
                  candidate.skills.map((skill) => (
                    <Tag color="blue" key={skill}>{skill}</Tag>
                  ))
                ) : (
                  <span style={{ color: '#9ca3af' }}>No parsed skills found</span>
                )}
              </Space>
            </Descriptions.Item>

            {(candidate.certifications || []).length > 0 && (
              <Descriptions.Item label="Certifications" span={2}>
                <Space size={[4, 8]} wrap>
                  {candidate.certifications.map((c) => (
                    <Tag color="green" key={c}>{c}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}

            {(candidate.languages || []).length > 0 && (
              <Descriptions.Item label="Languages" span={2}>
                {candidate.languages.join(', ')}
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Work Experience */}
          {(candidate.experience || []).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>Work Experience</div>
              {candidate.experience.map((exp, i) => (
                <div key={i} style={{
                  borderLeft: '3px solid #6366f1', paddingLeft: 12, marginBottom: 12,
                }}>
                  <div style={{ fontWeight: 600 }}>{exp.title} <span style={{ color: '#6b7280', fontWeight: 400 }}>@ {exp.company}</span></div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>{exp.startDate} – {exp.endDate}</div>
                  {exp.description && <div style={{ fontSize: 13 }}>{exp.description}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Education */}
          {(candidate.education || []).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>Education</div>
              {candidate.education.map((edu, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 500 }}>{edu.degree}</span>
                  {edu.institution && <span style={{ color: '#6b7280' }}> — {edu.institution}</span>}
                  {edu.year && <span style={{ color: '#9ca3af', fontSize: 12 }}> ({edu.year})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default CandidateProfileModal;
