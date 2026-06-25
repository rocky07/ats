import React, { useState } from 'react';
import { Button, Card, Input, Space, Table, Tag, Modal, Upload, Typography, message, Segmented, List, Empty } from 'antd';
import { SearchOutlined, ImportOutlined, InboxOutlined, PlusOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';

const { Text } = Typography;

const ALL_VENDORS = 'All Vendors';

// Mock vendor data (would come from an API in production)
const INITIAL_VENDORS = [
  { id: 1, name: 'John Carter', email: 'john.carter@techstaff.com', company: 'TechStaff Solutions', status: 'Active', group: 'IT Recruiters' },
  { id: 2, name: 'Aisha Rahman', email: 'aisha@globalhire.com', company: 'GlobalHire Inc.', status: 'Active', group: 'Preferred Partners' },
  { id: 3, name: 'Miguel Santos', email: 'miguel.santos@nexustalent.com', company: 'Nexus Talent', status: 'Pending', group: 'IT Recruiters' },
  { id: 4, name: 'Wei Chen', email: 'wei.chen@brightpath.io', company: 'BrightPath Consulting', status: 'Inactive', group: 'Logistics' },
  { id: 5, name: 'Olivia Brown', email: 'olivia.brown@apexvendors.com', company: 'Apex Vendors', status: 'Active', group: 'Preferred Partners' },
];

const DEFAULT_GROUPS = ['Preferred Partners', 'IT Recruiters', 'Logistics'];

const STATUS_COLORS = { Active: 'green', Pending: 'gold', Inactive: 'default' };

const Vendors = () => {
  const [vendors, setVendors] = useState(INITIAL_VENDORS);
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [groups, setGroups] = useState(DEFAULT_GROUPS);
  const [activeTab, setActiveTab] = useState(ALL_VENDORS);
  const [manageOpen, setManageOpen] = useState(false);
  const [newGroup, setNewGroup] = useState('');

  const filtered = vendors.filter((v) => {
    // Group tab filter
    if (activeTab !== ALL_VENDORS && v.group !== activeTab) return false;
    // Search filter
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      v.name.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      v.company.toLowerCase().includes(q)
    );
  });

  // True if any vendor is currently assigned to the group
  const isGroupInUse = (group) => vendors.some((v) => v.group === group);

  const handleAddGroup = () => {
    const name = newGroup.trim();
    if (!name) return;
    if (name === ALL_VENDORS || groups.some((g) => g.toLowerCase() === name.toLowerCase())) {
      message.info(`Group "${name}" already exists`);
      return;
    }
    setGroups((prev) => [...prev, name]);
    setNewGroup('');
    message.success(`Group "${name}" added`);
  };

  const handleDeleteGroup = (group) => {
    if (isGroupInUse(group)) {
      message.warning(`"${group}" is in use and cannot be deleted`);
      return;
    }
    setGroups((prev) => prev.filter((g) => g !== group));
    if (activeTab === group) setActiveTab(ALL_VENDORS);
    message.success(`Group "${group}" deleted`);
  };

  // Simulate importing contacts from an uploaded file (CSV/vCard export from Microsoft)
  const handleImportFile = (file) => {
    const baseId = Date.now();
    const imported = [
      { id: baseId + 1, name: 'Imported Contact 1', email: 'contact1@outlook.com', company: 'Microsoft Import', status: 'Pending' },
      { id: baseId + 2, name: 'Imported Contact 2', email: 'contact2@outlook.com', company: 'Microsoft Import', status: 'Pending' },
    ];
    setVendors((prev) => [...imported, ...prev]);
    message.success(`${file.name} imported — ${imported.length} contacts added`);
    setImportOpen(false);
    return false; // prevent antd from actually uploading
  };

  const columns = [
    {
      title: 'Vendor Name',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name) => <Text strong>{name}</Text>,
    },
    { title: 'Email', dataIndex: 'email' },
    {
      title: 'Company',
      dataIndex: 'company',
      sorter: (a, b) => a.company.localeCompare(b.company),
    },
    {
      title: 'Group',
      dataIndex: 'group',
      render: (group) => (group ? <Tag color="blue">{group}</Tag> : <Text type="secondary">—</Text>),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      filters: [
        { text: 'Active', value: 'Active' },
        { text: 'Pending', value: 'Pending' },
        { text: 'Inactive', value: 'Inactive' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => <Tag color={STATUS_COLORS[status]}>{status}</Tag>,
    },
  ];

  return (
    <>
      {/* Group Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <Segmented
          value={activeTab}
          onChange={setActiveTab}
          options={[ALL_VENDORS, ...groups]}
        />
        <Button icon={<PlusOutlined />} onClick={() => setManageOpen(true)}>
          Manage Groups
        </Button>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <Input
          placeholder="Search vendors by name, email or company"
          style={{ width: 400, borderRadius: 4 }}
          prefix={<SearchOutlined />}
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          type="primary"
          icon={<ImportOutlined />}
          onClick={() => setImportOpen(true)}
          style={{ backgroundColor: '#2563eb', height: 40, paddingInline: 24 }}
        >
          Import Microsoft Contacts
        </Button>
      </div>

      {/* Main Table */}
      <Card bordered={false} style={{ background: '#fff', borderRadius: 8 }}>
        <Table
          rowKey="id"
          dataSource={filtered}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      {/* Import Contacts Modal */}
      <Modal
        title="Import Microsoft Contacts"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        footer={<Button onClick={() => setImportOpen(false)}>Cancel</Button>}
        destroyOnClose
      >
        <Upload.Dragger
          multiple={false}
          showUploadList={false}
          accept=".csv,.vcf"
          beforeUpload={handleImportFile}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Click or drag a contacts file here to import</p>
          <p className="ant-upload-hint">
            Export your contacts from Microsoft (Outlook / People) as CSV or vCard (.vcf), then drop the file here.
          </p>
        </Upload.Dragger>
      </Modal>

      {/* Manage Groups Modal */}
      <Modal
        title="Manage Groups"
        open={manageOpen}
        onCancel={() => setManageOpen(false)}
        footer={<Button onClick={() => setManageOpen(false)}>Done</Button>}
        destroyOnClose
      >
        <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
          <Input
            placeholder='New group name (e.g., "Java Specialists")'
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            onPressEnter={handleAddGroup}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddGroup} style={{ backgroundColor: '#2563eb' }}>
            Add
          </Button>
        </Space.Compact>

        {groups.length === 0 ? (
          <Empty description="No custom groups" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
            bordered
            dataSource={groups}
            renderItem={(group) => {
              const inUse = isGroupInUse(group);
              return (
                <List.Item
                  actions={[
                    <Button
                      key="delete"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={inUse}
                      title={inUse ? 'Group is in use and cannot be deleted' : 'Delete group'}
                      onClick={() => handleDeleteGroup(group)}
                    />,
                  ]}
                >
                  <Space>
                    <AppstoreOutlined />
                    {group}
                    {inUse && <Tag color="default">in use</Tag>}
                  </Space>
                </List.Item>
              );
            }}
          />
        )}
      </Modal>
    </>
  );
};

export default Vendors;
