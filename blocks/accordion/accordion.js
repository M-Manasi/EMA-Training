/**
 * accordion block — WKND FAQ accordion.
 *
 * Two content models, same rendered output (native <details>/<summary> so
 * expand/collapse is accessible and works without JS; CSS renders the +/−
 * toggle; collapsed by default, matching WKND):
 *
 * 1. DYNAMIC (preferred, reusable): the block's first row holds a link/path to
 *    a DA-authored spreadsheet (served as JSON, e.g. `/us/en/faqs-data.json`)
 *    with `question` + `answer` columns (optional `order`). The block fetches
 *    it, sorts by `order`, and renders one item per row. Authors add/edit/
 *    reorder FAQs by editing the sheet — no page or code change — and the same
 *    block is reusable on any page by pointing it at a different sheet.
 *
 * 2. STATIC (fallback, backward compatible): if no data source is configured,
 *    each block row is one item — [ Question | Answer ] — rendered as-is.
 *
 * @param {Element} block The accordion block element
 */

/** Build one <details> item from a question string + answer nodes/HTML. */
function buildItem(questionText, answerContent) {
  const details = document.createElement('details');
  details.className = 'accordion-item';

  const summary = document.createElement('summary');
  summary.className = 'accordion-item-label';
  summary.textContent = (questionText || '').trim();

  const body = document.createElement('div');
  body.className = 'accordion-item-body';
  if (typeof answerContent === 'string') {
    // authored answer HTML from the sheet — parsed, not executed
    body.innerHTML = answerContent;
    // strip anything unsafe that a spreadsheet cell should never carry
    body.querySelectorAll('script, style, iframe, object, embed').forEach((el) => el.remove());
  } else if (answerContent) {
    // DOM nodes (static-rows model)
    [...answerContent].forEach((node) => body.append(node));
  }

  details.append(summary, body);
  return details;
}

/**
 * Detects a configured data source: an <a href> or a bare path in the block's
 * first row. Returns the resolved JSON path, or null for the static model.
 */
function getDataSource(block) {
  const firstRow = block.firstElementChild;
  if (!firstRow) return null;
  const link = firstRow.querySelector('a[href]');
  const raw = link ? link.getAttribute('href') : firstRow.textContent.trim();
  if (!raw) return null;
  // only treat it as a source if it points at a sheet/JSON endpoint
  if (!link && !/\.json(\?|$)/i.test(raw)) return null;
  try {
    const url = new URL(raw, window.location.href);
    return url.pathname + url.search;
  } catch (e) {
    return raw;
  }
}

/** Renders items from a fetched sheet (EDS JSON: { data: [...] }). */
async function renderFromSheet(block, path) {
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`accordion: sheet ${path} -> ${resp.status}`);
  const json = await resp.json();
  const rows = Array.isArray(json) ? json : (json.data || []);
  rows
    .slice()
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .forEach((row) => {
      const question = row.question || row.Question || row.title || '';
      const answer = row.answer || row.Answer || row.description || '';
      if (question) block.append(buildItem(question, answer));
    });
}

/** Renders items from the authored static rows ([ Question | Answer ]). */
function renderFromRows(block, rows) {
  rows.forEach((row) => {
    const cells = [...row.children];
    const questionCell = cells[0];
    if (!questionCell) return;
    const answerCell = cells[1];
    block.append(buildItem(
      questionCell.textContent,
      answerCell ? [...answerCell.childNodes] : null,
    ));
  });
}

export default async function decorate(block) {
  const dataSource = getDataSource(block);
  // snapshot the authored rows before we clear the block
  const staticRows = [...block.children];

  block.textContent = '';

  if (dataSource) {
    try {
      await renderFromSheet(block, dataSource);
      if (block.children.length) return;
    } catch (e) {
      // fall through to static rows / empty
    }
  }

  // fallback: re-render the original authored rows (skip a config-only first row)
  const rowsToRender = dataSource ? staticRows.slice(1) : staticRows;
  renderFromRows(block, rowsToRender);
}
