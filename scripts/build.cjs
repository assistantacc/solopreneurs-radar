const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const assetVersion = crypto.createHash('sha256').update(['style.css', 'theme.js', 'filters.js'].map(name => fs.readFileSync(path.join(root, 'assets', name), 'utf8')).join('\n')).digest('hex').slice(0, 12);
const cases = JSON.parse(fs.readFileSync(path.join(root, 'content/cases.json'), 'utf8'));
const capitalize = value => String(value).trim().replace(/^./u, letter => letter.toLocaleUpperCase('ru-RU'));
const taxonomy = JSON.parse(fs.readFileSync(path.join(root, 'content/taxonomy.json'), 'utf8')).map(group => ({...group, options: [...new Set(group.options.map(capitalize))]}));
const aliases = JSON.parse(fs.readFileSync(path.join(root, 'content/taxonomy-aliases.json'), 'utf8'));
const {createTagNormalizer} = require('./taxonomy.cjs');
const normalizeTags = createTagNormalizer(taxonomy, aliases);
const {additionTime} = require('./case-dates.cjs');
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const slugs = new Set();
for (const entry of cases) {
  if (!/^[a-z0-9-]+$/.test(entry.slug) || slugs.has(entry.slug)) throw new Error('Invalid or duplicate slug');
  slugs.add(entry.slug);
  additionTime(entry);
  const source = new URL(entry.source.url);
  if (source.protocol !== 'https:' || /(^|\.)(github\.com|github\.io)$/.test(source.hostname)) throw new Error('Case must link to an external primary source');
  if (!entry.source.title || !entry.title || !(entry.text || entry.sections?.length)) throw new Error('Incomplete case');
  for (const group of taxonomy) {
    const values = entry.filters?.[group.id];
    if (!Array.isArray(values)) throw new Error(`Missing ${group.id} tags for ${entry.slug}`);
    entry.filters[group.id] = normalizeTags(group.id, values);
  }
}
cases.sort((left, right) => additionTime(right) - additionTime(left));
const external = (url, text, className = '') => `<a${className ? ` class="${className}"` : ''} href="${escape(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
const searchableText = entry => [entry.title, entry.summary, entry.category, entry.tag, entry.lead, entry.note, entry.text, ...(entry.sections || []).flatMap(section => [section.heading, section.text]), ...Object.values(entry.filters).flat(), entry.source.title, entry.source.publisher, entry.source.author].filter(Boolean).join(' ');
const cards = cases.map((entry, index) => `<a class="card${entry.style === 'sage' ? ' sage' : ''}" data-case-filters="${escape(JSON.stringify(entry.filters))}" data-case-search="${escape(searchableText(entry))}" data-added-at="${escape(entry.addedAt)}" href="cases/${entry.slug}/index.html"><div class="card-meta"><span>${String(index + 1).padStart(2, '0')} / ${escape(entry.category)}</span></div><div class="card-symbol" aria-hidden="true">${escape(entry.symbol)}</div><h3>${escape(entry.title)}</h3><p>${escape(entry.summary)}</p><div class="card-bottom"><span class="tag">${escape(entry.tag)}</span></div></a>`).join('\n');
const filterControls = taxonomy.map(group => {
  const used = new Set(cases.flatMap(entry => entry.filters[group.id]));
  const options = group.options.filter(value => used.has(value));
  return `<label class="case-filter" for="filter-${group.id}"><span>${escape(group.label)}</span><select id="filter-${group.id}" name="${group.id}" data-case-filter="${group.id}"><option value="">Все</option>${options.map(value => `<option value="${escape(value)}">${escape(value)}</option>`).join('')}</select></label>`;
}).join('');
const recencyControl = '<label class="case-filter" for="case-sort"><span>Давность</span><select id="case-sort" name="recency"><option value="newest" selected>Сначала новые</option><option value="oldest">Сначала старые</option></select></label>';
const searchControl = '<div class="case-search"><label for="case-search">Поиск</label><div class="search-controls"><input id="case-search" type="search" name="q" aria-label="Поиск по кейсам" placeholder="Поиск: продукт, функция и пр." autocomplete="off"><button class="search-submit" type="submit">Найти</button></div></div>';
const sources = cases.map(entry => `<li>${external(entry.source.url, `<span><strong>${escape(entry.title)}</strong><small>${escape(entry.source.publisher)} · ${escape(entry.source.published)} · ${escape(entry.source.language)}</small></span><span aria-hidden="true">↗</span>`)}</li>`).join('\n');
const shell = (title, description, prefix, body) => `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><link rel="stylesheet" href="${prefix}assets/style.css?v=${assetVersion}"><script src="${prefix}assets/theme.js?v=${assetVersion}" defer></script>${prefix === '' ? `<script src="assets/filters.js?v=${assetVersion}" defer></script>` : ''}</head>
<body>${body}</body></html>\n`;
const header = (prefix, home) => `<header class="topbar"><a class="brand" href="${prefix}index.html">solopreneurs<span class="dot">.</span></a><nav aria-label="Основная навигация">${home ? '<a href="#cases">Кейсы</a><a href="#all-cases">Первоисточники</a>' : `<a href="${prefix}index.html#cases">Все кейсы</a>`}<button class="theme" type="button" aria-label="Переключить тему">◐ <span>Тема</span></button></nav></header>`;
fs.writeFileSync(path.join(root, 'index.html'), shell('Соло-предприниматели — solopreneurs', 'Русскоязычные описания кейсов предпринимателей с прямыми ссылками на внешние первоисточники.', '', `${header('', true)}
<main><section class="library wrap" id="cases" aria-label="Кейсы"><div class="section-head"><p class="eyebrow">Библиотека</p><span class="count" id="case-count" role="status" aria-live="polite">Кейсов: ${String(cases.length).padStart(2, '0')}</span></div><form class="case-filters" id="case-filters" aria-label="Фильтры кейсов"><div class="filters-layout"><div class="filter-row">${filterControls}${recencyControl}</div>${searchControl}</div><div class="filter-actions" hidden><button type="reset" class="filter-reset">Сбросить фильтры <span aria-hidden="true">×</span></button></div></form><div class="cards" id="case-cards">${cards}</div><div class="filter-empty" id="filter-empty" hidden><h3>Кейсы не найдены</h3><p>Измените поисковый запрос или параметры фильтров.</p><button class="button" type="reset" form="case-filters">Сбросить фильтры</button></div></section>
<section class="all-cases wrap" id="all-cases" aria-labelledby="all-cases-title"><h2 id="all-cases-title">Все кейсы: первоисточники</h2><p class="notice sources-notice">Оригинальные материалы на внешних сайтах. Каждая ссылка откроется в новой вкладке.</p><ul class="case-links">${sources}</ul></section></main>`));
for (const [index, entry] of cases.entries()) {
  const folder = path.join(root, 'cases', entry.slug);
  fs.mkdirSync(folder, {recursive: true});
  const source = entry.source;
  const sourceSection = `<section class="source-panel" aria-labelledby="source-title"><h2 id="source-title">Первоисточник</h2><p>${escape(source.title)}</p><dl class="source-meta"><div><dt>Автор</dt><dd>${escape(source.author)}</dd></div><div><dt>Опубликовано</dt><dd>${escape(source.published)}</dd></div><div><dt>Проверено</dt><dd>${escape(source.accessed)}</dd></div></dl>${source.locator ? `<p class="muted">${escape(source.locator)}</p>` : ''}${external(source.url, 'Читать оригинал <span aria-hidden="true">↗</span>', 'button')}<p class="source-address">${external(source.url, escape(source.url))}</p></section>`;
  const body = entry.text ? `<p class="case-text">${escape(entry.text)}</p>` : entry.sections.map(section => `<h2>${escape(section.heading)}</h2><p>${escape(section.text)}</p>`).join('');
  fs.writeFileSync(path.join(folder, 'index.html'), shell(entry.title + ' — solopreneurs', entry.summary, '../../', `${header('../../', false)}
<main class="wrap article"><a class="breadcrumb" href="../../index.html#cases">← К библиотеке кейсов</a><p class="eyebrow">${String(index + 1).padStart(2, '0')} / ${escape(entry.category)}</p><h1>${escape(entry.title)}</h1>${entry.lead ? `<p class="lead">${escape(entry.lead)}</p>` : ''}${entry.note ? `<aside class="demo-note">${escape(entry.note)}</aside>` : ''}<div class="article-body">${body}${sourceSection}<div class="article-end"><a class="button" href="../../index.html#cases">Все кейсы <span aria-hidden="true">↗</span></a></div></div></main>`));
}
console.log(`Built ${cases.length} case pages and ${cases.length} external source links.`);
