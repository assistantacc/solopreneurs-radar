(() => {
  const form = document.getElementById('case-filters');
  if (!form) return;
  const selects = [...form.querySelectorAll('[data-case-filter]')];
  const sort = document.getElementById('case-sort');
  const search = document.getElementById('case-search');
  const normalizeSearch = value => String(value).normalize('NFKC').toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
  let activeQuery = '';
  const container = document.getElementById('case-cards');
  const cases = [...document.querySelectorAll('[data-case-filters]')].map(card => ({card, tags: JSON.parse(card.dataset.caseFilters), added: Date.parse(card.dataset.addedAt), text: normalizeSearch(card.dataset.caseSearch || card.textContent || '')}));
  const count = document.getElementById('case-count');
  const empty = document.getElementById('filter-empty');
  const actions = form.querySelector('.filter-actions');
  const update = () => {
    const selected = selects.filter(select => select.value);
    const terms = normalizeSearch(activeQuery).trim().split(/\s+/u).filter(Boolean);
    const direction = sort.value === 'oldest' ? 1 : -1;
    const ordered = [...cases].sort((left, right) => direction * (left.added - right.added));
    container.append(...ordered.map(entry => entry.card));
    let visible = 0;
    for (const {card, tags, text} of cases) {
      const match = selected.every(select => tags[select.dataset.caseFilter]?.includes(select.value)) && terms.every(term => text.includes(term));
      card.hidden = !match;
      if (match) visible++;
    }
    count.textContent = selected.length || terms.length ? `Найдено: ${visible} из ${cases.length}` : `Кейсов: ${String(cases.length).padStart(2, '0')}`;
    actions.hidden = selected.length === 0 && sort.value === 'newest' && terms.length === 0;
    empty.hidden = visible !== 0;
  };
  form.addEventListener('change', update);
  form.addEventListener('reset', () => {
    for (const select of selects) select.value = '';
    sort.value = 'newest';
    search.value = '';
    activeQuery = '';
    update();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    activeQuery = search.value.trim();
    update();
  });
  search.addEventListener('input', () => {
    if (!search.value) {
      activeQuery = '';
      update();
    }
  });
  update();
})();
