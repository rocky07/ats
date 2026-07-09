import React, { useState, useEffect } from 'react';
import {
  Drawer, Button, Form, DatePicker, Select, Checkbox, Input, Alert,
  Typography, Space, Tag, Divider, Spin, Avatar, Tooltip, message,
} from 'antd';
import {
  TeamOutlined, CalendarOutlined, LinkOutlined, WarningOutlined,
  CheckCircleOutlined, UserOutlined, ClockCircleOutlined, PlusOutlined, CloseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  useGetPanelMembersQuery,
  useCheckConflictsMutation,
  useScheduleInterviewMutation,
} from '../redux/interviewApi';

dayjs.extend(utc);

const { Text, Title } = Typography;
const { TextArea } = Input;

const DURATION_OPTIONS = [
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
];

const roleColor = { 'Tech Lead': 'blue', 'Senior Engineer': 'green', 'HR Manager': 'purple' };

const ScheduleInterviewDrawer = ({ open, onClose, onScheduled, candidate, requirement, region = 'global' }) => {
  const [form] = Form.useForm();
  const [selectedPanel, setSelectedPanel] = useState([]);
  const [extraInterviewers, setExtraInterviewers] = useState([]); // [{ name, email }]
  const [newInterviewerName, setNewInterviewerName] = useState('');
  const [newInterviewerEmail, setNewInterviewerEmail] = useState('');
  const [conflictResult, setConflictResult] = useState(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [scheduledMeeting, setScheduledMeeting] = useState(null);

  const panelFilter = {
    department: requirement?.department,
    region,
  };
  const { data: panelMembers = [], isLoading: loadingPanel } = useGetPanelMembersQuery(panelFilter);
  const [checkConflicts] = useCheckConflictsMutation();
  const [scheduleInterview, { isLoading: scheduling }] = useScheduleInterviewMutation();

  const isReschedule = !!candidate?.interviewData;

  // Pre-populate form when drawer opens
  useEffect(() => {
    if (open && panelMembers.length > 0) {
      setConflictResult(null);
      setScheduledMeeting(null);
      setNewInterviewerName('');
      setNewInterviewerEmail('');
      if (isReschedule && candidate.interviewData) {
        const prev = candidate.interviewData;
        form.setFieldsValue({
          dateTime: prev.startISO ? dayjs(prev.startISO) : undefined,
          duration: prev.durationMinutes ?? 60,
          notes: prev.notes ?? '',
        });
        const prevPanelEmails = prev.panelEmails ?? panelMembers.map((m) => m.email);
        setSelectedPanel(prevPanelEmails);
        const panelEmailSet = new Set(panelMembers.map((m) => m.email));
        setExtraInterviewers(
          prevPanelEmails
            .filter((e) => !panelEmailSet.has(e))
            .map((e) => ({ name: e, email: e })),
        );
      } else {
        form.resetFields();
        setSelectedPanel(panelMembers.map((m) => m.email));
        setExtraInterviewers([]);
      }
    }
  }, [open, panelMembers]);

  const handleAddInterviewer = () => {
    const email = newInterviewerEmail.trim();
    if (!email) { message.warning('Enter an email address'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { message.warning('Enter a valid email address'); return; }
    const alreadyExists =
      panelMembers.some((m) => m.email === email) || extraInterviewers.some((m) => m.email === email);
    if (alreadyExists) { message.warning('This person is already in the panel'); return; }

    const name = newInterviewerName.trim() || email;
    setExtraInterviewers((prev) => [...prev, { name, email }]);
    setSelectedPanel((prev) => [...prev, email]);
    setNewInterviewerName('');
    setNewInterviewerEmail('');
  };

  const handleRemoveInterviewer = (email) => {
    setExtraInterviewers((prev) => prev.filter((m) => m.email !== email));
    setSelectedPanel((prev) => prev.filter((e) => e !== email));
  };

  const getTimeRange = () => {
    const dateTime = form.getFieldValue('dateTime');
    const duration = form.getFieldValue('duration') ?? 60;
    if (!dateTime) return null;
    const startISO = dateTime.utc().toISOString();
    const endISO = dateTime.utc().add(duration, 'minute').toISOString();
    return { startISO, endISO };
  };

  const handleCheckConflicts = async () => {
    const range = getTimeRange();
    if (!range) { message.warning('Select a date and time first'); return; }
    if (!selectedPanel.length) { message.warning('Select at least one panel member'); return; }

    const attendeeEmails = [
      ...(candidate?.email ? [candidate.email] : []),
      ...selectedPanel,
    ];

    setCheckingConflicts(true);
    try {
      const result = await checkConflicts({
        attendeeEmails,
        startISO: range.startISO,
        endISO: range.endISO,
      }).unwrap();
      setConflictResult(result);
    } catch (err) {
      setConflictResult({ error: err.message });
    } finally {
      setCheckingConflicts(false);
    }
  };

  const handleSchedule = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const range = getTimeRange();
    if (!range) return;
    const notes = form.getFieldValue('notes');

    try {
      const res = await scheduleInterview({
        candidateId: candidate?.id,
        candidateName: candidate?.name,
        candidateEmail: candidate?.email,
        requirementId: requirement?.id,
        jobTitle: requirement?.title,
        panelEmails: selectedPanel,
        startISO: range.startISO,
        endISO: range.endISO,
        notes,
      }).unwrap();

      const duration = form.getFieldValue('duration') ?? 60;
      setScheduledMeeting(res.meeting);
      message.success(isReschedule ? 'Interview rescheduled!' : 'Interview scheduled successfully!');
      onScheduled?.({
        teamsLink: res.meeting.teamsLink,
        startISO: range.startISO,
        endISO: range.endISO,
        durationMinutes: duration,
        panelEmails: selectedPanel,
        notes,
        mock: res.meeting.mock,
      });
    } catch (err) {
      message.error(err?.data?.error ?? 'Failed to schedule interview');
    }
  };

  const disabledDate = (current) => current && current < dayjs().startOf('day');

  const hasConflicts = conflictResult?.conflicts?.length > 0;

  return (
    <Drawer
      title={
        <Space>
          <CalendarOutlined style={{ color: '#2563eb' }} />
          <span>{isReschedule ? 'Reschedule Interview' : 'Schedule Interview'}</span>
        </Space>
      }
      placement="right"
      width={480}
      open={open}
      onClose={onClose}
      footer={
        !scheduledMeeting && (
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              icon={<CalendarOutlined />}
              onClick={handleCheckConflicts}
              loading={checkingConflicts}
            >
              Check Conflicts
            </Button>
            <Button
              type="primary"
              icon={<TeamOutlined />}
              loading={scheduling}
              onClick={handleSchedule}
              style={{ backgroundColor: '#2563eb' }}
            >
              {isReschedule ? 'Reschedule on Teams' : 'Schedule on Teams'}
            </Button>
          </Space>
        )
      }
    >
      {/* ── Success state ── */}
      {scheduledMeeting ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 56, color: '#52c41a', marginBottom: 16 }} />
          <Title level={4} style={{ margin: '0 0 8px' }}>Interview Scheduled!</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            A Microsoft Teams meeting has been created and calendar invites sent to all attendees.
          </Text>
          {scheduledMeeting.mock && (
            <Alert
              type="warning"
              message="Running in demo mode — MS Graph credentials not configured"
              style={{ marginBottom: 16, textAlign: 'left' }}
            />
          )}
          {scheduledMeeting.teamsLink && (
            <Button
              type="primary"
              icon={<LinkOutlined />}
              href={scheduledMeeting.teamsLink}
              target="_blank"
              style={{ backgroundColor: '#2563eb', marginBottom: 12 }}
              block
            >
              Open Teams Meeting
            </Button>
          )}
          <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '12px 16px', textAlign: 'left', fontSize: 13 }}>
            <div><Text strong>Subject:</Text> {scheduledMeeting.subject}</div>
            <div style={{ marginTop: 6 }}><Text strong>Start:</Text> {dayjs(scheduledMeeting.start).format('MMM D, YYYY h:mm A')} UTC</div>
            <div><Text strong>End:</Text> {dayjs(scheduledMeeting.end).format('MMM D, YYYY h:mm A')} UTC</div>
          </div>
          <Button block style={{ marginTop: 16 }} onClick={onClose}>Close</Button>
        </div>
      ) : (
        <>
          {/* ── Candidate info ── */}
          <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
            <Space>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#2563eb' }} />
              <div>
                <Text strong style={{ display: 'block' }}>{candidate?.name}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{candidate?.email}</Text>
              </div>
            </Space>
            {requirement && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                <Tag color="blue">{requirement.title}</Tag>
              </div>
            )}
          </div>

          <Form form={form} layout="vertical">
            {/* Date & Time */}
            <Form.Item
              name="dateTime"
              label="Interview Date & Time (UTC)"
              rules={[{ required: true, message: 'Select date and time' }]}
            >
              <DatePicker
                showTime={{ format: 'HH:mm', minuteStep: 15 }}
                format="YYYY-MM-DD HH:mm"
                disabledDate={disabledDate}
                style={{ width: '100%' }}
                placeholder="Select date and time"
                onChange={() => setConflictResult(null)}
              />
            </Form.Item>

            {/* Duration */}
            <Form.Item name="duration" label="Duration" initialValue={60}>
              <Select options={DURATION_OPTIONS} />
            </Form.Item>

            {/* Notes */}
            <Form.Item name="notes" label="Meeting Notes / Agenda (optional)">
              <TextArea rows={3} placeholder="Topics to cover, instructions for the candidate…" />
            </Form.Item>
          </Form>

          <Divider style={{ margin: '4px 0 16px' }} />

          {/* ── Panel Members ── */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text strong>
                <TeamOutlined style={{ marginRight: 6 }} />
                Interview Panel
              </Text>
              <Space size={4}>
                <Button
                  size="small"
                  type="link"
                  onClick={() =>
                    setSelectedPanel([
                      ...panelMembers.map((m) => m.email),
                      ...extraInterviewers.map((m) => m.email),
                    ])
                  }
                >
                  All
                </Button>
                <Button size="small" type="link" onClick={() => setSelectedPanel([])}>
                  None
                </Button>
              </Space>
            </div>
            {loadingPanel ? (
              <Spin size="small" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {panelMembers.map((member) => {
                  const hasConflict = conflictResult?.conflicts?.some((c) => c.email === member.email);
                  return (
                    <div
                      key={member.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: `1px solid ${hasConflict ? '#ff4d4f' : '#e8e8e8'}`,
                        background: hasConflict ? '#fff2f0' : '#fafafa',
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        setSelectedPanel((prev) =>
                          prev.includes(member.email)
                            ? prev.filter((e) => e !== member.email)
                            : [...prev, member.email],
                        )
                      }
                    >
                      <Space>
                        <Checkbox checked={selectedPanel.includes(member.email)} />
                        <Avatar size={28} style={{ backgroundColor: '#2563eb', fontSize: 12 }}>
                          {member.name[0]}
                        </Avatar>
                        <div>
                          <Text strong style={{ fontSize: 13 }}>{member.name}</Text>
                          <div style={{ fontSize: 11, color: '#888' }}>{member.email}</div>
                        </div>
                      </Space>
                      <Space size={4}>
                        <Tag color={roleColor[member.role] ?? 'default'} style={{ fontSize: 10 }}>
                          {member.role}
                        </Tag>
                        {hasConflict && (
                          <Tooltip title="Has a conflicting event at this time">
                            <WarningOutlined style={{ color: '#ff4d4f' }} />
                          </Tooltip>
                        )}
                      </Space>
                    </div>
                  );
                })}

                {extraInterviewers.map((member) => {
                  const hasConflict = conflictResult?.conflicts?.some((c) => c.email === member.email);
                  return (
                    <div
                      key={member.email}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: `1px solid ${hasConflict ? '#ff4d4f' : '#e8e8e8'}`,
                        background: hasConflict ? '#fff2f0' : '#fafafa',
                      }}
                    >
                      <Space style={{ cursor: 'pointer', flex: 1 }} onClick={() =>
                        setSelectedPanel((prev) =>
                          prev.includes(member.email)
                            ? prev.filter((e) => e !== member.email)
                            : [...prev, member.email],
                        )
                      }>
                        <Checkbox checked={selectedPanel.includes(member.email)} />
                        <Avatar size={28} style={{ backgroundColor: '#64748b', fontSize: 12 }}>
                          {member.name[0]}
                        </Avatar>
                        <div>
                          <Text strong style={{ fontSize: 13 }}>{member.name}</Text>
                          <div style={{ fontSize: 11, color: '#888' }}>{member.email}</div>
                        </div>
                      </Space>
                      <Space size={4}>
                        <Tag color="default" style={{ fontSize: 10 }}>Guest</Tag>
                        {hasConflict && (
                          <Tooltip title="Has a conflicting event at this time">
                            <WarningOutlined style={{ color: '#ff4d4f' }} />
                          </Tooltip>
                        )}
                        <Button
                          size="small"
                          type="text"
                          icon={<CloseOutlined />}
                          onClick={() => handleRemoveInterviewer(member.email)}
                        />
                      </Space>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add interviewer not on the panel */}
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              <Input
                size="small"
                placeholder="Name (optional)"
                value={newInterviewerName}
                onChange={(e) => setNewInterviewerName(e.target.value)}
                style={{ flex: 1 }}
              />
              <Input
                size="small"
                placeholder="Email address"
                value={newInterviewerEmail}
                onChange={(e) => setNewInterviewerEmail(e.target.value)}
                onPressEnter={handleAddInterviewer}
                style={{ flex: 1.4 }}
              />
              <Button size="small" icon={<PlusOutlined />} onClick={handleAddInterviewer}>
                Add
              </Button>
            </div>
          </div>

          {/* ── Conflict result ── */}
          {conflictResult && (
            <div style={{ marginTop: 12 }}>
              {!conflictResult.configured && (
                <Alert
                  type="info"
                  showIcon
                  message="Conflict check unavailable"
                  description="MS Graph is not configured — conflict checking requires MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, and MS_ORGANIZER_EMAIL in your .env."
                  style={{ fontSize: 12 }}
                />
              )}
              {conflictResult.configured && !hasConflicts && (
                <Alert
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                  message="No conflicts found — all attendees are available!"
                />
              )}
              {conflictResult.configured && hasConflicts && (
                <Alert
                  type="warning"
                  showIcon
                  message={`${conflictResult.conflicts.length} conflict(s) detected`}
                  description={
                    <div style={{ marginTop: 6 }}>
                      {conflictResult.conflicts.map((c, i) => (
                        <div key={i} style={{ marginBottom: 6 }}>
                          <Text strong style={{ fontSize: 12 }}>{c.email}</Text>
                          {c.accessError ? (
                            <div style={{ fontSize: 11, color: '#888' }}>Calendar not accessible</div>
                          ) : (
                            c.events?.map((ev, j) => (
                              <div key={j} style={{ fontSize: 11, color: '#666' }}>
                                <ClockCircleOutlined style={{ marginRight: 4 }} />
                                {ev.subject} ({dayjs(ev.start).format('HH:mm')}–{dayjs(ev.end).format('HH:mm')})
                              </div>
                            ))
                          )}
                        </div>
                      ))}
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        You can still schedule — attendees will receive the invite and can accept or decline.
                      </Text>
                    </div>
                  }
                />
              )}
            </div>
          )}
        </>
      )}
    </Drawer>
  );
};

export default ScheduleInterviewDrawer;
