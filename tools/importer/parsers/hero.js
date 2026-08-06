/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: hero
 * Base block: hero
 * Source: https://wknd.site/us/en.html (div.teaser.cmp-teaser--hero.cmp-teaser--imagebottom)
 * Generated for WKND homepage migration (DA project).
 *
 * Library convention (Hero): 1 column, 3 rows.
 *   Row 1: block name (added by createBlock).
 *   Row 2: single cell — background image.
 *   Row 3: single cell — title (heading) + subheading/description + CTA.
 * NOTE: repo blocks/hero/hero.js is currently empty and will be enhanced in the
 * build phase; this table follows the block-library Hero content model so the
 * enhanced decorator has a background-image row + a text/CTA row to work with.
 */
export default function parse(element, { document }) {
  const img = element.querySelector('.cmp-teaser__image img, img');

  const title = element.querySelector('.cmp-teaser__title, h1, h2, h3');
  const descriptionEl = element.querySelector('.cmp-teaser__description, p');
  const cta = element.querySelector('.cmp-teaser__action-link, .cmp-teaser__action-container a, a');

  // Row 3 content cell: heading + description + CTA (all in a single cell).
  const contentCell = [];
  if (title) contentCell.push(title);
  if (descriptionEl) {
    if (descriptionEl.querySelector('p, ul, ol')) {
      contentCell.push(descriptionEl);
    } else {
      const p = document.createElement('p');
      p.innerHTML = descriptionEl.innerHTML.trim();
      contentCell.push(p);
    }
  }
  if (cta) contentCell.push(cta);

  // Empty-block guard.
  if (!img && !contentCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // 1-column block: each row is a single cell.
  const cells = [];
  if (img) cells.push([img]);           // Row 2: background image.
  cells.push([contentCell]);            // Row 3: title + description + CTA in one cell.

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero', cells });
  element.replaceWith(block);
}
