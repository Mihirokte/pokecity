import { useState, useRef } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { SheetsService } from '../../services/sheetsService';
import { useUIStore } from '../../stores/uiStore';
import { PageHeader } from '../components/PageHeader';
import type { Note } from '../../types';

export function Notes() {
  const notes = useCityStore(s => s.moduleData.notes);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);

  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id || null);
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const prevSelectedIdRef = useRef<string | null>(null);

  const selected = notes.find(n => n.id === selectedId);

  // Derive initial editor state from selected note
  const [editTitle, setEditTitle] = useState(selected?.title ?? '');
  const [editContent, setEditContent] = useState(selected?.content ?? '');

  // Sync editor when selection changes
  if (selectedId !== prevSelectedIdRef.current) {
    prevSelectedIdRef.current = selectedId;
    if (selected) {
      setEditTitle(selected.title);
      setEditContent(selected.content);
    }
  }

  const filtered = notes.filter(n =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())
  );

  const saveNote = (title: string, content: string) => {
    if (!selectedId) return;
    const updated = notes.map(n =>
      n.id === selectedId
        ? { ...n, title, content, updatedAt: new Date().toISOString() }
        : n
    );
    setModuleData('notes', updated);
    const note = updated.find(n => n.id === selectedId);
    if (note) SheetsService.update('Notes', note).catch(() => addToast('Sync failed', 'error'));
  };

  const handleContentChange = (val: string) => {
    setEditContent(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNote(editTitle, val), 2000);
  };

  const handleTitleChange = (val: string) => {
    setEditTitle(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNote(val, editContent), 2000);
  };

  const handleTitleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveNote(editTitle, editContent);
  };

  const createNote = () => {
    const note: Note = {
      id: `note_${crypto.randomUUID()}`,
      residentId: '',
      title: 'Untitled',
      content: '',
      tags: '',
      version: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setModuleData('notes', [note, ...notes]);
    SheetsService.append('Notes', note).catch(() => addToast('Sync failed', 'error'));
    setSelectedId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const deleteNote = (id: string) => {
    setModuleData('notes', notes.filter(n => n.id !== id));
    SheetsService.deleteRow('Notes', id).catch(() => addToast('Sync failed', 'error'));
    if (selectedId === id) {
      const remaining = notes.filter(n => n.id !== id);
      setSelectedId(remaining[0]?.id || null);
    }
  };

  return (
    <>
      <PageHeader
        title="Notes"
        description={`${notes.length} notes`}
        actions={
          <button className="btn btn--primary" onClick={createNote}>
            + New Note
          </button>
        }
      />

      <div className="notes-layout">
        <div className="notes-list">
          <input
            className="form-input"
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          {filtered.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No notes found
            </div>
          ) : (
            filtered.map(note => (
              <div
                key={note.id}
                className={`note-item ${selectedId === note.id ? 'note-item--active' : ''}`}
                onClick={() => setSelectedId(note.id)}
              >
                <div className="note-item__title">{note.title || 'Untitled'}</div>
                <div className="note-item__preview">{note.content.slice(0, 60) || 'Empty note'}</div>
              </div>
            ))
          )}
        </div>

        <div className="notes-editor">
          {selected ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input
                  className="form-input"
                  value={editTitle}
                  onChange={e => handleTitleChange(e.target.value)}
                  onBlur={handleTitleBlur}
                  style={{ fontSize: 20, fontWeight: 600, border: 'none', background: 'transparent', padding: 0, flex: 1 }}
                  placeholder="Note title"
                />
                <button className="btn btn--ghost btn--sm" onClick={() => deleteNote(selected.id)}>
                  &#x1F5D1;
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                Last edited: {new Date(selected.updatedAt).toLocaleString()}
              </div>
              <textarea
                className="notes-editor__input"
                value={editContent}
                onChange={e => handleContentChange(e.target.value)}
                placeholder="Start writing..."
              />
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">&#x1F4DD;</div>
              <div className="empty-state__text">Select a note or create a new one</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
