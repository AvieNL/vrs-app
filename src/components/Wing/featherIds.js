export const FEATHER_GROUPS = [
  { prefix: 'P',  count: 10, label: 'Handpennen' },
  { prefix: 'S',  count: 6,  label: 'Armpennen' },
  { prefix: 'Tt', count: 3,  label: 'Tertialen' },
  { prefix: 'AL', count: 3,  label: 'Alula' },
  { prefix: 'GC', count: 5,  label: 'Grote dekveren' },
  { prefix: 'MC', count: 3,  label: 'Middelste dekveren' },
  { prefix: 'LC', count: 2,  label: 'Kleine dekveren' },
  { prefix: 'CC', count: 3,  label: 'Handpendekveren' },
];

export const ALL_FEATHER_IDS = FEATHER_GROUPS.flatMap(({ prefix, count }) =>
  Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`)
);

export const FEATHER_ID_SET = new Set(ALL_FEATHER_IDS);

export function listFeatherIds(svgEl) {
  return [...svgEl.querySelectorAll('polygon[id]')]
    .map(el => el.id)
    .filter(id => FEATHER_ID_SET.has(id));
}

export function ensureFeatherKeys(ids, data) {
  const out = { ...data };
  ids.forEach(id => {
    if (!out[id]) out[id] = { score: 0 };
  });
  return out;
}
