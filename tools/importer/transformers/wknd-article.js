/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: restructure the WKND magazine article into clean EDS sections.
 *
 * The source article is a deeply-nested set of AEM grids (breadcrumb, title,
 * byline, a content-fragment body with headings/paragraphs/images/blockquote,
 * an author experience-fragment, and a "Share This Story" sidebar list). This
 * transformer (beforeTransform) pulls out the semantic pieces and rebuilds a
 * flat, predictable DOM that the parsers + block decorators can consume:
 *
 *   <main>
 *     <div data-hero-image>            → section 1 (full-bleed hero image)
 *     ---
 *     <div class="article-header-src"> → article-header block (crumb+h1+byline)
 *     ...article body (h2/p/img/blockquote in order)...
 *     <div class="author-bio-src">     → author-bio block
 *     <div class="related-src">        → related sidebar block
 *     [section-metadata style=article]
 *
 * The block PARSERS then turn the *-src marker divs into block tables; the
 * SECTIONS are added by wknd-sections via the template config.
 *
 * Runs in beforeTransform so it sees the raw source markup (classes intact) and
 * hands clean, marked-up regions to block-finding.
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

  // Only act on the article template.
  const contentfragment = element.querySelector('.cmp-contentfragment');
  if (!contentfragment) return;

  // Strip global chrome up front so its logos/images can't be mistaken for the
  // article hero or author avatar (wknd-cleanup normally does this in
  // afterTransform, which is too late for our beforeTransform rebuild).
  WebImporter.DOMUtils.remove(element, [
    'header', 'footer', '#toggleNav', '#mobileNav', 'iframe', 'script', 'style', 'noscript',
    '[class*="experiencefragment--header"]', '[class*="experiencefragment--footer"]',
  ]);

  // --- 1. hero image: the last image that appears before the breadcrumb in the
  // article's own content (chrome already removed above). ---
  const breadcrumb = element.querySelector('.cmp-breadcrumb');
  let heroImg = null;
  const allImgs = [...element.querySelectorAll('.cmp-image img, img')];
  if (breadcrumb) {
    const preceding = allImgs.filter((img) => breadcrumb.compareDocumentPosition(img)
      & Node.DOCUMENT_POSITION_PRECEDING);
    heroImg = preceding.length ? preceding[preceding.length - 1] : null;
  } else if (allImgs.length) {
    [heroImg] = allImgs;
  }

  // --- 2. title + byline ---
  const titleEl = element.querySelector('h1.cmp-title__text, .cmp-title h1');
  const bylineEl = [...element.querySelectorAll('.cmp-title__text, h4')]
    .find((h) => /^by\s+/i.test(h.textContent.trim()));

  // --- 3. article body: walk the content-fragment elements in order ---
  const cfElements = contentfragment.querySelector('.cmp-contentfragment__elements') || contentfragment;
  const bodyNodes = [];
  const pushHeading = (text) => {
    const h = el(document, 'h2', null, '');
    h.textContent = text;
    bodyNodes.push(h);
  };
  const seen = new Set();
  const walk = (node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType !== 1) return; // elements only
      const tag = child.tagName;
      const cls = (child.className || '').toString();
      if (tag === 'P') {
        const t = child.textContent.trim();
        if (t && !seen.has(t)) { seen.add(t); bodyNodes.push(el(document, 'p', null, child.innerHTML)); }
      } else if (tag === 'BLOCKQUOTE') {
        bodyNodes.push(el(document, 'blockquote', null, child.innerHTML));
      } else if (cls.includes('cmp-title') && child.querySelector('h1,h2,h3,h4,h5,h6')) {
        const hh = child.querySelector('h1,h2,h3,h4,h5,h6');
        const t = hh.textContent.trim();
        if (t && !seen.has(`h:${t}`)) { seen.add(`h:${t}`); pushHeading(t); }
      } else if ((cls.includes('cmp-title__text')) && /^H[1-6]$/.test(tag)) {
        const t = child.textContent.trim();
        if (t && !seen.has(`h:${t}`)) { seen.add(`h:${t}`); pushHeading(t); }
      } else if (tag === 'IMG') {
        const img = el(document, 'img');
        img.setAttribute('src', child.getAttribute('src'));
        img.setAttribute('alt', child.getAttribute('alt') || '');
        bodyNodes.push(img);
      } else {
        // recurse into wrappers (grids, containers, images, text)
        if (tag === 'DIV' || tag === 'ARTICLE' || tag === 'SECTION') walk(child);
      }
    });
  };
  walk(cfElements);

  // --- 4. author bio (experience fragment) ---
  const authorXF = element.querySelector('[class*="experiencefragment--"]')
    || [...element.querySelectorAll('[class*="experiencefragment"]')]
      .find((x) => /jacob|contributor|author/i.test(x.className));

  // --- 5. sidebar related list ---
  const relatedList = element.querySelector('.cmp-list');
  const relatedHeading = (element.querySelector('aside .cmp-title__text, .cmp-title--black .cmp-title__text')
    || {}).textContent || 'Share This Story';

  // ================= rebuild =================
  const frag = document.createElement('div');

  // hero image marker
  if (heroImg) {
    const heroDiv = el(document, 'div', 'article-hero-src');
    const p = document.createElement('p');
    const img = el(document, 'img');
    img.setAttribute('src', heroImg.getAttribute('src'));
    img.setAttribute('alt', heroImg.getAttribute('alt') || '');
    p.append(img);
    heroDiv.append(p);
    frag.append(heroDiv);
  }

  // article-header marker: breadcrumb links + h1 + byline
  const headerDiv = el(document, 'div', 'article-header-src');
  if (breadcrumb) {
    const crumbP = document.createElement('p');
    [...breadcrumb.querySelectorAll('.cmp-breadcrumb__item')].forEach((item, i, arr) => {
      const link = item.querySelector('a');
      if (link) {
        const a = el(document, 'a');
        a.setAttribute('href', link.getAttribute('href'));
        a.textContent = link.textContent.trim();
        crumbP.append(a);
      } else {
        crumbP.append(document.createTextNode(item.textContent.trim()));
      }
      if (i < arr.length - 1) crumbP.append(document.createTextNode(' / '));
    });
    headerDiv.append(crumbP);
  }
  if (titleEl) {
    const h1 = el(document, 'h1', null, titleEl.innerHTML);
    headerDiv.append(h1);
  }
  if (bylineEl) {
    const by = el(document, 'p', null, bylineEl.textContent.trim());
    headerDiv.append(by);
  }
  frag.append(headerDiv);

  // article body (default content — headings/paragraphs/images/blockquote)
  const bodyDiv = el(document, 'div', 'article-body-src');
  bodyNodes.forEach((n) => bodyDiv.append(n));
  frag.append(bodyDiv);

  // author-bio marker
  if (authorXF) {
    const authorDiv = el(document, 'div', 'author-bio-src');
    const aImg = authorXF.querySelector('img');
    if (aImg) {
      const p = document.createElement('p');
      const img = el(document, 'img');
      img.setAttribute('src', aImg.getAttribute('src'));
      img.setAttribute('alt', aImg.getAttribute('alt') || 'author');
      p.append(img);
      authorDiv.append(p);
    }
    const aName = authorXF.querySelector('.cmp-title__text, h2, h3');
    if (aName) authorDiv.append(el(document, 'p', null, aName.textContent.trim()));
    frag.append(authorDiv);
  }

  // related sidebar marker
  if (relatedList) {
    const relDiv = el(document, 'div', 'related-src');
    relDiv.append(el(document, 'p', null, (relatedHeading || 'Share This Story').trim()));
    [...relatedList.querySelectorAll('.cmp-list__item')].forEach((item) => {
      const link = item.querySelector('a');
      const title = item.querySelector('.cmp-list__item-title');
      const date = item.querySelector('.cmp-list__item-date');
      const row = el(document, 'p');
      const a = el(document, 'a');
      a.setAttribute('href', link ? link.getAttribute('href') : '#');
      a.textContent = (title || item).textContent.trim();
      row.append(a);
      if (date && date.textContent.trim()) {
        row.append(document.createTextNode(` | ${date.textContent.trim()}`));
      }
      relDiv.append(row);
    });
    frag.append(relDiv);
  }

  // Replace the whole body content with our clean rebuild.
  element.textContent = '';
  while (frag.firstChild) element.append(frag.firstChild);
}
