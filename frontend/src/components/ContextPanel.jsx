import React from 'react';
import { Brain, MapPin, User, Target, BarChart3 } from 'lucide-react';

export default function ContextPanel({ medicalContext, lastQueryInfo }) {
  return (
    <aside className="context-panel">
      {(medicalContext?.disease ||
        medicalContext?.patientName ||
        medicalContext?.location) && (
        <div className="panel-section">
          <div className="panel-title">
            <User size={10} style={{ display: 'inline', marginRight: 4 }} />
            Research Context
          </div>

          {medicalContext.patientName && (
            <div className="context-item">
              <span className="context-item-label">Patient</span>
              <span className="context-item-value">
                {medicalContext.patientName}
              </span>
            </div>
          )}

          {medicalContext.disease && (
            <div className="context-item">
              <span className="context-item-label">Condition</span>
              <span
                className="context-item-value"
                style={{ color: 'var(--accent-primary)' }}
              >
                {medicalContext.disease}
              </span>
            </div>
          )}

          {medicalContext.location && (
            <div className="context-item">
              <span className="context-item-label">
                <MapPin
                  size={9}
                  style={{ display: 'inline', marginRight: 3 }}
                />
                Location
              </span>
              <span className="context-item-value">
                {medicalContext.location}
              </span>
            </div>
          )}
        </div>
      )}

      {lastQueryInfo && (
        <div className="panel-section">
          <div className="panel-title">
            <Brain size={10} style={{ display: 'inline', marginRight: 4 }} />
            Query Analysis
          </div>

          {lastQueryInfo.disease && (
            <div className="context-item">
              <span className="context-item-label">Detected Disease</span>
              <span
                className="context-item-value"
                style={{ color: 'var(--accent-secondary)' }}
              >
                {lastQueryInfo.disease}
              </span>
            </div>
          )}

          {lastQueryInfo.intents?.length > 0 && (
            <div className="context-item">
              <span className="context-item-label">
                <Target
                  size={9}
                  style={{ display: 'inline', marginRight: 3 }}
                />
                Intent
              </span>
              <div className="intent-tags" style={{ marginTop: 4 }}>
                {lastQueryInfo.intents.map((intent) => (
                  <span key={intent} className="intent-tag">
                    {intent}
                  </span>
                ))}
              </div>
            </div>
          )}

          {lastQueryInfo.isFollowUp !== undefined && (
            <div className="context-item">
              <span className="context-item-label">Type</span>
              <span
                className="context-item-value"
                style={{ fontSize: '0.78rem' }}
              >
                {lastQueryInfo.isFollowUp ? '🔁 Follow-up' : '🆕 New query'}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="panel-section">
        <div className="panel-title">
          <BarChart3 size={10} style={{ display: 'inline', marginRight: 4 }} />
          Data Sources
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'PubMed', color: '#f59e0b', desc: 'NCBI biomedical' },
            {
              label: 'OpenAlex',
              color: 'var(--accent-primary)',
              desc: 'Open research graph',
            },
            {
              label: 'ClinicalTrials.gov',
              color: 'var(--accent-secondary)',
              desc: 'Active trials',
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: s.color,
                  flexShrink: 0,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {s.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          fontSize: '0.68rem',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          padding: '10px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
        }}
      >
        ⚠️ For educational purposes only. Always consult a qualified healthcare
        professional.
      </div>
    </aside>
  );
}
