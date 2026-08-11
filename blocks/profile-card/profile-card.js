import { createOptimizedPicture } from '../../scripts/aem.js';

const ICONS = `${window.hlx?.codeBasePath || ''}/icons`;
const SOCIALS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'twitter', label: 'Twitter' },
  { key: 'instagram', label: 'Instagram' },
];

/**
 * profile-card block — WKND contributor / guide profiles.
 *
 * Two content models, identical rendered output:
 *
 * 1. DYNAMIC (preferred): the block's first row configures a query-index path
 *    (optional; defaults to the site index) and a `group` filter. The block
 *    fetches the index, keeps rows that are profile pages under the current
 *    locale's `/about-us/<name>` whose `group` matches, sorts by `order`
 *    (then name), and renders one card per row from the index columns
 *    (image, title=name, role). The index is the single source of truth —
 *    no profile content is authored in the doc.
 *
 * 2. STATIC (fallback, backward compatible): each authored row is one
 *    person — [ avatar image | name + role ].
 *
 * Every card renders a circular photo, name, role, and Facebook/Twitter/
 * Instagram icons (injected from repo /icons so the AEM pipeline can't
 * rewrite authored <img> to about:error — same pattern as footer/author-bio).
 * @param {Element} block
 */

/** Reads config from the block's first row: { indexPath, group, isConfig }. */
function readConfig(block) {
  const cfg = { indexPath: null, group: '', isConfig: false };
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
  const groupMatch = text.match(/group\s*[:=]\s*([a-z0-9-]+)/i);
  if (groupMatch) cfg.group = groupMatch[1].toLowerCase();
  return cfg;
}

/** Keeps only profile rows for the current locale under /about-us/<name>. */
function isProfilePage(path, localePrefix) {
  if (!path) return false;
  const clean = path.replace(/\.html$/, '');
  return new RegExp(`^${localePrefix}/about-us/[^/]+/?$`).test(clean);
}

/** Builds a card from a name + role (+ optional image element or src). */
function buildCard(name, role, imgEl, imgSrc, imgAlt) {
  const card = document.createElement('article');
  card.className = 'profile-card-item';

  const avatar = document.createElement('div');
  avatar.className = 'profile-card-avatar';
  if (imgEl) avatar.append(createOptimizedPicture(imgEl.src, imgEl.alt || name, false, [{ width: '400' }]));
  else if (imgSrc) avatar.append(createOptimizedPicture(imgSrc, imgAlt || name, false, [{ width: '400' }]));
  card.append(avatar);

  const info = document.createElement('div');
  info.className = 'profile-card-info';
  if (name) {
    const h3 = document.createElement('h3');
    h3.textContent = name;
    info.append(h3);
  }
  if (role) {
    const p = document.createElement('p');
    p.textContent = role;
    info.append(p);
  }
  card.append(info);

  const social = document.createElement('div');
  social.className = 'profile-card-social';
  SOCIALS.forEach(({ key, label }) => {
    const a = document.createElement('a');
    a.href = '#';
    a.setAttribute('aria-label', `${label} — ${name || 'profile'}`);
    a.className = 'profile-card-social-link';
    const icon = document.createElement('img');
    icon.src = `${ICONS}/social-${key}-dark.svg`;
    icon.alt = label;
    icon.width = 18;
    icon.height = 18;
    icon.loading = 'lazy';
    a.append(icon);
    social.append(a);
  });
  card.append(social);
  return card;
}

/** DYNAMIC: fetch the index, filter by locale + group, sort, render. */
async function renderFromIndex(block, { indexPath, group }) {
  const path = indexPath || '/query-index.json';
  const localePrefix = `/${window.location.pathname.split('/').filter(Boolean).slice(0, 2).join('/')}`;
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`profile-card: index ${path} -> ${resp.status}`);
  const json = await resp.json();
  let rows = (Array.isArray(json) ? json : json.data || [])
    .filter((r) => isProfilePage(r.path, localePrefix));
  if (group) rows = rows.filter((r) => (r.group || '').toLowerCase() === group);
  if (!rows.length) throw new Error(`profile-card: no ${group || 'profile'} rows in index`);
  rows.sort((a, b) => {
    const ao = Number(a.order);
    const bo = Number(b.order);
    if (Number.isFinite(ao) && Number.isFinite(bo) && ao !== bo) return ao - bo;
    return (a.title || '').localeCompare(b.title || '');
  });

  const grid = document.createElement('div');
  grid.className = 'profile-card-grid';
  rows.forEach((r) => grid.append(buildCard(r.title || '', r.role || '', null, r.image, r.title)));
  block.textContent = '';
  block.append(grid);
  return true;
}

/** STATIC fallback: render authored rows. */
function renderFromRows(block, rows) {
  const grid = document.createElement('div');
  grid.className = 'profile-card-grid';
  rows.forEach((row) => {
    const cells = [...row.children];
    const imgCell = cells.find((c) => c.querySelector('img, picture'));
    const textCell = cells.find((c) => c !== imgCell && c.textContent.trim());
    if (!imgCell && !textCell) return;
    const name = textCell?.querySelector('h1, h2, h3, h4, h5, h6')?.textContent.trim()
      || textCell?.textContent.trim().split('\n')[0] || '';
    const role = textCell?.querySelector('p')?.textContent.trim() || '';
    const img = imgCell && imgCell.querySelector('img');
    grid.append(buildCard(name, role, img));
  });
  block.textContent = '';
  block.append(grid);
}

export default async function decorate(block) {
  const cfg = readConfig(block);
  const staticRows = [...block.children];
  try {
    if (await renderFromIndex(block, cfg)) return;
  } catch (e) {
    // fall through to static rows
  }
  renderFromRows(block, cfg.isConfig ? staticRows.slice(1) : staticRows);
}
