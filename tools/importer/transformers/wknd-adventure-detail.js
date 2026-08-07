/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: restructure the WKND adventure-detail page into clean EDS
 * marker regions.
 *
 * Source structure (deeply-nested AEM grids): breadcrumb, a carousel/gallery
 * image, an H1 title, a content-fragment of key facts (Activity, Trip Length,
 * Difficulty, Price, …), and a cmp-tabs with per-tab content fragments
 * (Overview / Itinerary / What to Bring). This transformer (beforeTransform)
 * rebuilds a flat, predictable DOM:
 *
 *   <main>
 *     <div class="breadcrumb-src">      breadcrumb links + current
 *     <div class="adv-gallery-src">     full-bleed gallery image
 *     ---  (section break -> section 1 = breadcrumb + gallery)
 *     <h1>Title</h1>                    (default content, spans columns)
 *     <div class="key-facts-src">       label/value rows
 *     <div class="tabs-src">            [label | content] rows per tab
 *     [section-metadata style=adventure]
 *
 * Parsers turn the *-src markers into block tables. Runs in beforeTransform so
 * it sees the raw source markup (classes intact).
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

function el(document, tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.beforeTransform) return;
  const document = element.ownerDocument;

  // Only act on the adventure-detail template (has tabs + a content fragment).
  const tabs = element.querySelector('.cmp-tabs');
  const contentfragment = element.querySelector('.cmp-contentfragment');
  if (!tabs || !contentfragment) return;

  // Strip global chrome up front so its logos can't be mistaken for the gallery.
  WebImporter.DOMUtils.remove(element, [
    'header', 'footer', '#toggleNav', '#mobileNav', 'iframe', 'script', 'style', 'noscript',
    '[class*="experiencefragment--header"]', '[class*="experiencefragment--footer"]',
  ]);

  // --- breadcrumb ---
  const breadcrumb = element.querySelector('.cmp-breadcrumb');

  // --- gallery image: the carousel image (first, before the title) ---
  const carousel = element.querySelector('.cmp-carousel');
  const galleryImg = carousel ? carousel.querySelector('img') : null;

  // --- title (H1) ---
  const titleEl = element.querySelector('h1.cmp-title__text, .cmp-title h1');

  // --- key facts: content-fragment elements (title + value) ---
  const factEls = [...element.querySelectorAll('.cmp-contentfragment__element')]
    .map((e) => ({
      name: (e.querySelector('.cmp-contentfragment__element-title') || {}).textContent,
      value: (e.querySelector('.cmp-contentfragment__element-value') || {}).textContent,
    }))
    .filter((f) => f.name && f.name.trim());

  // --- tabs: label + panel content ---
  const tabLabels = [...tabs.querySelectorAll('.cmp-tabs__tab')].map((t) => t.textContent.trim());
  const tabPanels = [...tabs.querySelectorAll('.cmp-tabs__tabpanel')];

  // ================= rebuild =================
  const frag = document.createElement('div');

  // breadcrumb marker
  if (breadcrumb) {
    const bcDiv = el(document, 'div', 'breadcrumb-src');
    const p = document.createElement('p');
    const items = [...breadcrumb.querySelectorAll('.cmp-breadcrumb__item')];
    items.forEach((item, i) => {
      const link = item.querySelector('a');
      if (link) {
        const a = el(document, 'a');
        a.setAttribute('href', link.getAttribute('href'));
        a.textContent = link.textContent.trim();
        p.append(a);
      } else {
        p.append(document.createTextNode(item.textContent.trim()));
      }
      if (i < items.length - 1) p.append(document.createTextNode(' '));
    });
    bcDiv.append(p);
    frag.append(bcDiv);
  }

  // gallery image marker
  if (galleryImg) {
    const gDiv = el(document, 'div', 'adv-gallery-src');
    const p = document.createElement('p');
    const img = el(document, 'img');
    img.setAttribute('src', galleryImg.getAttribute('src'));
    img.setAttribute('alt', galleryImg.getAttribute('alt') || '');
    p.append(img);
    gDiv.append(p);
    frag.append(gDiv);
  }

  // title (plain H1 default content)
  if (titleEl) {
    frag.append(el(document, 'h1', null, titleEl.textContent.trim()));
  }

  // key-facts marker (label | value rows)
  if (factEls.length) {
    const kfDiv = el(document, 'div', 'key-facts-src');
    factEls.forEach((f) => {
      const row = document.createElement('p');
      row.textContent = `${f.name.trim()} | ${(f.value || '').trim()}`;
      kfDiv.append(row);
    });
    frag.append(kfDiv);
  }

  // tabs marker: one region per tab, each = label + serialized content
  if (tabLabels.length) {
    const tabsDiv = el(document, 'div', 'tabs-src');
    tabPanels.forEach((panel, i) => {
      const label = tabLabels[i] || `Tab ${i + 1}`;
      // Clone the panel content, dropping the redundant content-fragment title.
      const content = el(document, 'div', 'tabs-src-content');
      panel.querySelectorAll('p, ul, ol, img, h2, h3, h4, h5, h6').forEach((node) => {
        // skip the contentfragment title (repeats the page title)
        if (node.classList && node.classList.contains('cmp-contentfragment__title')) return;
        if (node.closest && node.closest('.cmp-contentfragment__title')) return;
        if (node.tagName === 'IMG') {
          const img = el(document, 'img');
          img.setAttribute('src', node.getAttribute('src'));
          img.setAttribute('alt', node.getAttribute('alt') || '');
          content.append(img);
        } else if (node.tagName === 'UL' || node.tagName === 'OL') {
          content.append(node.cloneNode(true));
        } else if (/^H[1-6]$/.test(node.tagName)) {
          // demote panel sub-headings to bold paragraphs (kept as sub-heads via CSS)
          const t = node.textContent.trim();
          if (t) content.append(el(document, 'p', null, `<strong>${t}</strong>`));
        } else {
          const t = node.innerHTML.trim();
          if (t) content.append(el(document, 'p', null, t));
        }
      });
      const tabRow = el(document, 'div', 'tabs-src-row');
      tabRow.setAttribute('data-tab-label', label);
      tabRow.append(content);
      tabsDiv.append(tabRow);
    });
    frag.append(tabsDiv);
  }

  // Replace the body content with our clean rebuild.
  element.textContent = '';
  while (frag.firstChild) element.append(frag.firstChild);
}
