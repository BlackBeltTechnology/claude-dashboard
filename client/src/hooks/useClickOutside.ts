import { useEffect, type RefObject } from 'react';

/**
 * Hook that detects clicks outside of the referenced element and calls the handler.
 * Uses 'mousedown' instead of 'click' to prevent the open-close race condition
 * where the same click that opens a panel immediately triggers the outside-click handler.
 *
 * @param ref - React ref attached to the element to monitor
 * @param handler - Callback invoked when a click outside is detected
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void
): void {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      // If the ref element doesn't exist or the click is inside, do nothing
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
    };
  }, [ref, handler]);
}
