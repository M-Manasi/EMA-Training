/* eslint-disable */
/* global WebImporter */
/**
 * Parser: tabs block.
 *
 * Follows the EDS "Tabs" library convention: a 2-column table whose first row
 * is the block name ("Tabs", emitted by createBlock) and each subsequent row is
 * a single tab — [ Tab Label | Tab Content ]. Tab Label is the first cell; the
 * tab's content (paragraphs/images/lists) is the second cell.
 *
 * Consumes `div.tabs-src` whose children are `div.tabs-src-row[data-tab-label]`,
 * each wrapping that tab's content (produced by wknd-adventure-detail.js).
 */
export default function parse(element, { document }) {
  const rows = [...element.querySelectorAll(':scope > .tabs-src-row')];
  if (!rows.length) {
    element.remove();
    return;
  }

  // One table row per tab: [ Tab Label (cell 1) | Tab Content (cell 2) ].
  const cells = rows.map((row) => {
    const label = row.getAttribute('data-tab-label') || '';
    const content = row.querySelector('.tabs-src-content') || row;
    const contentNodes = [...content.childNodes];
    return [label, contentNodes];
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'Tabs', cells });
  element.replaceWith(block);
}
