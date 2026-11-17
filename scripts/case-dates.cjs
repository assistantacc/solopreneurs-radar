function additionTime(entry) {
  const value = entry.addedAt;
  const iso = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/;
  if (typeof value !== 'string' || !iso.test(value) || !Number.isFinite(Date.parse(value))) throw new Error(`Invalid addedAt for ${entry.slug}`);
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
  if (calendarDate !== value.slice(0, 10)) throw new Error(`Invalid addedAt date for ${entry.slug}`);
  return Date.parse(value);
}

module.exports = {additionTime};
