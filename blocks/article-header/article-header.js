/**
 * article-header block — WKND magazine article header.
 *
 * Content model (single cell, stacked elements):
 *   - a paragraph of breadcrumb links (e.g. "Magazine" / current)
 *   - the article title heading
 *   - a byline paragraph ("By <author>")
 *
 * Decorated: breadcrumb → <nav.article-header-breadcrumb>, the title stays the
 * page's <h1>, and the byline paragraph is tagged for styling.
 * @param {Element} block
 */
export default function decorate(block) {
  const cell = block.querySelector(':scope > div > div') || block;
  const children = [...cell.children];

  // First paragraph containing links = breadcrumb.
  const breadcrumbP = children.find((el) => el.tagName === 'P' && el.querySelector('a'));
  if (breadcrumbP) {
    const nav = document.createElement('nav');
    nav.className = 'article-header-breadcrumb';
    nav.setAttribute('aria-label', 'Breadcrumb');
    while (breadcrumbP.firstChild) nav.append(breadcrumbP.firstChild);
    breadcrumbP.replaceWith(nav);
  }

  // Ensure the title is an <h1> (magazine articles have a single page title).
  const heading = cell.querySelector('h1, h2, h3');
  if (heading && heading.tagName !== 'H1') {
    const h1 = document.createElement('h1');
    h1.id = heading.id;
    h1.innerHTML = heading.innerHTML;
    heading.replaceWith(h1);
  }

  // The byline is the paragraph after the heading (e.g. "By Jacob Wester").
  const h1El = cell.querySelector('h1');
  const byline = h1El && h1El.nextElementSibling && h1El.nextElementSibling.tagName === 'P'
    ? h1El.nextElementSibling
    : null;
  if (byline) byline.classList.add('article-header-byline');
}
