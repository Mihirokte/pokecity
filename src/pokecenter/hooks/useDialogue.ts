import { useState, useEffect, useCallback, useRef } from 'react';

export interface DialogueState {
  full: string;
  displayed: string;
  onDone?: () => void;
}

export function useDialogue() {
  const [dialogue, setDialogue] = useState<DialogueState | null>(null);
  const [charIdx, setCharIdx] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const show = useCallback((text: string, onDone?: () => void) => {
    setDialogue({ full: text, displayed: '', onDone });
    setCharIdx(0);
    setIsComplete(false);
  }, []);

  const dismiss = useCallback(() => {
    setDialogue(null);
    setCharIdx(0);
    setIsComplete(false);
  }, []);

  // Typewriter effect — all state changes happen inside the timeout callback
  useEffect(() => {
    if (!dialogue || isComplete) return;
    timerRef.current = setTimeout(() => {
      const nextIdx = charIdx + 1;
      if (nextIdx >= dialogue.full.length) {
        setDialogue(d => d ? { ...d, displayed: d.full } : null);
        setCharIdx(nextIdx);
        setIsComplete(true);
      } else {
        setDialogue(d => d ? { ...d, displayed: d.full.slice(0, nextIdx) } : null);
        setCharIdx(nextIdx);
      }
    }, charIdx === 0 ? 0 : 28);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [dialogue, charIdx, isComplete]);

  const advance = useCallback(() => {
    if (!dialogue) return false;
    if (!isComplete) {
      // Skip to end
      setDialogue(d => d ? { ...d, displayed: d.full } : null);
      setCharIdx(dialogue.full.length);
      setIsComplete(true);
      return true;
    }
    // Complete - dismiss and call onDone
    const cb = dialogue.onDone;
    dismiss();
    if (cb) cb();
    return true;
  }, [dialogue, isComplete, dismiss]);

  return { dialogue, isComplete, show, advance, dismiss, isActive: !!dialogue };
}
