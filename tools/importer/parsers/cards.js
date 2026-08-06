/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: cards
 * Base block: cards
 * Source: https://wknd.site/us/en.html (div.image-list.list — appears twice:
 *   Recent Articles grid and adventures/"Where do you want to go" grid)
 * Generated for WKND homepage migration (DA project).
 *
 * Library convention (Cards): 2 columns, one row per card.
 *   Cell 1: image (mandatory).
 *   Cell 2: text — title (heading) + description (+ optional CTA).
 * Matches blocks/cards/cards.js, which tags an image-only div as
 * `cards-card-image` and the remaining div as `cards-card-body`.
 */
export default function parse(element, { document }) {
  const items = Array.from(element.querySelectorAll('.cmp-image-list__item, li'));

  const cells = [];

  items.forEach((item) => {
    // Image cell.
    const img = item.querySelector('.cmp-image-list__item-image img, img');

    // Title: prefer the title span/link; the whole card links to the article.
    const titleText = item.querySelector('.cmp-image-list__item-title');
    const titleLink = item.querySelector('.cmp-image-list__item-title-link');
    const description = item.querySelector('.cmp-image-list__item-description');

    const bodyCell = [];
    if (titleText) {
      // Render the title as a linked heading so it stays a heading + preserves the link.
      const h = document.createElement('h3');
      const href = titleLink ? titleLink.getAttribute('href') : null;
      if (href) {
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = titleText.textContent.trim();
        h.append(a);
      } else {
        h.textContent = titleText.textContent.trim();
      }
      bodyCell.push(h);
    } else if (titleLink) {
      const h = document.createElement('h3');
      h.append(titleLink);
      bodyCell.push(h);
    }

    if (description) {
      const p = document.createElement('p');
      p.textContent = description.textContent.trim();
      bodyCell.push(p);
    }

    // Only emit a card row when it has an image or body content.
    if (img || bodyCell.length) {
      cells.push([img || '', bodyCell]);
    }
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards', cells });
  element.replaceWith(block);
}
