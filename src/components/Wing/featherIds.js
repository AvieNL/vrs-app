export const FEATHER_GROUPS = [
  { prefix: 'hp', count: 10 },
  { prefix: 'ap', count: 6 },
  { prefix: 't',  count: 3 },
  { prefix: 'gd', count: 10 },
  { prefix: 'md', count: 8 },
  { prefix: 'kd', count: 6 },
];

export const ALL_FEATHER_IDS = [
  ...FEATHER_GROUPS.flatMap(({ prefix, count }) =>
    Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`)
  ),
  'alula',
];

export function listFeatherIds(svgEl) {
  return [...svgEl.querySelectorAll('.feather[id]')].map(el => el.id);
}

export function ensureFeatherKeys(ids, data) {
  const out = { ...data };
  ids.forEach(id => {
    if (!out[id]) out[id] = { score: 0 };
  });
  return out;
}
