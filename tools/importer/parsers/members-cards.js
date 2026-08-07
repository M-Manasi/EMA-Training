/* eslint-disable */
/* global WebImporter */
/**
 * Parser: members-cards.
 * The WKND magazine "Members Only" section holds two secure teasers
 * (div.teaser.cmp-teaser--secure) — image + title + description + a Read More
 * CTA. This parser collects ALL secure teasers on the page and emits a single
 * `cards` block (2-up grid), matching the article card grid styling.
 *
 * Runs on the first secure teaser; it gathers its siblings, then removes the
 * others so they aren't double-processed.
 */
export default function parse(element, { document }) {
  // Gather every secure teaser on the page (element is the first one).
  const teasers = [...document.querySelectorAll('.cmp-teaser--secure, .teaser.cmp-teaser--list')];
  if (!teasers.length) {
    element.remove();
    return;
  }

  const cells = [];
  teasers.forEach((teaser) => {
    const img = teaser.querySelector('.cmp-teaser__image img, img');
    const titleEl = teaser.querySelector('.cmp-teaser__title, h2, h3');
    const link = teaser.querySelector('.cmp-teaser__action-link, .cmp-teaser__title-link, a');
    const description = teaser.querySelector('.cmp-teaser__description, p');

    const body = [];
    if (titleEl) {
      const h = document.createElement('h3');
      const href = link ? link.getAttribute('href') : null;
      if (href) {
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = titleEl.textContent.trim();
        h.append(a);
      } else {
        h.textContent = titleEl.textContent.trim();
      }
      body.push(h);
    }
    if (description) {
      const p = document.createElement('p');
      p.textContent = description.textContent.trim();
      body.push(p);
    }
    if (img || body.length) cells.push([img || '', body]);
  });

  if (!cells.length) {
    element.remove();
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards', cells });
  // Replace the first teaser with the block; remove the rest.
  element.replaceWith(block);
  teasers.slice(1).forEach((t) => t.parentNode && t.remove());
}
