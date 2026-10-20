import React, { useEffect, useRef } from 'react';

/** Changes this close together (while typing) count as one undo step. */
const TYPING_GROUP_MS = 1_000;
const MAX_STEPS = 100;

/**
 * Ctrl+Z / Ctrl+Y (Cmd+Z / Cmd+Shift+Z on a Mac) for a text box whose value is React state. The browser's own undo
 * cannot step back over text that the app put there (a template, Improve with AI, Speak), so this keeps its own
 * history of every change: a burst of typing is one step, and every change made by a button is a step of its own.
 * Spread `onKeyDown` onto the textarea.
 */
export function useTextHistory(value: string, setValue: (value: string) => void) {
  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);
  const current = useRef(value);
  const lastChangeAt = useRef(0);
  const lastWasTyping = useRef(false);
  /** The value an undo/redo just set, so that change is not recorded as a new step. */
  const restoring = useRef<string | null>(null);

  useEffect(() => {
    if (value === current.current) return;
    if (restoring.current === value) {
      restoring.current = null;
      current.current = value;
      return;
    }
    const now = Date.now();
    // Typing changes a character or two at a time; anything bigger came from a button and gets its own step.
    const typing = Math.abs(value.length - current.current.length) <= 2;
    const continuesTyping = typing && lastWasTyping.current && now - lastChangeAt.current < TYPING_GROUP_MS;
    if (!continuesTyping) {
      past.current.push(current.current);
      if (past.current.length > MAX_STEPS) past.current.shift();
    }
    future.current = [];
    current.current = value;
    lastChangeAt.current = now;
    lastWasTyping.current = typing;
  }, [value]);

  const step = (from: React.MutableRefObject<string[]>, to: React.MutableRefObject<string[]>) => {
    const next = from.current.pop();
    if (next === undefined) return;
    to.current.push(current.current);
    lastWasTyping.current = false;
    if (next === current.current) return;
    restoring.current = next;
    setValue(next);
  };

  const undo = () => step(past, future);
  const redo = () => step(future, past);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if ((key === 'z' && event.shiftKey) || key === 'y') {
      event.preventDefault();
      redo();
    }
  };

  return { undo, redo, onKeyDown };
}
