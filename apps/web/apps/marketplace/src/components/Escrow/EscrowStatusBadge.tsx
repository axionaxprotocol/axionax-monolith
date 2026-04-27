interface EscrowStatusBadgeProps {
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'REFUNDED';
}

export function EscrowStatusBadge({ status }: EscrowStatusBadgeProps) {
  const styles = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    REFUNDED: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
