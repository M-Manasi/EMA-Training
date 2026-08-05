/*
 * Scope Report block.
 * Content model: the block contains authored default content — headings,
 * paragraphs, tables, and one "metrics" list where each item is
 * "<value> — <label>". The decorator turns that first list into metric tiles;
 * all other content passes through and is styled by scope-report.css.
 */
export default function decorate(block) {
  // the block wraps its rows in divs; flatten a single-cell wrapper
  [...block.children].forEach((row) => {
    if (row.children.length === 1) {
      const cell = row.firstElementChild;
      while (cell.firstChild) row.appendChild(cell.firstChild);
      cell.remove();
    }
  });

  // find the metrics list: first <ul> whose items contain an em-dash separator
  const lists = [...block.querySelectorAll('ul')];
  const metricsList = lists.find((ul) => [...ul.querySelectorAll('li')]
    .every((li) => li.textContent.includes('—') || li.textContent.includes(' - ')));

  if (metricsList) {
    metricsList.classList.add('sr-metrics');
    metricsList.querySelectorAll('li').forEach((li) => {
      const raw = li.textContent.trim();
      const sep = raw.includes('—') ? '—' : ' - ';
      const [value, ...rest] = raw.split(sep);
      const label = rest.join(sep).trim();
      li.textContent = '';
      const v = document.createElement('span');
      v.className = 'sr-metric-value';
      v.textContent = value.trim();
      const l = document.createElement('span');
      l.className = 'sr-metric-label';
      l.textContent = label;
      li.append(v, l);
    });
  }

  // wrap each table so it can scroll horizontally on narrow screens
  block.querySelectorAll('table').forEach((table) => {
    if (table.closest('.sr-table-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'sr-table-wrap';
    table.replaceWith(wrap);
    wrap.append(table);
  });
}
