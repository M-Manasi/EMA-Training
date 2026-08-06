import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';

/**
 * adventures block — WKND adventures listing.
 *
 * A category tab filter (ALL / CLIMBING / …) above a responsive card grid.
 * Reproduces the WKND cmp-tabs + cmp-image-list listing as a single
 * self-contained block (nested blocks are not decorated in this project, so the
 * whole listing must live in one top-level block).
 *
 * Content model — one row per adventure:
 *   cell 1: image (mandatory)
 *   cell 2: text — heading (title, linked) + description paragraph
 *   cell 3: categories — comma/newline separated labels (e.g. "Surfing, Travel")
 *
 * Tabs are derived from the union of categories (in first-seen order) with a
 * leading "All". Filtering is client-side: a card shows when the active tab is
 * "All" or is one of the card's categories.
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const cards = [];
  const categoryOrder = [];

  rows.forEach((row) => {
    const cols = [...row.children];
    const imgCol = cols[0];
    const textCol = cols[1];
    const catCol = cols[2];
    if (!imgCol) return;

    // categories for this card
    const catText = catCol ? catCol.textContent : '';
    const categories = catText
      .split(/[,\n]/)
      .map((c) => c.trim())
      .filter(Boolean);
    categories.forEach((c) => {
      if (!categoryOrder.includes(c)) categoryOrder.push(c);
    });

    // build the card
    const card = document.createElement('article');
    card.className = 'adventures-card';
    card.dataset.categories = categories.map((c) => toClassName(c)).join(' ');

    const imgWrap = document.createElement('div');
    imgWrap.className = 'adventures-card-image';
    const pic = imgCol.querySelector('picture');
    if (pic) {
      imgWrap.append(pic);
    } else {
      const img = imgCol.querySelector('img');
      if (img) imgWrap.append(img);
    }

    const body = document.createElement('div');
    body.className = 'adventures-card-body';
    if (textCol) {
      while (textCol.firstElementChild) body.append(textCol.firstElementChild);
    }

    // Make the whole card link to the adventure (matches WKND's linked cards).
    const link = body.querySelector('a[href]');
    if (link) {
      const href = link.getAttribute('href');
      const anchor = document.createElement('a');
      anchor.className = 'adventures-card-link';
      anchor.setAttribute('href', href);
      anchor.setAttribute('aria-label', link.textContent.trim());
      imgWrap.prepend(anchor);
    }

    card.append(imgWrap, body);
    cards.push(card);
  });

  // Optimise images.
  cards.forEach((card) => {
    const img = card.querySelector('img');
    if (img && !card.querySelector('picture')) {
      const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
      img.closest('.adventures-card-image').append(optimized);
      img.remove();
    }
  });

  // Build the grid.
  const grid = document.createElement('div');
  grid.className = 'adventures-grid';
  cards.forEach((c) => grid.append(c));

  // Build the tablist: "All" + categories in first-seen order.
  const tabs = ['All', ...categoryOrder];
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

  block.textContent = '';
  block.append(tablist, grid);
}
