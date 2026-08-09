import { useEffect, useRef } from 'react';

// Elements that can hold keyboard focus. `:not([disabled])` matters because a
// disabled control still matches the tag selectors but is skipped by the
// browser's own Tab order — including it would make the trap land on nothing.
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Keyboard and screen-reader behaviour for a modal dialog.
 *
 * Returns a ref to attach to the dialog container. While the dialog is open it:
 *
 *   - moves focus into the dialog, so a keyboard user is not left tabbing
 *     through the page behind it;
 *   - keeps Tab and Shift+Tab inside it (WCAG 2.1.2, No Keyboard Trap — which
 *     is about not trapping focus in a *widget the user cannot leave*; a modal
 *     is the sanctioned exception precisely because Escape always exits);
 *   - restores focus to whatever was focused before it opened, so dismissing a
 *     dialog returns you to the control that opened it rather than the top of
 *     the document;
 *   - closes on Escape.
 *
 * Callers still supply role="dialog", aria-modal and aria-labelledby on the
 * container — those are markup, not behaviour, and belong at the call site
 * where the title element's id is known.
 */
export default function useDialogA11y(isOpen, onClose) {
  const containerRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previouslyFocused.current = document.activeElement;

    const node = containerRef.current;
    if (node) {
      // Prefer the first real control; fall back to the container itself, which
      // needs tabIndex={-1} at the call site for this to take.
      const first = node.querySelector(FOCUSABLE);
      (first || node).focus?.();
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || !containerRef.current) return;

      const items = Array.from(containerRef.current.querySelectorAll(FOCUSABLE))
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      // Wrap at both ends. Without this, Tab from the last control escapes to
      // the browser chrome and the user cannot get back without a mouse.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      // Only restore if focus is still somewhere we put it; if the user has
      // clicked elsewhere in the meantime, yanking focus back is worse.
      const active = document.activeElement;
      const inDialog = containerRef.current?.contains(active);
      if ((inDialog || active === document.body) && previouslyFocused.current?.focus) {
        previouslyFocused.current.focus();
      }
    };
  }, [isOpen, onClose]);

  return containerRef;
}
