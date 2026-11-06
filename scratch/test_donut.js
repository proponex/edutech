function computeDonutSlices(completed, inProgress, remaining) {
  const total = completed + inProgress + remaining;
  if (total === 0) return [];
  
  const r = 40;
  const c = 2 * Math.PI * r; // ~251.327
  
  const slices = [
    { label: 'Completed', count: completed, color: '#16a34a', pct: Math.round((completed / total) * 100) },
    { label: 'In Progress', count: inProgress, color: '#f59e0b', pct: Math.round((inProgress / total) * 100) },
    { label: 'Remaining', count: remaining, color: '#9ca3af', pct: Math.round((remaining / total) * 100) },
  ];
  
  let accumulatedOffset = 0;
  return slices.map(s => {
    const dashLength = (s.count / total) * c;
    const dashArray = `${dashLength} ${c - dashLength}`;
    const dashOffset = -accumulatedOffset;
    accumulatedOffset += dashLength;
    return { ...s, dashArray, dashOffset };
  });
}

const slices = computeDonutSlices(15, 5, 10);
console.log('Donut Slices:', slices);

