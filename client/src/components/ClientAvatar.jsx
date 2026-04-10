const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#06b6d4', '#f97316'];

export default function ClientAvatar({ name, size = 40 }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';
  const colorIndex = name ? name.charCodeAt(0) % COLORS.length : 0;
  const bg = COLORS[colorIndex];

  return (
    <div
      className="flex items-center justify-center rounded-full font-head font-bold shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: '#fff',
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </div>
  );
}
