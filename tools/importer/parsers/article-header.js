/* eslint-disable */
/* global WebImporter */
/**
 * Parser: article-header block.
 * Consumes the `div.article-header-src` marker produced by wknd-article.js
 * (breadcrumb <p> of links + <h1> title + byline <p>) and emits a single-cell
 * article-header block preserving those elements in order.
 */
export default function parse(element, { document }) {
  const cell = [];
  [...element.children].forEach((child) => cell.push(child));
  if (!cell.length) {
    element.remove();
    return;
  }
  const block = WebImporter.Blocks.createBlock(document, {
    name: 'article-header',
    cells: [[cell]],
  });
  element.replaceWith(block);
}
