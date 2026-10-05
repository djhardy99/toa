// Shield with a "T" cut out. Colours come from the theme tokens, so it follows light/dark mode.
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Toa">
      <path
        d="M12 2 4 5v6c0 5.5 3.5 9.5 8 11 4.5-1.5 8-5.5 8-11V5z"
        fill="var(--accent)"
      />
      <path d="M8.5 8.5h7v2H13V16h-2v-5.5H8.5z" fill="var(--accent-text)" />
    </svg>
  );
}
