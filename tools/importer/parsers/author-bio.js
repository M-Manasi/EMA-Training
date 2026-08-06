/* eslint-disable */
/* global WebImporter */
/**
 * Parser: author-bio block.
 * Consumes `div.author-bio-src` (author image <p> + name <p>) and emits a
 * 2-column author-bio block: [ image | name ].
 */
export default function parse(element, { document }) {
  const img = element.querySelector('img');
  const paras = [...element.querySelectorAll('p')].filter((p) => !p.querySelector('img'));
  const nameCell = [];
  paras.forEach((p) => nameCell.push(p));

  if (!img && !nameCell.length) {
    element.remove();
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'author-bio',
    cells: [[img || '', nameCell]],
  });
  element.replaceWith(block);
}
