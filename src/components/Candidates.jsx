import React, { useRef, useState } from 'react';
import { Button, Card, Input, Space, Pagination, message, Spin, Modal, Descriptions, Tag, Tooltip } from 'antd';
import { SearchOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import {
  useGetAllCandidatesQuery,
  useUploadResumeMutation,
  useDeleteCandidateMutation,
  useGetResumeUrlQuery,
} from '../redux/candidateApi';

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

const Candidates = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef(null);

  // Modal and profile states
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: candidates = [], isLoading, isFetching } = useGetAllCandidatesQuery();
  const [uploadResume, { isLoading: isUploading }] = useUploadResumeMutation();
  const [deleteCandidate] = useDeleteCandidateMutation();

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleViewProfile = (candidate) => {
    setSelectedCandidate(candidate);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleFileChange = async (event) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    
    if (files.length === 0) return;

    const hideLoadingMessage = files.length > 1 ? message.loading(`Uploading ${files.length} resumes...`, 0) : null;

    const uploadPromises = files.map(async (file) => {
      try {
        const candidate = await uploadResume(file).unwrap();
        return { status: 'fulfilled', name: candidate.name || file.name };
      } catch (err) {
        return { status: 'rejected', name: file.name, error: err };
      }
    });

    const results = await Promise.all(uploadPromises);
    if (hideLoadingMessage) hideLoadingMessage();

    let successCount = 0;
    let duplicateCount = 0;
    let failCount = 0;

    results.forEach((res) => {
      if (res.status === 'fulfilled') {
        successCount++;
        if (results.length === 1) {
          message.success(`Parsed resume for ${res.name}`);
        }
      } else {
        const err = res.error;
        if (err?.status === 409) {
          duplicateCount++;
          if (results.length === 1) {
            message.warning(err.data?.error || `Duplicate candidate: ${res.name} — rejected`);
          }
        } else {
          failCount++;
          if (results.length === 1) {
            message.error(`Failed to upload and parse resume for ${res.name}`);
          }
        }
      }
    });

    if (results.length > 1) {
      if (successCount > 0) message.success(`Successfully uploaded ${successCount} resume(s).`);
      if (duplicateCount > 0) message.warning(`${duplicateCount} duplicate resume(s) were rejected.`);
      if (failCount > 0) message.error(`Failed to upload ${failCount} resume(s).`);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCandidate(id).unwrap();
      message.success('Candidate deleted');
    } catch (err) {
      console.error('Delete failed:', err);
      message.error('Failed to delete candidate');
    }
  };

  const filtered = candidates.filter((c) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      (c.skills || []).some((s) => s.toLowerCase().includes(term))
    );
  });

  const start = (page - 1) * pageSize;
  const pagedCandidates = filtered.slice(start, start + pageSize);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Input
          placeholder="Search candidates"
          style={{ width: 400, borderRadius: 4 }}
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <Button
          type="primary"
          icon={<UploadOutlined />}
          loading={isUploading}
          onClick={handleUploadClick}
          style={{ backgroundColor: '#2563eb', height: 40, paddingInline: 24 }}
        >
          Upload Resumes
        </Button>
      </div>

      <Card bordered={false} style={{ background: '#fff', borderRadius: 8 }}>
        <Spin spinning={isLoading || isFetching}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', fontSize: 11 }}>Name</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', fontSize: 11 }}>Email</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', fontSize: 11 }}>Source</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', fontSize: 11 }}>Ingested Date</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', fontSize: 11 }}>Skills</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', fontSize: 11 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedCandidates.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
                      No candidates yet. Upload a resume to get started.
                    </td>
                  </tr>
                )}
                {pagedCandidates.map((candidate) => (
                  <tr key={candidate.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: 12 }}><strong>{candidate.name}</strong></td>
                    <td style={{ padding: 12 }}>{candidate.email}</td>
                    <td style={{ padding: 12 }}>{candidate.source}</td>
                    <td style={{ padding: 12 }}>{candidate.date}</td>
                    <td style={{ padding: 12 }}>
                      <Space size={4} wrap>
                        {(candidate.skills || []).map((skill) => (
                          <span key={skill} style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: '#f0f0f0', borderRadius: 4, fontSize: 11 }}>{skill}</span>
                        ))}
                      </Space>
                    </td>
                    <td style={{ padding: 12 }}>
                      <Space size={8}>
                        <Button
                          size="small"
                          onClick={() => handleViewProfile(candidate)}
                          style={{ borderColor: '#000', color: '#000', border: '1px solid #000', height: 32, background: 'transparent' }}
                        >
                          View Profile
                        </Button>
                        <Button
                          size="small"
                          onClick={() => handleDelete(candidate.id)}
                          style={{ borderColor: '#ef4444', color: '#ef4444', border: '1px solid #ef4444', height: 32, background: 'transparent' }}
                        >
                          Delete
                        </Button>
                      </Space>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Pagination
              current={page}
              pageSize={pageSize}
              total={filtered.length}
              showSizeChanger
              pageSizeOptions={[5, 10, 20, 50]}
              showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} candidates`}
              onChange={(nextPage, nextSize) => {
                setPage(nextPage);
                setPageSize(nextSize);
              }}
            />
          </div>
        </Spin>
      </Card>

      {/* Profile Details Modal Screen */}
      <Modal
        title="Candidate Profile Details"
        open={isModalOpen}
        onCancel={handleCloseModal}
        afterClose={() => setSelectedCandidate(null)}
        footer={[
          selectedCandidate?.resumeS3Key
            ? <ResumeDownloadButton key="download" candidateId={selectedCandidate.id} />
            : null,
          <Button key="close" type="primary" onClick={handleCloseModal}>
            Close
          </Button>,
        ].filter(Boolean)}
        width={800}
        destroyOnClose
      >
        {selectedCandidate && (
          <div style={{ marginTop: 16 }}>
            {/* Summary banner — only shown when AI-parsed */}
            {selectedCandidate.summary && (
              <div style={{
                background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 6,
                padding: '10px 14px', marginBottom: 16, color: '#1d3557', fontSize: 13,
              }}>
                {selectedCandidate.summary}
              </div>
            )}

            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Full Name" span={2}>
                <strong>{selectedCandidate.name || 'N/A'}</strong>
                {selectedCandidate.title && (
                  <span style={{ marginLeft: 8, color: '#6b7280', fontWeight: 400 }}>
                    — {selectedCandidate.title}
                  </span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Email">{selectedCandidate.email || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedCandidate.phone || 'N/A'}</Descriptions.Item>
              {selectedCandidate.location && (
                <Descriptions.Item label="Location">{selectedCandidate.location}</Descriptions.Item>
              )}
              {selectedCandidate.yearsOfExperience > 0 && (
                <Descriptions.Item label="Experience">
                  {selectedCandidate.yearsOfExperience} year{selectedCandidate.yearsOfExperience !== 1 ? 's' : ''}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Source">{selectedCandidate.source || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Date Added">{selectedCandidate.date || 'N/A'}</Descriptions.Item>

              <Descriptions.Item label="Skills" span={2}>
                <Space size={[4, 8]} wrap>
                  {(selectedCandidate.skills || []).length > 0 ? (
                    selectedCandidate.skills.map((skill) => (
                      <Tag color="blue" key={skill}>{skill}</Tag>
                    ))
                  ) : (
                    <span style={{ color: '#9ca3af' }}>No parsed skills found</span>
                  )}
                </Space>
              </Descriptions.Item>

              {(selectedCandidate.certifications || []).length > 0 && (
                <Descriptions.Item label="Certifications" span={2}>
                  <Space size={[4, 8]} wrap>
                    {selectedCandidate.certifications.map((c) => (
                      <Tag color="green" key={c}>{c}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}

              {(selectedCandidate.languages || []).length > 0 && (
                <Descriptions.Item label="Languages" span={2}>
                  {selectedCandidate.languages.join(', ')}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Work Experience */}
            {(selectedCandidate.experience || []).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>Work Experience</div>
                {selectedCandidate.experience.map((exp, i) => (
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
            {(selectedCandidate.education || []).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>Education</div>
                {selectedCandidate.education.map((edu, i) => (
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
    </>
  );
};

export default Candidates;