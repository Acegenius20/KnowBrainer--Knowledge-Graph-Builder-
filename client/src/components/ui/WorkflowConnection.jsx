const buildPath = (from, to, fromSize, toSize) => {
  const startX = from.position.x + fromSize.width / 2;
  const startY = from.position.y + fromSize.height / 2;
  const endX = to.position.x + toSize.width / 2;
  const endY = to.position.y + toSize.height / 2;
  const curve = Math.max(120, Math.abs(endX - startX) * 0.5);

  return `M${startX},${startY} C${startX + curve},${startY} ${endX - curve},${endY} ${endX},${endY}`;
};

function WorkflowConnection({ from, to, fromSize, toSize, isActive, isDimmed }) {
  return (
    <path
      className={`workflow-connection ${isActive ? "is-active" : ""} ${
        isDimmed ? "is-dimmed" : ""
      }`}
      d={buildPath(from, to, fromSize, toSize)}
      fill="none"
    />
  );
}

export default WorkflowConnection;
