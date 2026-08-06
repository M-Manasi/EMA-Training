/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: columns
 * Base block: columns
 * Source: https://wknd.site/us/en.html (div.teaser.cmp-teaser--featured)
 * Generated for WKND homepage migration (DA project).
 *
 * Library convention (Columns): multiple columns, at least one row. Base the
 * column count on the natural visual grouping of the content.
 * This featured teaser is a 2-up: image on the left, text on the right.
 *   Column 1: image.
 *   Column 2: pretitle ("Featured Article") + heading + description + CTA.
 * Matches blocks/columns/columns.js, which reads firstElementChild.children as
 * columns and tags the image-only column via `columns-img-col`.
 */
export default function parse(element, { document }) {
  const img = element.querySelector('.cmp-teaser__image img, img');

  const pretitle = element.querySelector('.cmp-teaser__pretitle');
  const title = element.querySelector('.cmp-teaser__title, h1, h2, h3');
  const descriptionEl = element.querySelector('.cmp-teaser__description, p:not(.cmp-teaser__pretitle)');
  const cta = element.querySelector('.cmp-teaser__action-link, .cmp-teaser__action-container a, a');

  // Text column: preserve authored order (pretitle -> heading -> description -> CTA).
  const textCell = [];
  if (pretitle) {
    // Emphasize the pretitle so it renders as a distinct lead line.
    const strong = document.createElement('p');
    const em = document.createElement('strong');
    em.textContent = pretitle.textContent.trim();
    strong.append(em);
    textCell.push(strong);
  }
  if (title) textCell.push(title);
  if (descriptionEl) {
    if (descriptionEl.querySelector('p, ul, ol')) {
      textCell.push(descriptionEl);
    } else {
      const p = document.createElement('p');
      p.innerHTML = descriptionEl.innerHTML.trim();
      textCell.push(p);
    }
  }
  if (cta) textCell.push(cta);

  // Empty-block guard.
  if (!img && !textCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Single row, two columns: [image] | [text].
  const cells = [[img || '', textCell]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns', cells });
  element.replaceWith(block);
}
