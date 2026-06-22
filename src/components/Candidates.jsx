import React from 'react';
import { Button, Card, Input, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const Candidates = () => {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Input 
          placeholder="Search candidates" 
          style={{ width: 400, borderRadius: 4 }} 
          prefix={<SearchOutlined />}
        />
        <Button type="primary" style={{ backgroundColor: '#2563eb', height: 40, paddingInline: 24 }}>
          Trigger Ingest (Folder & API)
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
              {['Janon Belha', 'Janon Brayar', 'Janon Karvez', 'Janon Billyon', 'Janon Town'].map((name, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 12 }}><strong>{name}</strong></td>
                  <td style={{ padding: 12 }}>user{idx}@example.com</td>
                  <td style={{ padding: 12 }}>Upload</td>
                  <td style={{ padding: 12 }}>12/11/2022</td>
                  <td style={{ padding: 12 }}>
                    <Space size={4}>
                      <span style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: '#f0f0f0', borderRadius: 4, fontSize: 11 }}>Skill 1</span>
                      <span style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: '#f0f0f0', borderRadius: 4, fontSize: 11 }}>Skill 2</span>
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
      </Card>

      <Card bordered={false} style={{ background: '#fff', borderRadius: 8, marginTop: 24 }}>
        <h4 style={{ fontWeight: 600, marginBottom: 8 }}>Manage Ingest Sources</h4>
        <p style={{ color: '#6b7280' }}>Configure your data sources for candidate ingestion</p>
      </Card>
    </>
  );
};

export default Candidates;
