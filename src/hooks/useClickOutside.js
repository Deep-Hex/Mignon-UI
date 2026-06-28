import { useEffect } from 'react';

/**
 * Custom Hook to detect clicks outside a specific element.
 * 
 * @param {React.RefObject} ref - The React ref of the element to watch.
 * @param {Function} handler - Callback triggered when a click/touch happens outside the element.
 */
export function useClickOutside(ref, handler) {
  useEffect(() => {
    function listener(event) {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    }

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}
