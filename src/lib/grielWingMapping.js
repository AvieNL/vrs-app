export function toGrielWingScores(scores) {
  return {
    primaries:       group(scores, 'P',  10),
    secondaries:     group(scores, 'S',  6),
    tertials:        group(scores, 'Tt', 3),
    alula:           group(scores, 'AL', 3),
    primary_coverts: group(scores, 'CC', 3),
    coverts: {
      greater: group(scores, 'GC', 5),
      median:  group(scores, 'MC', 3),
      lesser:  group(scores, 'LC', 2),
    },
  };
}

function group(scores, prefix, n) {
  return Array.from({ length: n }, (_, i) => ({
    id:    `${prefix}${i + 1}`,
    score: scores[`${prefix}${i + 1}`]?.score ?? 0,
  }));
}
