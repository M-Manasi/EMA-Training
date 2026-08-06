/* eslint-disable */
/* global WebImporter */
/**
 * Parser: related (sidebar) block.
 * Consumes `div.related-src`: the first <p> is the heading; each subsequent <p>
 * is "linked-title | date". Emits the related block: row 1 = heading, then one
 * row per item as [ title-link | date ].
 */
export default function parse(element, { document }) {
  const paras = [...element.querySelectorAll(':scope > p')];
  if (!paras.length) {
    element.remove();
    return;
  }

  const cells = [];
  // row 1: heading (single cell)
  const heading = paras.shift();
  cells.push([heading.textContent.trim()]);

  // item rows
  paras.forEach((p) => {
    const link = p.querySelector('a');
    const titleCell = [];
    if (link) {
      const a = document.createElement('a');
      a.setAttribute('href', link.getAttribute('href'));
      a.textContent = link.textContent.trim();
      titleCell.push(a);
    } else {
      titleCell.push(p.textContent.trim());
    }
    // date is the text after the "|" separator
    const full = p.textContent;
    const dateMatch = full.split('|')[1];
    const date = dateMatch ? dateMatch.trim() : '';
    cells.push([titleCell, date]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'related', cells });
  element.replaceWith(block);
}
