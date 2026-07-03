// The GAZETTED stamp — the brand's one chromatic mark, used sparingly.

export function Stamp({ text = "Gazetted", press = false }: { text?: string; press?: boolean }) {
  return <span className={`stamp${press ? " stamp-press" : ""}`}>{text}</span>;
}

// The masthead wordmark — tall editorial serif, tracked caps.
export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-playfair), 'Times New Roman', serif",
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "4px",
        color: "var(--ink)",
        textTransform: "uppercase",
      }}
    >
      Gazette
    </span>
  );
}
