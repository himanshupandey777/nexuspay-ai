
const StatusBadge = ({ status = 'pending' }) => {
  const normalizedStatus = String(status || 'pending').toLowerCase();

  const config = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    verified: 'bg-blue-100 text-blue-800 border-blue-200',
    paid: 'bg-green-100 text-green-800 border-green-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
  };

  const badgeStyle =
    config[normalizedStatus] ||
    'bg-gray-100 text-gray-800 border-gray-200';

  const label =
    normalizedStatus.charAt(0).toUpperCase() +
    normalizedStatus.slice(1);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyle}`}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
