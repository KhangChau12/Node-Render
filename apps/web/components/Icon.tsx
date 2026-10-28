import React from "react";

/* Line icons (24×24, stroke). Keep the set small and consistent. */
const paths: Record<string, React.ReactNode> = {
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  blocks: (<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>),
  gear: (<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></>),
  doc: (<><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M8 13h8M8 17h5" /></>),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  history: (<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>),
  play: <path d="M7 4v16l13-8z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  prev: <path d="M6 5v14M18 6l-9 6 9 6z" />,
  next: <path d="M18 5v14M6 6l9 6-9 6z" />,
  send: <path d="M12 19V5M5 12l7-7 7 7" />,
  check: <path d="M5 12l5 5L20 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  alert: (<><path d="M12 3l9.5 17h-19z" /><path d="M12 10v4M12 17h.01" /></>),
  code: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />,
  sliders: (<><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  refresh: <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" />,
  safe: (<><rect x="3" y="5" width="18" height="14" rx="1" /><rect x="7" y="8" width="10" height="8" strokeDasharray="2 2" /></>),
  open: (<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v1H7l-4 9z" /><path d="M3 19l3.5-8H22l-3.5 8z" /></>),
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  up: <path d="M6 15l6-6 6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  lock: (<><rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  unlock: (<><rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></>),
  wand: <path d="M15 4V2M15 10V8M11 6H9M21 6h-2M18.5 3.5 17 5M3 21l11-11" />,
  speaker: (<><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9a4 4 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11" /></>),
  download: <path d="M12 4v12M6 10l6 6 6-6M4 20h16" />,
  cc: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3" /></>),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  chev: <path d="m6 9 6 6 6-6" />,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  film: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 5v14M17 5v14M3 12h18" /></>),
  undo: (<><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>),
  image: (<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></>),
  clip: <path d="m20 12-8.5 8.5a5 5 0 0 1-7-7L13 5a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 8" />,
};

export function Icon({ name, size = 16, style }: { name: keyof typeof paths | string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg className="i" viewBox="0 0 24 24" width={size} height={size} style={style} aria-hidden="true">
      {paths[name] ?? null}
    </svg>
  );
}
