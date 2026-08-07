/* eslint-disable */
/* global WebImporter */
/**
 * Parser: key-facts block.
 * Consumes `div.key-facts-src` whose paragraphs are "Label | Value" and emits
 * a 2-column key-facts block: one row per fact as [ Label | Value ].
 */
export default function parse(element, { document }) {
  const rows = [...element.querySelectorAll(':scope > p')]
    .map((p) => p.textContent.split('|').map((s) => s.trim()))
    .filter((parts) => parts[0]);

  if (!rows.length) {
    element.remove();
    return;
  }

  const cells = rows.map(([label, value]) => [label, value || '']);
  const block = WebImporter.Blocks.createBlock(document, { name: 'key-facts', cells });
  element.replaceWith(block);
}
