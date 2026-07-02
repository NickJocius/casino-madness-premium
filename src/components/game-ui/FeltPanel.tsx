type FeltPanelProps = {
  children: React.ReactNode;
  className?: string;
};

export function FeltPanel({ children, className = "" }: FeltPanelProps) {
  return <div className={`felt-panel ${className}`.trim()}>{children}</div>;
}
