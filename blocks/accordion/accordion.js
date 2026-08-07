/**
 * accordion block — WKND FAQ accordion.
 *
 * Content model: one row per item — [ Question | Answer ]. Each row becomes a
 * native <details>/<summary> so the expand/collapse is accessible and works
 * without JavaScript; CSS renders the +/− toggle. Collapsed by default,
 * matching WKND.
 * @param {Element} block
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const questionCell = cells[0];
    const answerCell = cells[1];
    if (!questionCell) return;

    const details = document.createElement('details');
    details.className = 'accordion-item';

    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    // Preserve the question's text (headings in the source become the label).
    summary.textContent = questionCell.textContent.trim();

    const body = document.createElement('div');
    body.className = 'accordion-item-body';
    if (answerCell) {
      while (answerCell.firstChild) body.append(answerCell.firstChild);
    }

    details.append(summary, body);
    row.replaceWith(details);
  });
}
