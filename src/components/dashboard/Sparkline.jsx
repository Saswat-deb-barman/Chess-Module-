// Dependency-free inline sparkline — a handful of 0/1 pattern hits per
// game, oldest to newest. No charting library for something this small.
export default function Sparkline({ data = [], width = 72, height = 20 }) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data);
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => `${i * stepX},${height - (v / max) * height}`).join(" ");

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
      <polyline points={points} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
