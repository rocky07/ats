import React, { useState } from 'react';
import { Button, Card, Typography } from 'antd';

const { Title, Text } = Typography;

const Pipeline = () => {
  const [pipelineData, setPipelineData] = useState({
    ingested: [
      { id: 1, name: 'Candidate 1', email: 'candidate1@example.com', skills: ['Node.js', 'React'] },
      { id: 2, name: 'Candidate 2', email: 'candidate2@example.com', skills: ['Node.js', 'Vue'] },
    ],
    ranked: [
      { id: 3, name: 'Candidate Name 1', email: 'candidate3@example.com', skills: ['Skill 1', 'Skill 2'], score: 85 },
      { id: 4, name: 'Candidate Name 2', email: 'candidate4@example.com', skills: ['Skill 1', 'Skill 2'], score: 75 },
    ],
    l1: [],
    l2: [],
    l3: [],
  });
  const [draggedCandidate, setDraggedCandidate] = useState(null);

  const handleDragStart = (e, candidate, sourceStage) => {
    setDraggedCandidate({ candidate, sourceStage });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    if (!draggedCandidate) return;

    const { candidate, sourceStage } = draggedCandidate;

    if (sourceStage === targetStage) {
      setDraggedCandidate(null);
      return;
    }

    setPipelineData(prev => {
      const updated = { ...prev };
      
      // Remove from source stage
      updated[sourceStage] = updated[sourceStage].filter(c => c.id !== candidate.id);
      
      // Add to target stage
      updated[targetStage] = [...updated[targetStage], candidate];
      
      return updated;
    });

    setDraggedCandidate(null);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Pipeline: SR. Node.js Developer</Title>
        </div>
        <Button type="primary" style={{ backgroundColor: '#2563eb', height: 40, paddingInline: 24 }}>
          Trigger Ranking (Opus)
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, minHeight: 600 }}>
        {[
          { key: 'ingested', label: 'Ingested (Claude Parsed)' },
          { key: 'ranked', label: 'Ranked (Claude Scored)' },
          { key: 'l1', label: 'L1 (Exam)' },
          { key: 'l2', label: 'L2 (Recruiter)' },
          { key: 'l3', label: 'L3 (Final)' }
        ].map((stage) => (
          <div 
            key={stage.key} 
            style={{ 
              background: '#f5f5f5', 
              borderRadius: 8, 
              padding: 12,
              minHeight: 400,
              border: draggedCandidate?.sourceStage !== stage.key ? '2px solid transparent' : '2px dashed #2563eb'
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.key)}
          >
            <Title level={5} style={{ marginBottom: 16, fontSize: 12, fontWeight: 600 }}>
              {stage.label}
              <div style={{ fontSize: 11, color: '#666', fontWeight: 400 }}>
                {pipelineData[stage.key]?.length || 0} Candidates
              </div>
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pipelineData[stage.key]?.map((candidate) => (
                <Card 
                  key={candidate.id} 
                  style={{ 
                    background: '#fff', 
                    cursor: 'grab',
                    padding: 12,
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    opacity: draggedCandidate?.candidate.id === candidate.id ? 0.5 : 1
                  }}
                  hoverable
                  draggable
                  onDragStart={(e) => handleDragStart(e, candidate, stage.key)}
                >
                  <div style={{ fontSize: 12 }}>
                    <Text strong>{candidate.name}</Text>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                      EMAIL: {candidate.email}
                    </div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                      SKILLS: {candidate.skills.join(', ')}
                    </div>
                    {candidate.score && (
                      <div style={{ marginTop: 8, padding: 8, backgroundColor: '#dbeafe', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                        RANK SCORE: {candidate.score}-100
                      </div>
                    )}
                  </div>
                </Card>
              ))}
              {pipelineData[stage.key]?.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: 20, 
                  color: '#bfbfbf',
                  fontSize: 12
                }}>
                  Drag candidates here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default Pipeline;
