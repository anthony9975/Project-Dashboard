// UI Layer — Frictionless Idea Capture Page (/new)
// Captures raw project ideas with minimal friction (title + one-line note only).
// Posts to /api/projects to create a new project record in the 'idea' status stage.

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function NewIdea() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, note }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Couldn't save that. Try again.");
      setSaving(false);
      return;
    }
    router.push('/');
  }

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <Link href="/" style={{ fontSize: 13 }}>
        &larr; all projects
      </Link>
      <h1 style={{ margin: '16px 0 20px' }}>New idea</h1>
      <form onSubmit={handleSubmit}>
        <div className="field-block">
          <div className="field-label">Title</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Home lab NAS"
          />
        </div>
        <div className="field-block">
          <div className="field-label">One-line note</div>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Cheap redundant storage for backups"
          />
        </div>
        {error && <p style={{ color: 'var(--clay)', fontSize: 13 }}>{error}</p>}
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save idea'}
        </button>
      </form>
    </div>
  );
}
