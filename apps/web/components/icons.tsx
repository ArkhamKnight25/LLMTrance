import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
} as const;

export const ChatIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2 3h12v8H7l-3 3v-3H2V3z" />
  </svg>
);
export const ConversationsIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2 3h10v7H5l-3 2.5V3z" />
    <path d="M14 6v5h-4" strokeOpacity="0.55" />
  </svg>
);
export const DashboardIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="2" y="2" width="5.5" height="6" />
    <rect x="8.5" y="2" width="5.5" height="3.5" />
    <rect x="2" y="9" width="5.5" height="5" />
    <rect x="8.5" y="6.5" width="5.5" height="7.5" />
  </svg>
);
export const LogsIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 2h7l3 3v9H3V2z" />
    <path d="M10 2v3h3" />
    <path d="M5 8h6M5 11h4" strokeOpacity="0.5" />
  </svg>
);
export const PlusIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 3v10M3 8h10" />
  </svg>
);
export const CancelIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="8" height="8" />
  </svg>
);
export const ArrowRightIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);
export const ArrowUpIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 13V3M4 7l4-4 4 4" />
  </svg>
);
export const ChevronIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 6l4 4 4-4" />
  </svg>
);
export const FilterIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2 3h12l-5 6v4l-2 1V9L2 3z" />
  </svg>
);
export const SearchIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M11 11l3 3" />
  </svg>
);
export const RefreshIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 8a6 6 0 1 1-1.76-4.24" />
    <path d="M14 2v3.5h-3.5" />
  </svg>
);
export const SparkIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 1.5l1.5 5 5 1.5-5 1.5L8 14.5l-1.5-5L1.5 8l5-1.5L8 1.5z" />
  </svg>
);
export const ResumeIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 3l8 5-8 5V3z" />
  </svg>
);
