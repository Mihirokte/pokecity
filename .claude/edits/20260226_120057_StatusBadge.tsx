interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge-modern status-badge-modern--${status}`}>
      <span className={`status-dot status-dot--${status}`} />
      {status}
    </span>
  );
}
