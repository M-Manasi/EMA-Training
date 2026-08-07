/* eslint-disable */
/* global WebImporter */
/**
 * Parser: breadcrumb block.
 * Consumes `div.breadcrumb-src` (a <p> of links + trailing current text) and
 * emits a single-cell breadcrumb block preserving the trail.
 */
export default function parse(element, { document }) {
  const p = element.querySelector('p');
  if (!p || !p.textContent.trim()) {
    element.remove();
    return;
  }
  const block = WebImporter.Blocks.createBlock(document, {
    name: 'breadcrumb',
    cells: [[p]],
  });
  element.replaceWith(block);
}
