import type { ReactNode } from "react";

const P: Record<string, ReactNode> = {
  home: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  map: <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  compass: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>,
  bell: <path d="M6 16v-5a6 6 0 1112 0v5l2 2H4zM10 21h4" />,
  arrow: <path d="M7 17L17 7M8 7h9v9" />,
  pin: <><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  locate: <><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="7.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  layers: <path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" />,
  back: <path d="M15 5l-7 7 7 7" />,
  road: <path d="M6 21L9 3M18 21L15 3M12 5v3M12 11v3M12 17v3" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  traffic: <><rect x="8" y="2" width="8" height="20" rx="2" /><circle cx="12" cy="7" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="12" cy="17" r="1.4" /></>,
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></>,
  check: <path d="M5 12l5 5 9-10" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  water: <path d="M12 3s6 6.2 6 10.5a6 6 0 11-12 0C6 9.2 12 3 12 3z" />,
  mountain: <path d="M3 20l6-10 4 6 3-4 5 8z" />,
  fork: <path d="M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M17 3c-2 1-3 4-3 7h3v11" />,
  calendar: <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></>,
  wind: <path d="M3 8h11a3 3 0 10-3-3M3 12h16a3 3 0 11-3 3M3 16h8" />,
  cloud: <path d="M7 18a4 4 0 01-.5-8 5.5 5.5 0 0110.7 1A3.5 3.5 0 0117 18z" />,
  download: <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></>,
  logout: <path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  store: <path d="M4 9l1-5h14l1 5M4 9v11h16V9M4 9a2.5 2.5 0 005 0 2.5 2.5 0 006 0 2.5 2.5 0 005 0M10 20v-6h4v6" />,
  megaphone: <path d="M4 10v4h3l8 4V6L7 10zM18 9a4 4 0 010 6" />,
  poll: <path d="M5 20V10M12 20V4M19 20v-7" />,
  mail: <path d="M3 6h18v12H3zM3 7l9 7 9-7" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  inbox: <path d="M3 13l3-8h12l3 8v6H3zM3 13h6l1 3h4l1-3h6" />,
  alert: <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></>,
};

export type IconName = keyof typeof P;

export default function Icon({ name, className = "h-6 w-6" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {P[name]}
    </svg>
  );
}
