export function toGrielWingScores(scores) {
  return {
    primaries:   group(scores, 'hp', 10),
    secondaries: group(scores, 'ap', 6),
    tertials:    group(scores, 't',  3),
    coverts: {
      greater: group(scores, 'gd', 10),
      median:  group(scores, 'md', 8),
      lesser:  group(scores, 'kd', 6),
    },
  };
}

function group(scores, prefix, n) {
  return Array.from({ length: n }, (_, i) => ({
    id:    `${prefix}${i + 1}`,
    score: scores[`${prefix}${i + 1}`]?.score ?? 0,
  }));
}
