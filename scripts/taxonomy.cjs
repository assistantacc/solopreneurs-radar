const labelKey = value => String(value).normalize('NFC').trim().replace(/\s+/g, ' ').replace(/\s*[-–—]\s*/g, ' — ').toLocaleLowerCase('ru-RU');

function createTagNormalizer(groups, aliases) {
  const lookups = new Map();
  for (const group of groups) {
    const canonical = new Map(group.options.map(value => [labelKey(value), value]));
    if (canonical.size !== group.options.length) throw new Error(`Duplicate ${group.id} options`);
    const lookup = new Map(canonical);
    for (const [alternative, target] of Object.entries(aliases[group.id] || {})) {
      const canonicalTarget = canonical.get(labelKey(target));
      if (!canonicalTarget) throw new Error(`Unknown alias target: ${group.id} / ${target}`);
      if (canonical.has(labelKey(alternative))) throw new Error(`Alias still present in taxonomy: ${alternative}`);
      if (lookup.has(labelKey(alternative))) throw new Error(`Duplicate alias: ${alternative}`);
      lookup.set(labelKey(alternative), canonicalTarget);
    }
    lookups.set(group.id, lookup);
  }
  return (groupId, values) => {
    if (!Array.isArray(values)) throw new Error(`Missing ${groupId} tags`);
    const lookup = lookups.get(groupId);
    if (!lookup) throw new Error(`Unknown filter group: ${groupId}`);
    return [...new Set(values.map(value => {
      const canonical = lookup.get(labelKey(value));
      if (!canonical) throw new Error(`Unknown ${groupId} tag: ${value}`);
      return canonical;
    }))];
  };
}

module.exports = {labelKey, createTagNormalizer};
