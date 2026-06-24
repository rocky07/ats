import React, { useState } from 'react';
import { Button, Card, Input, Space, Pagination } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

// Mock candidate dataset (would come from an API in production)
const CANDIDATES = Array.from({ length: 23 }, (_, idx) => ({
  id: idx + 1,
  name: [
    'Janon Belha', 'Janon Brayar', 'Janon Karvez', 'Janon Billyon', 'Janon Town',
    'Maria Lopez', 'Aiden Clark', 'Priya Nair', 'Lucas Meyer', 'Sara Khan',
  ][idx % 10] + ` ${Math.floor(idx / 10) + 1}`,
  email: `user${idx}@example.com`,
  source: idx % 2 === 0 ? 'Upload' : 'LinkedIn',
  date: '12/11/2022',
  skills: ['Skill 1', 'Skill 2'],
}));

const Candidates = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const start = (page - 1) * pageSize;
  const pagedCandidates = CANDIDATES.slice(start, start + pageSize);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Input
          placeholder="Search candidates"
          style={{ width: 400, borderRadius: 4 }}
          prefix={<SearchOutlined />}
        />

        <Button type="primary" style={{ backgroundColor: '#2563eb', height: 40, paddingInline: 24 }}>
          Upload Resume
        </Button>
      </div>

      <Card bordered={false} style={{ background: '#fff', borderRadius: 8 }}>
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
              {pagedCandidates.map((candidate) => (
                <tr key={candidate.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 12 }}><strong>{candidate.name}</strong></td>
                  <td style={{ padding: 12 }}>{candidate.email}</td>
                  <td style={{ padding: 12 }}>{candidate.source}</td>
                  <td style={{ padding: 12 }}>{candidate.date}</td>
                  <td style={{ padding: 12 }}>
                    <Space size={4}>
                      {candidate.skills.map((skill) => (
                        <span key={skill} style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: '#f0f0f0', borderRadius: 4, fontSize: 11 }}>{skill}</span>
                      ))}
                    </Space>
                  </td>
                  <td style={{ padding: 12 }}>
                    <Space size={8}>
                      <Button
                        size="small"
                        style={{ borderColor: '#000', color: '#000', border: '1px solid #000', height: 32, background: 'transparent' }}
                      >
                        View Profile
                      </Button>
                      <Button
                        size="small"
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
            total={CANDIDATES.length}
            showSizeChanger
            pageSizeOptions={[5, 10, 20, 50]}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} candidates`}
            onChange={(nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            }}
          />
        </div>
      </Card>
    </>
  );
};

export default Candidates;
