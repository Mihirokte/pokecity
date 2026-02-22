import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { useUIStore } from '../../stores/uiStore';
import { SheetsService } from '../../services/sheetsService';
import type { Resident, Note } from '../../types';

interface NotesModuleProps {
  resident: Resident;
}

export function NotesModule({ resident }: NotesModuleProps) {
  const notes = useCityStore(s => s.moduleData.notes);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftTags, setDraftTags] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const residentNotes = useMemo(
    () => notes.filter(n => n.residentId === resident.id),
    [notes, resident.id],
  );

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return residentNotes;
    const q = searchQuery.toLowerCase();
    return residentNotes.filter(
      n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q),
    );
  }, [residentNotes, searchQuery]);

  const activeNote = useMemo(
    () => notes.find(n => n.id === activeNoteId) ?? null,
    [notes, activeNoteId],
  );

  // Sync drafts when active note changes
  useEffect(() => {
    if (activeNote) {
      setDraftTitle(activeNote.title);
      setDraftContent(activeNote.content);
      setDraftTags(activeNote.tags);
    }
  }, [activeNoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const saveNote = useCallback(
    async (noteId: string, title: string, content: string, tags: string) => {
      if (savingRef.current) return;
      savingRef.current = true;

      const existing = notes.find(n => n.id === noteId);
      if (!existing) {
        savingRef.current = false;
        return;
      }

      const newVersion = String(parseInt(existing.version || '0', 10) + 1);
      const updated: Note = {
        ...existing,
        title,
        content,
        tags,
        version: newVersion,
        updatedAt: new Date().toISOString(),
      };

      // Optimistic update
      const updatedNotes = notes.map(n => (n.id === noteId ? updated : n));
      setModuleData('notes', updatedNotes);

      try {
        await SheetsService.update('Notes', updated);
        addToast('Note saved', 'success');
      } catch {
        // Revert on failure
        setModuleData('notes', notes);
        addToast('Failed to save note', 'error');
      } finally {
        savingRef.current = false;
      }
    },
    [notes, setModuleData, addToast],
  );

  const scheduleSave = useCallback(
    (noteId: string, title: string, content: string, tags: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        saveNote(noteId, title, content, tags);
      }, 2000);
    },
    [saveNote],
  );

  const handleManualSave = useCallback(() => {
    if (!activeNoteId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveNote(activeNoteId, draftTitle, draftContent, draftTags);
  }, [activeNoteId, draftTitle, draftContent, draftTags, saveNote]);

  const handleTitleChange = useCallback(
    (value: string) => {
      setDraftTitle(value);
      if (activeNoteId) scheduleSave(activeNoteId, value, draftContent, draftTags);
    },
    [activeNoteId, draftContent, draftTags, scheduleSave],
  );

  const handleContentChange = useCallback(
    (value: string) => {
      setDraftContent(value);
      if (activeNoteId) scheduleSave(activeNoteId, draftTitle, value, draftTags);
    },
    [activeNoteId, draftTitle, draftTags, scheduleSave],
  );

  const handleTagsChange = useCallback(
    (value: string) => {
      setDraftTags(value);
      if (activeNoteId) scheduleSave(activeNoteId, draftTitle, draftContent, value);
    },
    [activeNoteId, draftTitle, draftContent, scheduleSave],
  );

  const handleCreate = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) return;

    const now = new Date().toISOString();
    const note: Note = {
      id: `note_${Date.now()}`,
      residentId: resident.id,
      title,
      content: '',
      tags: '',
      version: '1',
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic update
    const updatedNotes = [...notes, note];
    setModuleData('notes', updatedNotes);
    setNewTitle('');
    setCreating(false);
    setActiveNoteId(note.id);
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setDraftTags(note.tags);

    try {
      await SheetsService.append('Notes', note);
      addToast('Note created', 'success');
    } catch {
      setModuleData('notes', notes);
      setActiveNoteId(null);
      addToast('Failed to create note', 'error');
    }
  }, [newTitle, resident.id, notes, setModuleData, addToast]);

  const handleDelete = useCallback(
    async (noteId: string) => {
      const prev = notes;
      const updatedNotes = notes.filter(n => n.id !== noteId);
      setModuleData('notes', updatedNotes);

      if (activeNoteId === noteId) {
        setActiveNoteId(null);
      }

      try {
        await SheetsService.deleteRow('Notes', noteId);
        addToast('Note deleted', 'info');
      } catch {
        setModuleData('notes', prev);
        addToast('Failed to delete note', 'error');
      }
    },
    [notes, activeNoteId, setModuleData, addToast],
  );

  const handleBack = useCallback(() => {
    // Flush any pending autosave
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      if (activeNoteId) {
        saveNote(activeNoteId, draftTitle, draftContent, draftTags);
      }
    }
    setActiveNoteId(null);
  }, [activeNoteId, draftTitle, draftContent, draftTags, saveNote]);

  // ── Editor view ──
  if (activeNote) {
    return (
      <div>
        <div className="mod-header">
          <button className="mod-btn mod-btn--sm" onClick={handleBack}>
            Back
          </button>
          <span className="mod-title" style={{ marginLeft: 8 }}>
            Editing Note
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 9, color: '#8b9bb4' }}>
            v{activeNote.version}
          </span>
        </div>

        <div className="mod-form">
          <label>Title</label>
          <input
            value={draftTitle}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Note title..."
          />

          <label>Tags</label>
          <input
            value={draftTags}
            onChange={e => handleTagsChange(e.target.value)}
            placeholder="Comma-separated tags..."
          />

          <label>Content</label>
          <textarea
            value={draftContent}
            onChange={e => handleContentChange(e.target.value)}
            placeholder="Write your note here..."
            rows={12}
            style={{ width: '100%', resize: 'vertical' }}
          />

          <div className="mod-form-actions">
            <button className="mod-btn" onClick={handleManualSave}>
              Save
            </button>
            <button
              className="mod-btn mod-btn--danger"
              onClick={() => handleDelete(activeNote.id)}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div>
      <div className="mod-header">
        <span className="mod-title">Notes</span>
        <button className="mod-btn mod-btn--sm" onClick={() => setCreating(true)}>
          + New Note
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '0 0 8px' }}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          style={{ width: '100%' }}
        />
      </div>

      {/* Create form */}
      {creating && (
        <div className="mod-form" style={{ marginBottom: 8 }}>
          <div className="mod-form-row">
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="New note title..."
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{ flex: 1 }}
            />
          </div>
          <div className="mod-form-actions">
            <button className="mod-btn" onClick={handleCreate}>
              Create
            </button>
            <button
              className="mod-btn mod-btn--danger"
              onClick={() => {
                setCreating(false);
                setNewTitle('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes list */}
      {filteredNotes.length === 0 ? (
        <div className="mod-empty">
          {searchQuery ? 'No notes match your search.' : 'No notes yet. Create one!'}
        </div>
      ) : (
        filteredNotes.map(note => (
          <div
            key={note.id}
            className="mod-card"
            onClick={() => setActiveNoteId(note.id)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{note.title}</strong>
              <span style={{ fontSize: 8, color: '#8b9bb4' }}>v{note.version}</span>
            </div>
            <div style={{ fontSize: 9, color: '#8b9bb4', marginTop: 2 }}>
              {note.content.slice(0, 80)}
              {note.content.length > 80 ? '...' : ''}
            </div>
            {note.tags && (
              <div style={{ fontSize: 8, color: '#ffcd75', marginTop: 4 }}>{note.tags}</div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: 4,
              }}
            >
              <button
                className="mod-btn mod-btn--danger mod-btn--sm"
                onClick={e => {
                  e.stopPropagation();
                  handleDelete(note.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
