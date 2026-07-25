export default function RailToggle({ collapsed, onToggle }) {
  return (
    <button className="rail-toggle" onClick={onToggle}>
      {collapsed ? "Show moves" : "Hide moves"}
    </button>
  );
}
