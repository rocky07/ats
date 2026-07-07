import React, { useRef, useState } from 'react';
import { Button, Card, Input, Space, Pagination, message, Spin, Tag, Tooltip } from 'antd';
import { SearchOutlined, UploadOutlined } from '@ant-design/icons';
import {
  useGetAllCandidatesQuery,
  useUploadResumeMutation,
  useDeleteCandidateMutation,
} from '../redux/candidateApi';
import CandidateProfileModal from './CandidateProfileModal';

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

      <CandidateProfileModal
        candidate={selectedCandidate}
        open={isModalOpen}
        onClose={handleCloseModal}
        onCandidateUpdate={setSelectedCandidate}
      />
    </>
  );
};

export default Candidates;