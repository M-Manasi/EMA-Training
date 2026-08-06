/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the adventures listing block.
 * Source: https://wknd.site/us/en/adventures.html — a cmp-image-list whose
 * items have been annotated with data-categories by
 * transformers/wknd-adventures-categories.js (which also collapsed the 6
 * per-tab lists down to this single "All" list).
 *
 * Block contract (blocks/adventures/adventures.js): one row per adventure —
 *   cell 1: image
 *   cell 2: heading (linked title) + description paragraph
 *   cell 3: categories, comma-separated (e.g. "Surfing, Travel")
 */
export default function parse(element, { document }) {
  const items = Array.from(element.querySelectorAll('.cmp-image-list__item, li'));
  const cells = [];

  items.forEach((item) => {
    const img = item.querySelector('.cmp-image-list__item-image img, img');
    const titleText = item.querySelector('.cmp-image-list__item-title');
    const titleLink = item.querySelector('.cmp-image-list__item-title-link');
    const description = item.querySelector('.cmp-image-list__item-description');
    const categories = item.getAttribute('data-categories') || '';

    const bodyCell = [];
    if (titleText) {
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

    if (img || bodyCell.length) {
      cells.push([img || '', bodyCell, categories]);
    }
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'adventures', cells });
  element.replaceWith(block);
}
