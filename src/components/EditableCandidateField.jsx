import React, { useState } from 'react';
import { Button, Space, Tooltip, message, Input } from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useEditCandidateMutation } from '../redux/candidateApi';

// Click-to-edit field for a single candidate property (email / phone).
const EditableCandidateField = ({ candidate, field, placeholder, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(candidate[field] ?? '');
  const [saving, setSaving] = useState(false);
  const [editCandidate] = useEditCandidateMutation();

  const startEdit = () => { setVal(candidate[field] ?? ''); setEditing(true); };

  const save = async () => {
    const trimmed = val.trim();
    if (trimmed === (candidate[field] ?? '')) { setEditing(false); return; }
    setSaving(true);
    try {
      const updated = await editCandidate({
        candidateId: candidate.id,
        updatedCandidate: { ...candidate, [field]: trimmed },
      }).unwrap();
      onSaved?.(updated ?? { ...candidate, [field]: trimmed });
      setEditing(false);
      message.success(`${placeholder} updated`);
    } catch (e) {
      message.error(e?.data?.error ?? `Failed to update ${placeholder.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <Space.Compact style={{ width: '100%', maxWidth: 260 }}>
        <Input
          size="small"
          value={val}
          autoFocus
          placeholder={placeholder}
          onChange={(e) => setVal(e.target.value)}
          onPressEnter={save}
        />
        <Button size="small" icon={<CheckOutlined />} loading={saving} onClick={save} />
        <Button size="small" icon={<CloseOutlined />} onClick={() => setEditing(false)} disabled={saving} />
      </Space.Compact>
    );
  }

  return (
    <Space size={6}>
      <span>{candidate[field] || 'N/A'}</span>
      <Tooltip title={`Edit ${placeholder.toLowerCase()}`}>
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={startEdit}
          style={{ padding: 0, height: 'auto', color: '#9ca3af' }}
        />
      </Tooltip>
    </Space>
  );
};

export default EditableCandidateField;
