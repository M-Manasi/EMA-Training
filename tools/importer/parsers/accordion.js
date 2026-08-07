/* eslint-disable */
/* global WebImporter */
/**
 * Parser: accordion block.
 *
 * Follows the EDS "Accordion" library convention: a 2-column table whose first
 * row is the block name ("Accordion", emitted by createBlock) and each
 * subsequent row is one item — [ Title | Content ]. Title cell = the clickable
 * question; Content cell = the answer body revealed on expand.
 *
 * Consumes `div.faq-accordion-src` whose children are
 * `div.faq-accordion-row[data-question]` wrapping the answer content (produced
 * by wknd-faq.js).
 */
export default function parse(element, { document }) {
  const rows = [...element.querySelectorAll(':scope > .faq-accordion-row')];
  if (!rows.length) {
    element.remove();
    return;
  }

  // One table row per item: [ Title (cell 1) | Content (cell 2) ].
  const cells = rows.map((row) => {
    const question = row.getAttribute('data-question') || '';
    const answer = row.querySelector('.faq-accordion-answer') || row;
    const answerNodes = [...answer.childNodes];
    return [question, answerNodes];
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'Accordion', cells });
  element.replaceWith(block);
}
