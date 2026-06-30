import React, { useState } from 'react';
import {
  Button, Card, Input, Space, Table, Tag, Modal, Upload, Typography,
  message, Segmented, List, Empty, Select, Popconfirm, Spin,
} from 'antd';
import {
  SearchOutlined, ImportOutlined, InboxOutlined, PlusOutlined,
  DeleteOutlined, AppstoreOutlined, EditOutlined, CheckOutlined, CloseOutlined,
} from '@ant-design/icons';
import {
  useGetVendorsQuery, useCreateVendorMutation, useUpdateVendorMutation,
  useDeleteVendorMutation, useBulkImportVendorsMutation,
  useGetGroupsQuery, useCreateGroupMutation, useUpdateGroupMutation, useDeleteGroupMutation,
} from '../redux/vendorApi';

const { Text } = Typography;
const ALL_VENDORS = 'All Vendors';
const STATUS_COLORS = { Active: 'green', Pending: 'gold', Inactive: 'default' };
const STATUS_OPTIONS = ['Active', 'Pending', 'Inactive'];

// ── Inline-editable cell helpers ──────────────────────────────────────────────

const StatusCell = ({ vendor, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(vendor.status);

  const save = async (newVal) => {
    setVal(newVal);
    setEditing(false);
    await onSave({ id: vendor.id, status: newVal });
  };

  if (editing) {
    return (
      <Select
        value={val}
        size="small"
        autoFocus
        style={{ width: 110 }}
        options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
        onChange={save}
        onBlur={() => setEditing(false)}
      />
    );
  }
  return (
    <Tag
      color={STATUS_COLORS[vendor.status]}
      style={{ cursor: 'pointer' }}
      onClick={() => setEditing(true)}
    >
      {vendor.status}
    </Tag>
  );
};

const GroupCell = ({ vendor, groups, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(vendor.group ?? null);

  const save = async (newVal) => {
    setVal(newVal);
    setEditing(false);
    await onSave({ id: vendor.id, group: newVal });
  };

  if (editing) {
    return (
      <Select
        value={val}
        size="small"
        autoFocus
        allowClear
        placeholder="None"
        style={{ width: 160 }}
        options={groups.map((g) => ({ value: g, label: g }))}
        onChange={save}
        onClear={() => save(null)}
        onBlur={() => setEditing(false)}
      />
    );
  }
  return (
    <span style={{ cursor: 'pointer' }} onClick={() => setEditing(true)}>
      {vendor.group
        ? <Tag color="blue">{vendor.group}</Tag>
        : <Text type="secondary" style={{ fontSize: 12 }}>— click to assign</Text>}
    </span>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const Vendors = () => {
  const [search,      setSearch]      = useState('');
  const [activeTab,   setActiveTab]   = useState(ALL_VENDORS);
  const [importOpen,  setImportOpen]  = useState(false);
  const [manageOpen,  setManageOpen]  = useState(false);
  const [newGroup,    setNewGroup]    = useState('');
  const [editingGroup, setEditingGroup] = useState(null); // { name, draft }

  const { data: vendors  = [], isLoading: loadingVendors } = useGetVendorsQuery();
  const { data: groups   = [], isLoading: loadingGroups  } = useGetGroupsQuery();

  const [updateVendor]      = useUpdateVendorMutation();
  const [deleteVendor]      = useDeleteVendorMutation();
  const [bulkImport]        = useBulkImportVendorsMutation();
  const [createGroup]       = useCreateGroupMutation();
  const [updateGroup]       = useUpdateGroupMutation();
  const [deleteGroup]       = useDeleteGroupMutation();

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = vendors.filter((v) => {
    if (activeTab !== ALL_VENDORS && v.group !== activeTab) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      v.name.toLowerCase().includes(q) ||
      (v.email ?? '').toLowerCase().includes(q) ||
      (v.phone ?? '').includes(q) ||
      (v.company ?? '').toLowerCase().includes(q)
    );
  });

  // ── Inline save ───────────────────────────────────────────────────────────

  const handleCellSave = async (patch) => {
    try {
      await updateVendor(patch).unwrap();
    } catch {
      message.error('Failed to save change');
    }
  };

  // ── Group management ──────────────────────────────────────────────────────

  const handleAddGroup = async () => {
    const name = newGroup.trim();
    if (!name) return;
    try {
      await createGroup(name).unwrap();
      setNewGroup('');
      message.success(`Group "${name}" added`);
    } catch (e) {
      message.error(e?.data?.error ?? 'Failed to add group');
    }
  };

  const handleRenameGroup = async (oldName) => {
    const newName = editingGroup?.draft?.trim();
    if (!newName || newName === oldName) { setEditingGroup(null); return; }
    try {
      await updateGroup({ oldName, newName }).unwrap();
      if (activeTab === oldName) setActiveTab(newName);
      setEditingGroup(null);
      message.success(`Renamed to "${newName}"`);
    } catch (e) {
      message.error(e?.data?.error ?? 'Failed to rename group');
    }
  };

  const handleDeleteGroup = async (name) => {
    try {
      await deleteGroup(name).unwrap();
      if (activeTab === name) setActiveTab(ALL_VENDORS);
      message.success(`Group "${name}" deleted`);
    } catch (e) {
      message.error(e?.data?.error ?? 'Group is in use — reassign vendors first');
    }
  };

  // ── CSV import ────────────────────────────────────────────────────────────

  const parseOutlookCsv = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];

    const parseLine = (line) => {
      const fields = [];
      let cur = '';
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuote = !inQuote; continue; }
        if (ch === ',' && !inQuote) { fields.push(cur); cur = ''; continue; }
        cur += ch;
      }
      fields.push(cur);
      return fields;
    };

    const headers = parseLine(lines[0]).map((h) => h.trim());
    const idx = (name) => headers.indexOf(name);

    const iFirstName  = idx('First Name');
    const iMiddleName = idx('Middle Name');
    const iLastName   = idx('Last Name');
    const iEmail      = idx('E-mail Address');
    const iEmail2     = idx('E-mail 2 Address');
    const iBusinessPh = idx('Business Phone');
    const iMobilePh   = idx('Mobile Phone');
    const iCompany    = idx('Company');

    const contacts = [];
    for (let i = 1; i < lines.length; i++) {
      const f = parseLine(lines[i]);
      const parts = [f[iFirstName], f[iMiddleName], f[iLastName]].filter(Boolean);
      const name    = parts.join(' ').trim();
      const email   = (f[iEmail] ?? f[iEmail2] ?? '').trim();
      const phone   = (f[iBusinessPh] ?? f[iMobilePh] ?? '').trim();
      const company = (f[iCompany] ?? '').trim();
      if (!name && !email) continue;
      contacts.push({ name: name || email, email, phone, company });
    }
    return contacts;
  };

  const handleImportFile = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const contacts = parseOutlookCsv(e.target.result);
      if (!contacts.length) { message.warning('No valid contacts found'); return; }
      try {
        await bulkImport(contacts).unwrap();
        message.success(`${file.name} imported — ${contacts.length} contact(s) added`);
        setImportOpen(false);
      } catch {
        message.error('Import failed');
      }
    };
    reader.readAsText(file);
    return false;
  };

  // ── Table columns ─────────────────────────────────────────────────────────

  const columns = [
    {
      title: 'Vendor Name',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name) => <Text strong>{name}</Text>,
    },
    { title: 'Email', dataIndex: 'email', render: (v) => v || <Text type="secondary">—</Text> },
    { title: 'Phone', dataIndex: 'phone', render: (v) => v || <Text type="secondary">—</Text> },
    { title: 'Company', dataIndex: 'company', sorter: (a, b) => (a.company ?? '').localeCompare(b.company ?? ''), render: (v) => v || <Text type="secondary">—</Text> },
    {
      title: 'Group',
      dataIndex: 'group',
      render: (_, record) => (
        <GroupCell vendor={record} groups={groups} onSave={handleCellSave} />
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      filters: STATUS_OPTIONS.map((s) => ({ text: s, value: s })),
      onFilter: (value, record) => record.status === value,
      render: (_, record) => (
        <StatusCell vendor={record} onSave={handleCellSave} />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_, record) => (
        <Popconfirm
          title="Delete this vendor?"
          onConfirm={async () => {
            try { await deleteVendor(record.id).unwrap(); message.success('Vendor deleted'); }
            catch { message.error('Failed to delete'); }
          }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  if (loadingVendors) return <Spin />;

  return (
    <>
      {/* Group Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <Segmented
          value={activeTab}
          onChange={setActiveTab}
          options={[ALL_VENDORS, ...groups]}
        />
        <Button icon={<AppstoreOutlined />} onClick={() => setManageOpen(true)}>
          Manage Groups
        </Button>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <Input
          placeholder="Search by name, email, phone or company"
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

      {/* Import Modal */}
      <Modal
        title="Import Microsoft Contacts"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        footer={<Button onClick={() => setImportOpen(false)}>Cancel</Button>}
        destroyOnClose
      >
        <Upload.Dragger multiple={false} showUploadList={false} accept=".csv" beforeUpload={handleImportFile}>
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Click or drag a contacts CSV here</p>
          <p className="ant-upload-hint">Export from Outlook / Microsoft People as CSV, then drop the file here.</p>
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

        {loadingGroups ? <Spin /> : groups.length === 0 ? (
          <Empty description="No custom groups" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
            bordered
            dataSource={groups}
            renderItem={(group) => {
              const isEditing = editingGroup?.name === group;
              const inUse = vendors.some((v) => v.group === group);
              return (
                <List.Item
                  actions={isEditing ? [
                    <Button key="ok" type="text" icon={<CheckOutlined />} onClick={() => handleRenameGroup(group)} />,
                    <Button key="cancel" type="text" icon={<CloseOutlined />} onClick={() => setEditingGroup(null)} />,
                  ] : [
                    <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => setEditingGroup({ name: group, draft: group })} />,
                    <Popconfirm
                      key="del"
                      title={inUse ? 'This group has vendors. Reassign them first.' : `Delete "${group}"?`}
                      onConfirm={() => !inUse && handleDeleteGroup(group)}
                      okButtonProps={{ disabled: inUse }}
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <Space>
                    <AppstoreOutlined />
                    {isEditing ? (
                      <Input
                        size="small"
                        value={editingGroup.draft}
                        onChange={(e) => setEditingGroup((prev) => ({ ...prev, draft: e.target.value }))}
                        onPressEnter={() => handleRenameGroup(group)}
                        autoFocus
                        style={{ width: 180 }}
                      />
                    ) : (
                      group
                    )}
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
