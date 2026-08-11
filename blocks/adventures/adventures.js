import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';

/**
 * adventures block — WKND adventures listing.
 *
 * A category tab filter (ALL / CLIMBING / …) above a responsive card grid.
 * Reproduces the WKND cmp-tabs + cmp-image-list listing as a single
 * self-contained block.
 *
 * Two content models, identical rendered output:
 *
 * 1. DYNAMIC (preferred): the block's first row configures a query-index path
 *    (optional; defaults to a locale-scoped `/…/query-index.json`) and an
 *    optional `limit`. The block fetches the index, keeps rows whose path is
 *    an adventure detail page (`…/adventures/<name>`, excluding the listing
 *    page itself), sorts by title, and renders one card per row from the
 *    index columns (image, title, description, category). The index is the
 *    single source of truth — no adventure content is authored in the doc.
 *
 * 2. STATIC (fallback, backward compatible): if the index can't be resolved/
 *    fetched, each authored block row is one card — [ image | text | categories ].
 *
 * @param {Element} block The adventures block element
 */

/**
 * Reads config from the block's first row: { indexPath, pathFilter, sort, limit, tabs }.
 * All are author-set (no code change needed to tune):
 *   - a link/path to the JSON index (required to go dynamic)
 *   - `filter: /magazine/` → which detail pages to include, matched as
 *     `/{locale}/{segment}/<name>` (default `adventures`, so existing usage
 *     is unchanged). Accepts `adventures`, `/adventures/`, `magazine`, etc.
 *   - `sort: recent|title|order` → recent = newest first (lastModified desc),
 *     title = A–Z (default), order = ascending numeric `order` column.
 *   - `limit: N`  → cap the number of cards (e.g. homepage grid)
 *   - `tabs: false` → hide the category tablist (e.g. homepage grid)
 */
function readConfig(block) {
  const cfg = {
    indexPath: null, pathFilter: 'adventures', sort: 'title', limit: 0, tabs: true, isConfig: false,
  };
  const firstRow = block.firstElementChild;
  if (!firstRow) return cfg;
  const cells = [...firstRow.children];
  const link = firstRow.querySelector('a[href]');
  const text = firstRow.textContent.trim();
  if (link && /\.json(\?|$)/i.test(link.getAttribute('href'))) {
    cfg.indexPath = link.getAttribute('href');
    cfg.isConfig = true;
  } else if (cells.length === 1 && /\.json(\?|$)/i.test(text)) {
    cfg.indexPath = text;
    cfg.isConfig = true;
  }
  // optional tokens anywhere in the config row (author-controlled)
  const filterMatch = text.match(/filter\s*[:=]\s*\/?([a-z0-9-]+)\/?/i);
  if (filterMatch) cfg.pathFilter = filterMatch[1].toLowerCase();
  const sortMatch = text.match(/sort\s*[:=]\s*(recent|title|order)/i);
  if (sortMatch) cfg.sort = sortMatch[1].toLowerCase();
  const limitMatch = text.match(/limit\s*[:=]\s*(\d+)/i);
  if (limitMatch) cfg.limit = Number(limitMatch[1]);
  const tabsMatch = text.match(/tabs\s*[:=]\s*(true|false|no|yes|off|on)/i);
  if (tabsMatch) cfg.tabs = /^(true|yes|on)$/i.test(tabsMatch[1]);
  return cfg;
}

/** Default query-index path: the site-root index (helix-query.yaml target). */
function defaultIndexPath() {
  return '/query-index.json';
}

/**
 * Keeps only detail rows for the CURRENT locale under a given segment:
 * `/{locale}/{segment}/<name>` (not the listing itself, not other locales).
 * The locale is the two leading path segments of the page (e.g. /us/en);
 * `segment` defaults to `adventures` (existing behaviour) or e.g. `magazine`.
 */
function isDetailPage(path, localePrefix, segment) {
  if (!path) return false;
  const clean = path.replace(/\.html$/, '');
  const re = new RegExp(`^${localePrefix}/${segment}/[^/]+/?$`);
  return re.test(clean);
}

/** Builds one card article from an index row. */
function buildCardFromData(row) {
  const card = document.createElement('article');
  card.className = 'adventures-card';
  const category = (row.category || '').trim();
  card.dataset.categories = category ? toClassName(category) : '';

  const imgWrap = document.createElement('div');
  imgWrap.className = 'adventures-card-image';
  if (row.image) {
    const pic = createOptimizedPicture(row.image, row.title || '', false, [{ width: '750' }]);
    imgWrap.append(pic);
  }

  const body = document.createElement('div');
  body.className = 'adventures-card-body';
  const h3 = document.createElement('h3');
  const titleLink = document.createElement('a');
  titleLink.href = row.path;
  titleLink.textContent = row.title || '';
  h3.append(titleLink);
  body.append(h3);
  if (row.description) {
    const p = document.createElement('p');
    p.textContent = row.description;
    body.append(p);
  }

  // whole-card link overlay (matches WKND's linked cards)
  const overlay = document.createElement('a');
  overlay.className = 'adventures-card-link';
  overlay.href = row.path;
  overlay.setAttribute('aria-label', row.title || 'Adventure');
  imgWrap.prepend(overlay);

  card.append(imgWrap, body);
  return { card, category };
}

/** Builds one card from an authored static row (fallback). */
function buildCardFromRow(row) {
  const cols = [...row.children];
  const imgCol = cols[0];
  const textCol = cols[1];
  const catCol = cols[2];
  if (!imgCol) return null;

  const categories = (catCol ? catCol.textContent : '')
    .split(/[,\n]/).map((c) => c.trim()).filter(Boolean);

  const card = document.createElement('article');
  card.className = 'adventures-card';
  card.dataset.categories = categories.map((c) => toClassName(c)).join(' ');

  const imgWrap = document.createElement('div');
  imgWrap.className = 'adventures-card-image';
  const pic = imgCol.querySelector('picture');
  if (pic) imgWrap.append(pic);
  else { const img = imgCol.querySelector('img'); if (img) imgWrap.append(img); }

  const body = document.createElement('div');
  body.className = 'adventures-card-body';
  if (textCol) while (textCol.firstElementChild) body.append(textCol.firstElementChild);

  const link = body.querySelector('a[href]');
  if (link) {
    const overlay = document.createElement('a');
    overlay.className = 'adventures-card-link';
    overlay.setAttribute('href', link.getAttribute('href'));
    overlay.setAttribute('aria-label', link.textContent.trim());
    imgWrap.prepend(overlay);
  }

  card.append(imgWrap, body);
  return { card, categories };
}

/**
 * Renders the grid, and (when showTabs) a category tablist with client-side
 * filtering. On the homepage the block is configured `tabs: false` for a plain
 * limited grid (matching WKND); the /adventures listing keeps its tabs.
 */
function render(block, cards, categoryOrder, showTabs = true) {
  const grid = document.createElement('div');
  grid.className = 'adventures-grid';
  cards.forEach((c) => grid.append(c));

  block.textContent = '';

  if (showTabs) {
    const tabs = ['All', ...categoryOrder.sort((a, b) => a.localeCompare(b))];
    const tablist = document.createElement('div');
    tablist.className = 'adventures-tabs';
    tablist.setAttribute('role', 'tablist');

    const applyFilter = (cat) => {
      const key = cat === 'All' ? null : toClassName(cat);
      grid.querySelectorAll('.adventures-card').forEach((card) => {
        const show = !key || card.dataset.categories.split(' ').includes(key);
        card.hidden = !show;
      });
    };

    tabs.forEach((label, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'adventures-tab';
      button.textContent = label;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', i === 0);
      button.addEventListener('click', () => {
        tablist.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', 'false'));
        button.setAttribute('aria-selected', 'true');
        applyFilter(label);
      });
      tablist.append(button);
    });
    block.append(tablist);
  }

  block.append(grid);
}

/** Sorts index rows in place per the configured strategy. */
function sortRows(rows, sort) {
  if (sort === 'recent') {
    rows.sort((a, b) => (Number(b.lastModified) || 0) - (Number(a.lastModified) || 0));
  } else if (sort === 'order') {
    rows.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  } else {
    rows.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }
}

/** DYNAMIC path: fetch the index, filter, sort, render. Returns true on success. */
async function renderFromIndex(block, {
  indexPath, pathFilter, sort, limit, tabs,
}) {
  const path = indexPath || defaultIndexPath();
  // current locale = two leading path segments of the listing page (/us/en)
  const localePrefix = `/${window.location.pathname.split('/').filter(Boolean).slice(0, 2).join('/')}`;
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`adventures: index ${path} -> ${resp.status}`);
  const json = await resp.json();
  let rows = (Array.isArray(json) ? json : json.data || [])
    .filter((r) => isDetailPage(r.path, localePrefix, pathFilter));
  if (!rows.length) throw new Error(`adventures: no ${pathFilter} rows in index`);
  sortRows(rows, sort);
  if (limit > 0) rows = rows.slice(0, limit);

  const cards = [];
  const categoryOrder = [];
  rows.forEach((row) => {
    const { card, category } = buildCardFromData(row);
    if (category && !categoryOrder.includes(category)) categoryOrder.push(category);
    cards.push(card);
  });
  render(block, cards, categoryOrder, tabs);
  return true;
}

export default async function decorate(block) {
  const cfg = readConfig(block);
  const staticRows = [...block.children];

  // Try dynamic (index) first when a config row is present or an index resolves.
  try {
    if (await renderFromIndex(block, cfg)) return;
  } catch (e) {
    // fall through to static rows
  }

  // STATIC fallback: render authored rows (skip a config-only first row).
  const rows = cfg.isConfig ? staticRows.slice(1) : staticRows;
  const cards = [];
  const categoryOrder = [];
  rows.forEach((row) => {
    const built = buildCardFromRow(row);
    if (!built) return;
    built.categories.forEach((c) => { if (!categoryOrder.includes(c)) categoryOrder.push(c); });
    cards.push(built.card);
  });
  // optimise raw <img> in static cards
  cards.forEach((card) => {
    const img = card.querySelector('img');
    if (img && !card.querySelector('picture')) {
      const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
      img.closest('.adventures-card-image').append(optimized);
      img.remove();
    }
  });
  render(block, cards, categoryOrder, cfg.tabs);
}
