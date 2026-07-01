type GlowButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  accent?: "red" | "blue";
};

const ACCENT_COLORS = { red: "#FE1323", blue: "#194FFF" } as const;

export function GlowButton({ children, onClick, disabled, accent = "red" }: GlowButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ "--glow-accent": ACCENT_COLORS[accent] } as React.CSSProperties}
      className="glow-button font-display px-6 py-3 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
