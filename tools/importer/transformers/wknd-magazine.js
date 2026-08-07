/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: restructure the WKND magazine index into clean EDS sections.
 *
 * Source is deeply nested (depth ~7). This transformer (beforeTransform) pulls
 * the semantic pieces out and rebuilds a flat DOM the parsers + section logic
 * can consume reliably:
 *
 *   <main>
 *     <h1>Magazine</h1>
 *     <div class="mag-featured-src">   featured teaser -> columns block (grey)
 *     ---
 *     <h2>All Articles</h2>
 *     <div class="mag-cards-src">       article image-list -> cards block
 *     ---
 *     <h2>Members Only</h2>
 *     <p>Sign in to un-lock…</p>
 *     <div class="mag-members-src">     secure teasers -> cards block
 *     [section-metadata style=grey on the featured section]
 *
 * Keeps the original `.cmp-teaser--featured` / `.cmp-image-list` / secure teaser
 * nodes inside the markers so the existing columns/cards parsers still match.
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

function el(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.beforeTransform) return;
  const document = element.ownerDocument;

  // Only act on the magazine index (featured teaser + image-list + secure teasers).
  const featured = element.querySelector('.teaser.cmp-teaser--featured');
  const imageList = element.querySelector('.image-list.list, ul.cmp-image-list');
  if (!featured || !imageList) return;

  // Strip global chrome so nothing leaks into the rebuild.
  WebImporter.DOMUtils.remove(element, [
    'header', 'footer', '#toggleNav', '#mobileNav', 'iframe', 'script', 'style', 'noscript',
    '[class*="experiencefragment--header"]', '[class*="experiencefragment--footer"]',
  ]);

  // Section headings by text.
  const findTitle = (text) => [...element.querySelectorAll('.cmp-title__text, h1, h2, h3')]
    .find((h) => h.textContent.trim().toLowerCase() === text.toLowerCase());
  const magTitle = findTitle('Magazine');
  const allArticles = findTitle('All Articles');
  const membersOnly = findTitle('Members Only');
  const membersIntro = [...element.querySelectorAll('.cmp-text, p')]
    .find((p) => /un-?lock exclusive content/i.test(p.textContent));

  // Secure teasers (members only).
  const secureTeasers = [...element.querySelectorAll('.teaser.cmp-teaser--secure, .cmp-teaser--secure')];

  // Re-select live nodes (chrome removal may have changed the tree).
  const featuredLive = element.querySelector('.teaser.cmp-teaser--featured');
  const listLive = element.querySelector('.image-list.list, ul.cmp-image-list');

  // ================= rebuild =================
  const frag = document.createElement('div');

  // H1 — its own white section (WKND keeps the "Magazine" title on white; only
  // the featured teaser box below it is grey).
  frag.append(el(document, 'h1', null, (magTitle && magTitle.textContent.trim()) || 'Magazine'));
  frag.append(el(document, 'hr'));

  // featured teaser marker (columns, grey)
  const featDiv = el(document, 'div', 'mag-featured-src');
  if (featuredLive) featDiv.append(featuredLive);
  frag.append(featDiv);
  frag.append(el(document, 'hr'));

  // All Articles heading + article grid marker (cards)
  frag.append(el(document, 'h2', null, (allArticles && allArticles.textContent.trim()) || 'All Articles'));
  const cardsDiv = el(document, 'div', 'mag-cards-src');
  if (listLive) cardsDiv.append(listLive);
  frag.append(cardsDiv);
  frag.append(el(document, 'hr'));

  // Members Only heading + intro + secure teasers marker (cards)
  if (membersOnly || secureTeasers.length) {
    frag.append(el(document, 'h2', null, (membersOnly && membersOnly.textContent.trim()) || 'Members Only'));
    if (membersIntro) {
      const p = document.createElement('p');
      p.innerHTML = membersIntro.innerHTML.trim();
      frag.append(p);
    }
    const memDiv = el(document, 'div', 'mag-members-src');
    secureTeasers.forEach((t) => memDiv.append(t));
    frag.append(memDiv);
  }

  // Replace the body content with our clean rebuild.
  element.textContent = '';
  while (frag.firstChild) element.append(frag.firstChild);
}
