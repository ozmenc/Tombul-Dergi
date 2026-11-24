/** Tek tip çizgi ikonlar (24×24). Süs olarak işaretlenir; anlamı yanındaki metin ya da aria-label taşır. */
const PATHS = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  search: "M11 4a7 7 0 1 1 0 14a7 7 0 0 1 0-14zM20 20l-3.5-3.5",
  bookmark: "M6 3h12v18l-6-4-6 4z",
  pen: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  plus: "M12 5v14M5 12h14",
  like: "M7 10v11H4V10zM7 10l4-7a2.5 2.5 0 0 1 3 3l-1 4h5.5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.3 21H7",
  dislike: "M17 14V3h3v11zM17 14l-4 7a2.5 2.5 0 0 1-3-3l1-4H5.5a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 6.7 3H17",
  comment: "M4 5h16v11H9l-5 4z",
  share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M7 8l5-5 5 5",
  back: "M15 18l-6-6 6-6",
  close: "M6 6l12 12M18 6L6 18",
  sun: "M12 8a4 4 0 1 1 0 8a4 4 0 0 1 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5",
  moon: "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z",
  user: "M12 4a4 4 0 1 1 0 8a4 4 0 0 1 0-8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6",
  users: "M9 4a4 4 0 1 1 0 8a4 4 0 0 1 0-8zM2 21c1-4 4-6 7-6s6 2 7 6M17 11a3 3 0 1 0 0-6M22 21c-.5-3-2-4.5-4-5",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  grid: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  tag: "M3 12V4h8l10 10-8 8zM7.5 7.5h.01",
  folder: "M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 1 0 6a3 3 0 0 1 0-6z",
  eyeOff: "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  reply: "M10 9V5l-7 7 7 7v-4c5 0 8.5 1.5 11 5-1-5-4-10-11-11z",
  star: "M12 3l2.6 5.8 6.4.6-4.8 4.3 1.4 6.3L12 16.8 6.4 20l1.4-6.3L3 9.4l6.4-.6z",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  image: "M3 5h18v14H3zM8.5 10a1.5 1.5 0 1 0 0-.01M21 16l-5-5-9 8",
  check: "M5 12l5 5L20 7",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  settings: "M12 9a3 3 0 1 1 0 6a3 3 0 0 1 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "icon", filled = false }: { name: IconName; className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
