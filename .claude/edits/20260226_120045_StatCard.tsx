interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
}

export function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card__icon">{icon}</div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}
