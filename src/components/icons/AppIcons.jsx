import React from 'react';

const Svg = ({ viewBox, children, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={viewBox}
    width="1em"
    height="1em"
    {...props}
  >
    {children}
  </svg>
);

export const EarIcon = (props) => (
  <Svg viewBox="0 0 512 512" {...props}>
    <path
      fill="currentColor"
      d="M273.063 47.188c-1.974.032-3.98.123-6 .25c-60.62 3.805-100.33 35.933-123.563 83.78c-22.862 47.083-28.442 109.71-17.125 172.47l1.75 1.75l-1.406 5.718c-3.43 14.203-1.17 31.297 4.28 45.97c5.45 14.67 14.52 26.75 20.594 30.78l5.03 3.344l-.374 6c-1.355 21.968 6.887 38.96 18.438 50.688c11.55 11.726 26.687 17.447 36.593 16.843c10.25-.623 15.605-3.796 21.25-10c5.648-6.202 10.894-16.054 17.064-28.28c12.34-24.452 28.935-57.856 68.094-87.094c63.353-47.305 82.793-122.987 70-185.656c-6.397-31.334-20.867-59.136-41.407-78.313c-17.97-16.78-40.38-27.204-67.374-28.187c-1.928-.07-3.87-.095-5.844-.063m-6.875 54.156a91 91 0 0 1 3.843 0c26.317.48 51.695 12.228 69.314 35.437A9 9 0 1 1 325 147.657c-25.65-33.79-69.065-37.748-104.344-12.437c-18.275 13.11-34.26 34.452-43.312 64.343c12.93-13.697 27.912-27.055 44.5-35.532c9.905-5.06 20.616-8.356 31.656-8.405c3.68-.016 7.393.332 11.125 1.094c14.928 3.046 29.34 12.706 42.188 29.686a9.003 9.003 0 1 1-14.375 10.844c-10.987-14.52-21.443-20.872-31.407-22.906c-9.962-2.034-20.222.21-31 5.72c-21.54 11.006-43.38 35.2-59.5 54.686c-1.83 18.726-1.345 39.794 2.126 63.25c12.828.502 23.317 3.768 30.97 9.72c9.264 7.204 13.86 17.8 14.53 28.25c1.343 20.897-10.62 42.6-30.625 51.06a9.01 9.01 0 0 1-7.03-16.592c11.446-4.842 20.493-20.77 19.688-33.313c-.403-6.27-2.644-11.314-7.625-15.188c-4.982-3.873-13.416-6.82-27.22-6.062a9 9 0 0 1-9.374-7.47c-16.06-93.725 12.22-157.702 54.186-187.81c17.214-12.35 36.787-18.802 56.03-19.25z"
    />
  </Svg>
);

export const QuillIcon = (props) => (
  <Svg viewBox="0 0 512 512" {...props}>
    <path
      fill="currentColor"
      d="M496.938 14.063c-95.14 3.496-172.297 24.08-231.282 55.812l-29.47 49.28l-4.967-28.093c-10.535 7.402-20.314 15.222-29.314 23.407l-14.687 45.06l-5.032-25.155c-40.65 45.507-60.41 99.864-58.938 155.906c47.273-93.667 132.404-172.727 211.97-221.155l9.717 15.97c-75.312 45.838-156.387 121.202-202.187 208.25h12.156c19.78-12.02 39.16-26.858 58.406-43.44l-30.28 1.595l54.218-23.094c46.875-43.637 93.465-94.974 143.313-138.28l-24.47-5.19l56.5-21.03c26.853-20.485 54.8-37.844 84.344-49.843zM59.53 312.03v30.408H194V312.03zm20.376 49.095L47.25 389.813L24.97 474.78l14.53 15.876h177.22l14.56-15.875L209 389.814l-30.906-28.688H79.906z"
    />
  </Svg>
);

export const DrumKitIcon = (props) => (
  <Svg viewBox="0 0 512 512" {...props}>
    <path
      fill="currentColor"
      d="m111 58.3l-87.37.4l-.61 8.3L192.4 92.6l1.8-8.1zm310.8 18.8l-.3 29.7l5-.8l4.9.8l-.3-29.7zM96.33 92.8l-1.81 13l-33.17 26.4l1.84 115.6l6.16-40.4l9.55-2.3h.28l-1.03-65l31.95-25.4l2.7-19.4zm330.17 25.9l-66.6 10.4l.6 8.3h132l.6-8.3zm-66 33.3l-.6 8.3l66.6 10.4l66.6-10.4l-.6-8.3zm60.3 30.5l-.2 20.8c2.8.5 5.6 1.2 8.5 1.8l3.3.8l-.2-23.4l-5.7.9zm-287.4 30.7c-16.5-.2-33.5 1.9-51.1 6.1l-2.86 18.8c23.26-3.3 75.96-6.9 127.56 14.6c4-1.6 8.2-3.1 12.4-4.3l1.2-8c-26.6-18.2-55.8-26.8-87.2-27.2m241.2 0c-31.4.4-60.6 9-87.2 27.2l1.2 8c4.2 1.2 8.4 2.7 12.4 4.3c51.6-21.5 104.3-17.9 127.6-14.6l-2.9-18.8c-17.6-4.2-34.6-6.3-51.1-6.1m-258.1 39c-17.91 0-32.1 1.8-39.69 3.1l-7.05 46.3l72.94 11.1c10.1-20.3 25.5-37.5 44.5-49.6c-25.4-8.5-50.4-10.9-70.7-10.9m275 0c-20.3 0-45.3 2.4-70.7 10.9c19 12.1 34.4 29.3 44.5 49.6l72.9-11.1l-7-46.3c-7.6-1.3-21.8-3.1-39.7-3.1m-137.5 10c-49.9 0-90.4 40.5-90.4 90.4S204.1 443 254 443s90.4-40.5 90.4-90.4s-40.5-90.4-90.4-90.4M64.27 315.5l1.36 85.5l-46.73 87h18.94l33.24-62l15.19 62h17.23l-21.19-86l-1.33-84zM433.6 317l-14.2 2.2l-.8 74.1l-24.2 55.7l7.4 25l24.7-57l30.9 71h18.2l-41.2-94.7zm-279.7 11.6c-4.7 12.1-7.2 25.2-7.2 38.9C146.7 427 194.8 475 254 475s107.3-48 107.3-107.5c0-13.7-2.5-26.8-7.2-38.9c1.8 7.7 2.8 15.8 2.8 24C356.9 409 310.8 456 254 456s-102.9-47-102.9-103.4c0-8.2 1-16.3 2.8-24m-18 77.4l-20.2 82h25.7l11.8-48c-7.4-11-13.3-22-17.3-34m236.2 0c-4 12-9.9 23-17.3 34l11.8 48h25.7z"
    />
  </Svg>
);

export const BoomboxIcon = (props) => (
  <Svg viewBox="0 0 512 512" {...props}>
    <path
      fill="currentColor"
      d="m369.1 24.54l-12.6 12.92c-9.2 14.71-9.7 34.33-7.6 53.05c-2.9-.39-5.9-.46-8.9-.2c-16.1 1.38-28.4 11.59-27.4 22.89c1 11.2 14.8 19.2 30.9 17.8c8.8-.7 17-4.2 22.1-9.5c1.7 10.8 15.2 18.2 30.7 16.9c16.1-1.4 28.4-11.6 27.4-22.9c-.2-2.3-.9-4.5-2.1-6.5c-3.4-19.63-4.2-38.02 4.8-57.07c-18.6-5.91-44-16.31-57.3-27.39m2.4 24.77c10.1 6.59 21.3 11.42 32 14.24c-2.6 11.7-2.6 23.19-1.6 34.32c-3-.42-6-.5-9.1-.24c-8.8.77-16.9 4.27-22 9.57c-.3-2-1.1-3.9-2.2-5.7c-3.1-17.98-3.9-34.87 2.9-52.19M111.4 63.88c-13.92 5.83-36.33 8.22-53.82 3.71l-4.5 17.43c2.08 18.88 10 35.28 19.99 49.68a20.44 29.25 55.36 0 0-8.08 4.4a20.44 29.25 55.36 0 0-12.45 33.4a20.44 29.25 55.36 0 0 35.69.2a20.44 29.25 55.36 0 0 12.47-33.4a20.44 29.25 55.36 0 0-5.4-4.7c-11.6-14-20.7-28.3-23.28-46.69c16.57.96 33.18-1.91 46.38-7.43zM151 167v48h16v-32h178v32h16v-48zM25 233v238h462V233zm39 14h64v18H64zm112 0h160v18H176zm208 0h64v18h-64zM48 279h416v18H48zm64 32c40.2 0 73 32.8 73 73s-32.8 73-73 73c-40.21 0-73-32.8-73-73s32.79-73 73-73m87 0h114v82H199zm201 0c40.2 0 73 32.8 73 73s-32.8 73-73 73s-73-32.8-73-73s32.8-73 73-73m-288 18c-30.48 0-55 24.5-55 55s24.52 55 55 55c30.5 0 55-24.5 55-55s-24.5-55-55-55m105 0v46h78v-46zm183 0c-30.5 0-55 24.5-55 55s24.5 55 55 55s55-24.5 55-55s-24.5-55-55-55m-288 30c13.7 0 25 11.3 25 25s-11.3 25-25 25s-25-11.3-25-25s11.3-25 25-25m288 0c13.7 0 25 11.3 25 25s-11.3 25-25 25s-25-11.3-25-25s11.3-25 25-25m-288 18c-4 0-7 3-7 7s3 7 7 7s7-3 7-7s-3-7-7-7m288 0c-4 0-7 3-7 7s3 7 7 7s7-3 7-7s-3-7-7-7m-185 39h18v32h-18zm32 0h18v32h-18zm32 0h18v32h-18z"
    />
  </Svg>
);

export const MicrophoneIcon = (props) => (
  <Svg viewBox="0 0 256 256" {...props}>
    <path
      fill="currentColor"
      d="M128 176a48.05 48.05 0 0 0 48-48V64a48 48 0 0 0-96 0v64a48.05 48.05 0 0 0 48 48M96 64a32 32 0 0 1 64 0v64a32 32 0 0 1-64 0Zm40 143.6V240a8 8 0 0 1-16 0v-32.4A80.11 80.11 0 0 1 48 128a8 8 0 0 1 16 0a64 64 0 0 0 128 0a8 8 0 0 1 16 0a80.11 80.11 0 0 1-72 79.6"
    />
  </Svg>
);

export const GuitarPickIcon = (props) => (
  <Svg viewBox="0 0 24 24" {...props}>
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M16 18.5C18 16 20 12 20 8c0-2.946-2.084-4.157-4.204-4.654Q14.5 3.001 12 3q-2.5 0-3.796.346C6.084 3.843 4 5.054 4 8c0 3.312 2 8 4 10.5q.445.556.963 1.081l.354.347a3.9 3.9 0 0 0 5.364 0A14 14 0 0 0 16 18.5"
    />
  </Svg>
);

export const PentatonicBoxIcon = (props) => (
  <Svg viewBox="0 0 100 60" strokeLinecap="round" {...props}>
    <g stroke="currentColor" strokeWidth="0.6" fill="none" opacity="0.45">
      <line x1="18" y1="6" x2="18" y2="54" />
      <line x1="40" y1="6" x2="40" y2="54" />
      <line x1="62" y1="6" x2="62" y2="54" />
      <line x1="84" y1="6" x2="84" y2="54" />
    </g>
    <g stroke="currentColor" strokeWidth="0.9" fill="none">
      <line x1="13" y1="10" x2="89" y2="10" />
      <line x1="13" y1="18" x2="89" y2="18" />
      <line x1="13" y1="27" x2="89" y2="27" />
      <line x1="13" y1="36" x2="89" y2="36" />
      <line x1="13" y1="45" x2="89" y2="45" />
      <line x1="13" y1="54" x2="89" y2="54" />
    </g>
    <g stroke="currentColor" strokeWidth="1.2" fill="none">
      <circle cx="84" cy="10" r="2.6" />
      <circle cx="18" cy="18" r="2.6" />
      <circle cx="84" cy="18" r="2.6" />
      <circle cx="18" cy="27" r="2.6" />
      <circle cx="62" cy="27" r="2.6" />
      <circle cx="18" cy="36" r="2.6" />
      <circle cx="18" cy="45" r="2.6" />
      <circle cx="62" cy="45" r="2.6" />
      <circle cx="84" cy="54" r="2.6" />
    </g>
    <g fill="currentColor">
      <circle cx="18" cy="10" r="4" />
      <circle cx="62" cy="36" r="4" />
      <circle cx="18" cy="54" r="4" />
    </g>
  </Svg>
);

export const QuarterNoteIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g fill="currentColor">
      <ellipse cx="22" cy="46" rx="9" ry="6" transform="rotate(-20 22 46)" />
      <rect x="28" y="10" width="3" height="36" />
      <path d="M28 10c14 4 18 14 18 22-2-8-8-13-18-14z" />
    </g>
  </Svg>
);

export const PianoOctaveIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <rect x="4" y="14" width="56" height="36" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <g stroke="currentColor" strokeWidth="1.6">
      <line x1="12" y1="14" x2="12" y2="50" />
      <line x1="20" y1="14" x2="20" y2="50" />
      <line x1="28" y1="14" x2="28" y2="50" />
      <line x1="36" y1="14" x2="36" y2="50" />
      <line x1="44" y1="14" x2="44" y2="50" />
      <line x1="52" y1="14" x2="52" y2="50" />
    </g>
    <g fill="currentColor">
      <rect x="9" y="14" width="6" height="22" />
      <rect x="17" y="14" width="6" height="22" />
      <rect x="33" y="14" width="6" height="22" />
      <rect x="41" y="14" width="6" height="22" />
      <rect x="49" y="14" width="6" height="22" />
    </g>
  </Svg>
);

export const HubRomanIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeDasharray="2.5 3">
      <line x1="32" y1="32" x2="12" y2="14" />
      <line x1="32" y1="32" x2="54" y2="16" />
      <line x1="32" y1="32" x2="50" y2="52" />
    </g>
    <g fill="currentColor">
      <circle cx="32" cy="32" r="9" />
      <circle cx="12" cy="14" r="6" />
      <circle cx="54" cy="16" r="6" />
      <circle cx="50" cy="52" r="6" />
    </g>
    <g fill="rgba(0,0,0,0.65)" fontSize="9" textAnchor="middle" fontFamily="Special Elite, monospace">
      <text x="32" y="35.5">I</text>
      <text x="12" y="17.5">ii</text>
      <text x="54" y="19.5">IV</text>
      <text x="50" y="55.5">V</text>
    </g>
  </Svg>
);

export const VoicesCrossIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g fill="currentColor">
      <circle cx="10" cy="18" r="3.4" />
      <circle cx="10" cy="46" r="3.4" />
      <circle cx="54" cy="18" r="3.4" />
      <circle cx="54" cy="46" r="3.4" />
    </g>
    <g stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
      <path d="M13.5 18 Q32 18 54 46" />
      <path d="M13.5 46 Q32 46 54 18" />
    </g>
  </Svg>
);

export const SingerStaffIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g fill="currentColor">
      <circle cx="20" cy="20" r="10" />
      <path d="M8 54q0-14 12-14t12 14v6H8z" />
    </g>
    <g stroke="currentColor" strokeWidth="1.1" fill="none" opacity="0.55">
      <line x1="36" y1="22" x2="60" y2="22" />
      <line x1="36" y1="26" x2="60" y2="26" />
      <line x1="36" y1="30" x2="60" y2="30" />
      <line x1="36" y1="34" x2="60" y2="34" />
      <line x1="36" y1="38" x2="60" y2="38" />
    </g>
    <g fill="currentColor">
      <ellipse cx="44" cy="26" rx="3.4" ry="2.4" />
      <rect x="47" y="14" width="1.6" height="12" />
      <ellipse cx="56" cy="32" rx="3.4" ry="2.4" />
      <rect x="59" y="20" width="1.6" height="12" />
    </g>
  </Svg>
);

export const BoltAuraIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.45">
      <line x1="4" y1="20" x2="14" y2="22" />
      <line x1="50" y1="22" x2="60" y2="20" />
      <line x1="6" y1="42" x2="14" y2="42" />
      <line x1="50" y1="42" x2="58" y2="42" />
      <line x1="14" y1="8" x2="20" y2="14" />
      <line x1="44" y1="14" x2="50" y2="8" />
    </g>
    <path fill="currentColor" d="M38 4L18 32h10L20 60l24-32h-10L40 4z" />
  </Svg>
);

// ─────────────────────────────────────────────
// Exercise-level icons (own design, MIT)
// ─────────────────────────────────────────────

export const TargetIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="32" cy="32" r="22" />
      <circle cx="32" cy="32" r="14" />
    </g>
    <circle cx="32" cy="32" r="6" fill="currentColor" />
  </Svg>
);

export const DirectionUpIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g fill="currentColor">
      <ellipse cx="12" cy="46" rx="6" ry="4" transform="rotate(-20 12 46)" />
      <rect x="17" y="22" width="2.5" height="24" />
      <ellipse cx="48" cy="22" rx="6" ry="4" transform="rotate(-20 48 22)" />
      <rect x="53" y="-2" width="2.5" height="24" />
    </g>
    <g stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 38 L 42 22" />
      <path d="M34 22 L 42 22 L 42 30" />
    </g>
  </Svg>
);

export const ScaleAscendingIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g stroke="currentColor" strokeWidth="0.9" fill="none" opacity="0.4">
      <line x1="2" y1="14" x2="62" y2="14" />
      <line x1="2" y1="22" x2="62" y2="22" />
      <line x1="2" y1="30" x2="62" y2="30" />
      <line x1="2" y1="38" x2="62" y2="38" />
      <line x1="2" y1="46" x2="62" y2="46" />
    </g>
    <g fill="currentColor">
      <ellipse cx="7" cy="46" rx="3.2" ry="2.3" />
      <ellipse cx="16" cy="42" rx="3.2" ry="2.3" />
      <ellipse cx="25" cy="38" rx="3.2" ry="2.3" />
      <ellipse cx="33" cy="34" rx="3.2" ry="2.3" />
      <ellipse cx="41" cy="30" rx="3.2" ry="2.3" />
      <ellipse cx="49" cy="26" rx="3.2" ry="2.3" />
      <ellipse cx="57" cy="22" rx="3.2" ry="2.3" />
    </g>
  </Svg>
);

export const ChordTriadIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g fill="currentColor">
      <ellipse cx="32" cy="20" rx="12" ry="4.5" />
      <ellipse cx="32" cy="32" rx="12" ry="4.5" />
      <ellipse cx="32" cy="44" rx="12" ry="4.5" />
    </g>
  </Svg>
);

export const ChordInversionIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g fill="currentColor">
      <ellipse cx="22" cy="18" rx="9" ry="3.6" />
      <ellipse cx="22" cy="30" rx="9" ry="3.6" />
      <ellipse cx="22" cy="42" rx="9" ry="3.6" />
    </g>
    <g stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M42 16 A 14 14 0 0 1 56 30 A 14 14 0 0 1 42 44" />
      <path d="M38 44 L 42 44 L 42 40" />
    </g>
  </Svg>
);

export const Chord7Icon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g fill="currentColor">
      <ellipse cx="32" cy="14" rx="12" ry="4" />
      <ellipse cx="32" cy="24" rx="12" ry="4" />
      <ellipse cx="32" cy="34" rx="12" ry="4" />
      <ellipse cx="32" cy="44" rx="12" ry="4" />
    </g>
  </Svg>
);

export const ChordTensionsIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g fill="currentColor">
      <ellipse cx="32" cy="40" rx="11" ry="4" />
      <ellipse cx="32" cy="48" rx="11" ry="4" />
      <ellipse cx="32" cy="56" rx="11" ry="4" />
    </g>
    <g stroke="currentColor" strokeWidth="1.6" fill="none">
      <ellipse cx="32" cy="10" rx="9" ry="3" />
      <ellipse cx="32" cy="18" rx="9" ry="3" />
      <ellipse cx="32" cy="26" rx="9" ry="3" />
    </g>
  </Svg>
);

export const DegreeRomanIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g fill="currentColor">
      <ellipse cx="20" cy="22" rx="10" ry="4" />
      <ellipse cx="20" cy="32" rx="10" ry="4" />
      <ellipse cx="20" cy="42" rx="10" ry="4" />
    </g>
    <text x="48" y="38" textAnchor="middle" fill="currentColor" fontSize="22" fontWeight="700" fontFamily="Special Elite, monospace">V</text>
  </Svg>
);

export const CadenceIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g fill="currentColor">
      <ellipse cx="10" cy="22" rx="7" ry="3" />
      <ellipse cx="10" cy="30" rx="7" ry="3" />
      <ellipse cx="10" cy="38" rx="7" ry="3" />
      <ellipse cx="54" cy="22" rx="7" ry="3" />
      <ellipse cx="54" cy="30" rx="7" ry="3" />
      <ellipse cx="54" cy="38" rx="7" ry="3" />
    </g>
    <g stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 30 L 44 30" />
      <path d="M40 25 L 44 30 L 40 35" />
    </g>
  </Svg>
);

export const HarmonicDictationIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g fill="currentColor">
      <ellipse cx="18" cy="22" rx="9" ry="3.5" />
      <ellipse cx="18" cy="32" rx="9" ry="3.5" />
      <ellipse cx="18" cy="42" rx="9" ry="3.5" />
    </g>
    <g fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M52 10 L 60 18 L 38 50 L 30 42 Z" />
      <path d="M30 42 L 26 58 L 38 50" />
    </g>
  </Svg>
);

export const MetronomeIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 56 L 30 8 L 38 56 Z" />
      <line x1="22" y1="46" x2="36" y2="46" />
    </g>
    <line x1="30" y1="40" x2="50" y2="14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="50" cy="14" r="3.5" fill="currentColor" />
    <circle cx="34" cy="38" r="2.5" fill="currentColor" />
  </Svg>
);

export const ProgressionIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round">
      <rect x="3" y="22" width="13" height="20" rx="1.5" fill="currentColor" fillOpacity="0.15" />
      <rect x="18" y="22" width="13" height="20" rx="1.5" fill="currentColor" fillOpacity="0.15" />
      <rect x="33" y="22" width="13" height="20" rx="1.5" fill="currentColor" fillOpacity="0.15" />
      <rect x="48" y="22" width="13" height="20" rx="1.5" fill="currentColor" fillOpacity="0.15" />
    </g>
    <g fill="currentColor">
      <circle cx="9.5" cy="32" r="2.2" />
      <circle cx="24.5" cy="32" r="2.2" />
      <circle cx="39.5" cy="32" r="2.2" />
      <circle cx="54.5" cy="32" r="2.2" />
    </g>
  </Svg>
);

export const BassLineIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5">
      <line x1="2" y1="32" x2="62" y2="32" />
      <line x1="2" y1="40" x2="62" y2="40" />
      <line x1="2" y1="48" x2="62" y2="48" />
    </g>
    <g fill="currentColor">
      <ellipse cx="10" cy="44" rx="4" ry="3" />
      <ellipse cx="22" cy="48" rx="4" ry="3" />
      <ellipse cx="34" cy="40" rx="4" ry="3" />
      <ellipse cx="46" cy="44" rx="4" ry="3" />
      <ellipse cx="58" cy="48" rx="4" ry="3" />
    </g>
    <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7">
      <path d="M10 44 L 22 48 L 34 40 L 46 44 L 58 48" />
    </g>
  </Svg>
);

export const SopranoLineIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5">
      <line x1="2" y1="16" x2="62" y2="16" />
      <line x1="2" y1="24" x2="62" y2="24" />
      <line x1="2" y1="32" x2="62" y2="32" />
    </g>
    <g fill="currentColor">
      <ellipse cx="10" cy="20" rx="4" ry="3" />
      <ellipse cx="22" cy="16" rx="4" ry="3" />
      <ellipse cx="34" cy="24" rx="4" ry="3" />
      <ellipse cx="46" cy="20" rx="4" ry="3" />
      <ellipse cx="58" cy="16" rx="4" ry="3" />
    </g>
    <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7">
      <path d="M10 20 L 22 16 L 34 24 L 46 20 L 58 16" />
    </g>
  </Svg>
);

export const SightSingingIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g fill="currentColor">
      <ellipse cx="12" cy="42" rx="6" ry="4" transform="rotate(-20 12 42)" />
      <rect x="17" y="16" width="2.5" height="26" />
    </g>
    <circle cx="44" cy="34" r="13" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <ellipse cx="44" cy="38" rx="5" ry="3" fill="currentColor" />
    <g fill="currentColor">
      <circle cx="40" cy="30" r="1.6" />
      <circle cx="48" cy="30" r="1.6" />
    </g>
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55">
      <path d="M58 22 Q 62 32 58 42" />
    </g>
  </Svg>
);

export const SheetReadingIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.55">
      <line x1="32" y1="16" x2="62" y2="16" />
      <line x1="32" y1="22" x2="62" y2="22" />
      <line x1="32" y1="28" x2="62" y2="28" />
      <line x1="32" y1="34" x2="62" y2="34" />
      <line x1="32" y1="40" x2="62" y2="40" />
    </g>
    <g fill="currentColor">
      <ellipse cx="42" cy="28" rx="3" ry="2" />
      <ellipse cx="54" cy="22" rx="3" ry="2" />
    </g>
    <g stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 36 Q 16 22 28 36 Q 16 50 4 36 Z" />
    </g>
    <circle cx="16" cy="36" r="5.5" fill="currentColor" />
  </Svg>
);

export const BoltClassicIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <path fill="currentColor" d="M38 4L18 32h10L20 60l24-32h-10L40 4z" />
  </Svg>
);

// ─────────────────────────────────────────────
// Global Tools FAB icon (own design, MIT)
// ─────────────────────────────────────────────
export const WrenchIcon = (props) => (
  <Svg viewBox="0 0 64 64" {...props}>
    <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M44 8 A12 12 0 0 0 30 26 L10 46 A4 4 0 0 0 10 52 L12 54 A4 4 0 0 0 18 54 L38 34 A12 12 0 0 0 56 20 L48 28 L40 28 L40 20 L48 12 Z" />
    </g>
    <circle cx="14" cy="50" r="1.6" fill="currentColor" />
  </Svg>
);

// ─────────────────────────────────────────────
// Saved for future "Tuner" feature (own design, MIT)
// Standalone SVG also at: public/icons/tuning-fork.svg
// ─────────────────────────────────────────────
export const TuningForkIcon = (props) => (
  <Svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="20" y1="6" x2="20" y2="34" />
    <line x1="44" y1="6" x2="44" y2="34" />
    <path d="M20 34 Q20 40 28 40 H36 Q44 40 44 34" />
    <line x1="32" y1="40" x2="32" y2="54" />
    <circle cx="32" cy="58" r="3" fill="currentColor" stroke="none" />
  </Svg>
);
