const FILLS = ['none', '#e0e0e0', '#a8a8a8', '#686868', '#303030', '#000000'];

export function scoreToStyle(score) {
  return { fill: FILLS[score] ?? 'none', stroke: '#000' };
}
