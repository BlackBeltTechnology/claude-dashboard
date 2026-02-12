import { useEffect, useRef } from 'react';
import { useSessionStore } from '../store/sessionStore';

const DEFAULT_TITLE = 'Claude Dashboard';

/**
 * Count sessions in 'waiting' state.
 * Update document.title with count: "(2) Claude Dashboard"
 * Draw badge on favicon using canvas.
 */
export function useFaviconBadge() {
  const sessions = useSessionStore((state) => state.sessions);
  const originalFaviconRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Count waiting sessions (including subagents recursively)
  const waitingCount = countWaiting(sessions);

  // Update document title
  useEffect(() => {
    if (waitingCount > 0) {
      document.title = `(${waitingCount}) ${DEFAULT_TITLE}`;
    } else {
      document.title = DEFAULT_TITLE;
    }

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [waitingCount]);

  // Update favicon with badge
  useEffect(() => {
    // Store original favicon on first run
    if (originalFaviconRef.current === null) {
      const link = document.querySelector<HTMLLinkElement>(
        'link[rel="icon"], link[rel="shortcut icon"]'
      );
      originalFaviconRef.current = link?.href || '';
    }

    if (waitingCount === 0) {
      // Restore original favicon
      setFavicon(originalFaviconRef.current || '');
      return;
    }

    // Create canvas to draw badge
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 32;
      canvasRef.current.height = 32;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load original favicon as base image
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const draw = () => {
      ctx.clearRect(0, 0, 32, 32);

      // Draw original favicon (or a default circle if no favicon)
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0, 32, 32);
      } else {
        // Fallback: draw a dark circle as base
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(16, 16, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw badge circle in top-right
      const badgeRadius = 8;
      const badgeX = 32 - badgeRadius;
      const badgeY = badgeRadius;

      ctx.fillStyle = '#eab308'; // Yellow for waiting
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw count text
      ctx.fillStyle = '#000';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const countText = waitingCount > 9 ? '9+' : String(waitingCount);
      ctx.fillText(countText, badgeX, badgeY + 1);

      // Apply favicon
      try {
        const dataUrl = canvas.toDataURL('image/png');
        setFavicon(dataUrl);
      } catch {
        // Canvas tainted or other error - skip favicon update
      }
    };

    if (originalFaviconRef.current) {
      img.onload = draw;
      img.onerror = draw; // Still draw badge even if favicon fails to load
      img.src = originalFaviconRef.current;
    } else {
      draw();
    }
  }, [waitingCount]);
}

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  if (href) {
    link.href = href;
  }
}

/** Recursively count sessions (and subagents) in 'waiting' state. */
function countWaiting(
  sessions: { state: string; subagents: { state: string; subagents: any[] }[] }[]
): number {
  let count = 0;
  for (const session of sessions) {
    if (session.state === 'waiting') count++;
    if (session.subagents && session.subagents.length > 0) {
      count += countWaiting(session.subagents as any);
    }
  }
  return count;
}
