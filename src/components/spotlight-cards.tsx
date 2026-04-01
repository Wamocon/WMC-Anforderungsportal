'use client';

import { useEffect } from 'react';

/**
 * Registers mouse-tracking on all `.spotlight-card` elements
 * to create a spotlight glow that follows the cursor.
 */
export function SpotlightCards() {
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const cards = document.querySelectorAll<HTMLElement>('.spotlight-card');
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    }

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return null;
}
