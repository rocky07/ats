import React, { useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm,
  Typography, Tooltip, message, Avatar, Empty,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, UserOutlined,
} from '@ant-design/icons';
import {
  useGetPanelMembersQuery,
  useAddPanelMemberMutation,
  useUpdatePanelMemberMutation,
  useRemovePanelMemberMutation,
} from '../redux/interviewApi';
import { useGetDepartmentsQuery } from '../redux/requirementsApi';

const { Title, Text } = Typography;

const REGION_OPTIONS = [
  { value: 'global', label: 'Global (All Regions)' },
  { value: 'india', label: 'India' },
  { value: 'middleeast', label: 'Middle East' },
  { value: 'us', label: 'US' },
];

const REGION_COLORS = {
  global: 'gold',
  india: 'green',
  middleeast: 'orange',
  us: 'blue',
};

const ROLE_COLORS = {
  'Tech Lead': 'blue',
  'Senior Engineer': 'green',
  'HR Manager': 'purple',
};

const InterviewPanel = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [form] = Form.useForm();

  const { data: panelMembers = [], isLoading } = useGetPanelMembersQuery({});
  const { data: departments = [] } = useGetDepartmentsQuery();
  const [addPanelMember, { isLoading: adding }] = useAddPanelMemberMutation();
  const [updatePanelMember, { isLoading: updating }] = useUpdatePanelMemberMutation();
  const [removePanelMember] = useRemovePanelMemberMutation();

  const openAdd = () => {
    setEditingMember(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (member) => {
    setEditingMember(member);
    form.setFieldsValue({
      name: member.name,
      email: member.email,
      role: member.role,
      departments: member.departments ?? [],
      regions: member.regions ?? [],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingMember) {
        await updatePanelMember({ id: editingMember.id, ...values }).unwrap();
        message.success('Panel member updated');
      } else {
        await addPanelMember(values).unwrap();
        message.success('Panel member added');
      }
      setModalOpen(false);
    } catch (err) {
      if (err?.data?.error) message.error(err.data.error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await removePanelMember(id).unwrap();
      message.success('Panel member removed');
    } catch {
      message.error('Failed to remove member');
    }
  };

  const columns = [
    {
      title: 'Member',
      key: 'member',
      render: (_, m) => (
        <Space>
          <Avatar style={{ backgroundColor: '#2563eb', fontSize: 14 }}>
            {m.name?.[0]?.toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ display: 'block', fontSize: 14 }}>{m.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{m.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={ROLE_COLORS[role] ?? 'default'}>{role || '—'}</Tag>
      ),
    },
    {
      title: 'Departments',
      dataIndex: 'departments',
      key: 'departments',
      render: (depts) =>
        depts?.length
          ? depts.map((d) => <Tag key={d} style={{ marginBottom: 2 }}>{d}</Tag>)
          : <Text type="secondary">All</Text>,
    },
    {
      title: 'Regions',
      dataIndex: 'regions',
      key: 'regions',
      render: (regions) =>
        regions?.length
          ? regions.map((r) => (
              <Tag key={r} color={REGION_COLORS[r] ?? 'default'} style={{ marginBottom: 2 }}>
                {REGION_OPTIONS.find((o) => o.value === r)?.label ?? r}
              </Tag>
            ))
          : <Text type="secondary">All</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, member) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(member)}
            />
          </Tooltip>
          <Popconfirm
            title="Remove this panel member?"
            onConfirm={() => handleDelete(member.id)}
            okText="Remove"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Remove">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Space>
          <TeamOutlined style={{ fontSize: 20, color: '#2563eb' }} />
          <div>
            <Title level={4} style={{ margin: 0 }}>Interview Panel</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Manage internal interview panel members, their departments, and regions
            </Text>
          </div>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} style={{ backgroundColor: '#2563eb' }}>
          Add Member
        </Button>
      </div>

      <Table
        dataSource={panelMembers}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        locale={{ emptyText: <Empty description="No panel members yet — add your first interviewer" /> }}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
      />

      <Modal
        open={modalOpen}
        title={
          <Space>
            <UserOutlined />
            {editingMember ? 'Edit Panel Member' : 'Add Panel Member'}
          </Space>
        }
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText={editingMember ? 'Save Changes' : 'Add Member'}
        confirmLoading={adding || updating}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: 'Enter a name' }]}
          >
            <Input placeholder="e.g. Sarah Johnson" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Enter an email' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input placeholder="e.g. sarah@bourntec.com" />
          </Form.Item>

          <Form.Item name="role" label="Role / Title">
            <Input placeholder="e.g. Tech Lead, Senior Engineer, HR Manager" />
          </Form.Item>

          <Form.Item
            name="departments"
            label="Departments"
            extra="Leave empty to include this member in interviews for all departments"
          >
            <Select
              mode="multiple"
              placeholder="Select departments…"
              options={departments.map((d) => ({ value: d.name, label: d.name }))}
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="regions"
            label="Regions"
            extra="Select 'Global' to make them available across all regions"
          >
            <Select
              mode="multiple"
              placeholder="Select regions…"
              options={REGION_OPTIONS}
              allowClear
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InterviewPanel;
