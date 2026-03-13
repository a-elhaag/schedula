export default function RocketIcon({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 13c0-1 6-5 8-5s8 4 8 5m0 6l-1 2c-3 2-7 2-10 0l-1-2m5-5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
      <path d="M12 18v3M9 22h6" />
    </svg>
  );
}
