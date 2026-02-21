import { scoreToStyle } from './scoreStyles';

export function applyFeatherStyles(svgEl, scores) {
  if (!svgEl) return;
  Object.entries(scores).forEach(([id, { score }]) => {
    const el = svgEl.querySelector(`#${id}`);
    if (!el) return;
    const { fill, stroke } = scoreToStyle(score);
    el.setAttribute('fill', fill);
    el.setAttribute('stroke', stroke);
  });
}
