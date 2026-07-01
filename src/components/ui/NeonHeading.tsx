export function NeonHeading({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-display text-4xl text-white font-bold glow-text-red">{children}</h1>
  );
}
