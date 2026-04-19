import React, { useState } from 'react';
import { FlaskConical, Microscope } from 'lucide-react';

const SAMPLE_QUERIES = [
  'Latest treatment for lung cancer',
  "Clinical trials for Parkinson's disease",
  'Deep brain stimulation effectiveness',
  'Recent studies on heart disease',
  "Alzheimer's disease top researchers",
  'Diabetes management breakthroughs 2024',
  'Can vitamin D help with multiple sclerosis?',
  'CRISPR gene therapy for rare diseases',
];

export default function WelcomeScreen({ onSend, onContextSave }) {
  const [form, setForm] = useState({
    patientName: '',
    disease: '',
    location: '',
    additionalQuery: '',
  });

  const handleChip = (query) => {
    onSend(
      query,
      form.disease
        ? {
            disease: form.disease,
            location: form.location,
            patientName: form.patientName,
          }
        : {},
    );
  };

  const handleFormSend = () => {
    if (!form.additionalQuery.trim() && !form.disease.trim()) return;
    const query =
      form.additionalQuery.trim() || `Latest research on ${form.disease}`;
    onContextSave(form);
    onSend(query, form);
  };

  return (
    <div className="welcome">
      <div className="welcome-hero">
        <div className="welcome-orb">
          <Microscope
            size={40}
            color="var(--accent-primary)"
            strokeWidth={1.5}
          />
        </div>
      </div>

      <div>
        <h1 className="welcome-title">
          Medical Research,
          <br />
          Powered by AI
        </h1>
        <p className="welcome-subtitle">
          Ask about diseases, treatments, clinical trials, and breakthrough
          research. Curalink retrieves and synthesizes evidence from PubMed,
          OpenAlex, and ClinicalTrials.gov.
        </p>
      </div>

      <div className="context-form">
        <div className="context-form-title">
          <FlaskConical
            size={12}
            style={{ display: 'inline', marginRight: 6 }}
          />
          Optional: Set Your Research Context
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Patient Name</label>
            <input
              className="form-input"
              placeholder="e.g. John Smith"
              value={form.patientName}
              onChange={(e) =>
                setForm((f) => ({ ...f, patientName: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Disease / Condition</label>
            <input
              className="form-input"
              placeholder="e.g. Parkinson's disease"
              value={form.disease}
              onChange={(e) =>
                setForm((f) => ({ ...f, disease: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              className="form-input"
              placeholder="e.g. Toronto, Canada"
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Your Query</label>
            <input
              className="form-input"
              placeholder="e.g. Deep Brain Stimulation"
              value={form.additionalQuery}
              onChange={(e) =>
                setForm((f) => ({ ...f, additionalQuery: e.target.value }))
              }
              onKeyDown={(e) => e.key === 'Enter' && handleFormSend()}
            />
          </div>
        </div>

        <button
          onClick={handleFormSend}
          disabled={!form.additionalQuery.trim() && !form.disease.trim()}
          style={{
            padding: '12px 20px',
            background:
              'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: 'var(--bg-base)',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'var(--transition)',
            opacity:
              !form.additionalQuery.trim() && !form.disease.trim() ? 0.5 : 1,
          }}
        >
          Start Research Session →
        </button>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Or try a sample query
        </div>
        <div className="sample-queries">
          {SAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              className="sample-chip"
              onClick={() => handleChip(q)}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
