import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  FlaskConical,
  Users,
  Star,
} from 'lucide-react';

function getStatusClass(status) {
  if (!status) return '';
  const s = status.toLowerCase();
  if (s.includes('recruiting') && !s.includes('not')) return 'recruiting';
  if (s.includes('completed')) return 'completed';
  if (s.includes('active')) return 'active';
  if (s.includes('not_yet') || s.includes('not yet')) return 'not_yet';
  return '';
}

function getStatusLabel(status) {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function PublicationCard({ source }) {
  return (
    <div className="source-card">
      <div className="source-type-row">
        <span
          className={`source-type-tag ${source.source?.toLowerCase() === 'pubmed' ? 'pubmed' : 'openalex'}`}
        >
          {source.source}
        </span>
        <span className="relevance-score">
          <Star size={9} style={{ display: 'inline', marginRight: 3 }} />
          {source.relevanceScore?.toFixed(1)}
        </span>
      </div>

      <div className="source-title">{source.title}</div>

      {source.authors?.length > 0 && (
        <div className="source-meta">
          <Users size={9} style={{ display: 'inline', marginRight: 3 }} />
          {source.authors.slice(0, 3).join(', ')}
          {source.authors.length > 3 ? ' et al.' : ''}
          {source.year ? ` · ${source.year}` : ''}
          {source.journal ? ` · ${source.journal.slice(0, 30)}` : ''}
        </div>
      )}

      {source.citationCount > 0 && (
        <div className="source-meta">
          📊 {source.citationCount.toLocaleString()} citations
          {source.openAccess && ' · 🔓 Open Access'}
        </div>
      )}

      {source.snippet && <div className="source-snippet">{source.snippet}</div>}

      <div className="source-footer">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="source-link"
        >
          <ExternalLink size={10} /> View Paper
        </a>
      </div>
    </div>
  );
}

function TrialCard({ source }) {
  return (
    <div className="source-card">
      <div className="source-type-row">
        <span className="source-type-tag trial">Clinical Trial</span>
        <span className={`trial-status ${getStatusClass(source.status)}`}>
          {getStatusLabel(source.status)}
        </span>
      </div>

      <div className="source-title">{source.title}</div>

      <div className="source-meta">
        Phase: {source.phase || 'Not specified'}
        {source.nctId ? ` · ${source.nctId}` : ''}
      </div>

      {source.locations?.length > 0 && (
        <div className="source-meta">
          📍 {source.locations.slice(0, 2).join('; ')}
        </div>
      )}

      {source.minAge || source.maxAge ? (
        <div className="source-meta">
          👤 Age: {source.minAge || '?'} – {source.maxAge || '?'}
          {source.sex ? ` · ${source.sex}` : ''}
        </div>
      ) : null}

      {source.snippet && <div className="source-snippet">{source.snippet}</div>}

      <div className="source-footer">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="source-link"
        >
          <ExternalLink size={10} /> ClinicalTrials.gov
        </a>
        {source.contact?.email && (
          <a
            href={`mailto:${source.contact.email}`}
            className="source-link"
            style={{ color: 'var(--accent-secondary)' }}
          >
            Contact
          </a>
        )}
      </div>
    </div>
  );
}

export default function SourcesPanel({ sources = [], retrievalStats }) {
  const [open, setOpen] = useState(false);

  const pubs = sources.filter((s) => s.type === 'publication');
  const trials = sources.filter((s) => s.type === 'trial');

  if (sources.length === 0) return null;

  return (
    <div className="sources-panel">
      <button className="sources-toggle" onClick={() => setOpen(!open)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={13} />
          <span>Sources & Evidence</span>
          {retrievalStats && (
            <span className="source-meta" style={{ marginLeft: 4 }}>
              (from{' '}
              {(retrievalStats.pubmedCount || 0) +
                (retrievalStats.openAlexCount || 0)}{' '}
              papers · {retrievalStats.trialsCount || 0} trials retrieved)
            </span>
          )}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="sources-count-badges">
            {pubs.length > 0 && (
              <span className="badge pub">📄 {pubs.length} papers</span>
            )}
            {trials.length > 0 && (
              <span className="badge trial">🧪 {trials.length} trials</span>
            )}
          </div>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {open && (
        <div className="sources-list">
          {pubs.map((s, i) => (
            <PublicationCard key={s.url || i} source={s} />
          ))}
          {trials.map((s, i) => (
            <TrialCard key={s.nctId || i} source={s} />
          ))}
        </div>
      )}
    </div>
  );
}
