/*
 * Scope Report block.
 * Content model: authored default content — headings, paragraphs, tables, a
 * "metrics" list (first <ul>, items "<value> — <label>"), and a locales list
 * (<ul class="sr-locales">, items "<count> — <name>"). The decorator turns the
 * metrics list into big tiles, the locales list into compact mini-tiles, wraps
 * tables for horizontal scroll, and converts EDS-status cells into pills.
 */

/** Split "value <sep> label" on an em-dash or hyphen. */
function splitValueLabel(raw) {
  const text = raw.trim();
  const sep = text.includes('—') ? '—' : ' - ';
  const [value, ...rest] = text.split(sep);
  return { value: value.trim(), label: rest.join(sep).trim() };
}

/** Map an EDS-status string to a pill modifier class. */
function statusModifier(text) {
  const t = text.toLowerCase();
  if (t.includes('migrated')) return 'done';
  if (t.includes('custom')) return 'custom';
  return 'ok';
}

export default function decorate(block) {
  // flatten single-cell wrapper rows
  [...block.children].forEach((row) => {
    if (row.children.length === 1) {
      const cell = row.firstElementChild;
      while (cell.firstChild) row.appendChild(cell.firstChild);
      cell.remove();
    }
  });

  // metric tiles — first list of "value — label" items that is NOT the locales list
  const lists = [...block.querySelectorAll('ul')];
  const metricsList = lists.find((ul) => !ul.classList.contains('sr-locales')
    && [...ul.querySelectorAll('li')].every((li) => li.textContent.includes('—') || li.textContent.includes(' - ')));

  if (metricsList) {
    metricsList.classList.add('sr-metrics');
    metricsList.querySelectorAll('li').forEach((li) => {
      const { value, label } = splitValueLabel(li.textContent);
      li.textContent = '';
      const v = document.createElement('span');
      v.className = 'sr-metric-value';
      v.textContent = value;
      const l = document.createElement('span');
      l.className = 'sr-metric-label';
      l.textContent = label;
      li.append(v, l);
    });
  }

  // locale mini-tiles
  const localeList = block.querySelector('ul.sr-locales');
  if (localeList) {
    localeList.classList.add('sr-locale-tiles');
    localeList.querySelectorAll('li').forEach((li) => {
      const { value, label } = splitValueLabel(li.textContent);
      li.textContent = '';
      const c = document.createElement('span');
      c.className = 'sr-locale-count';
      c.textContent = value;
      const n = document.createElement('span');
      n.className = 'sr-locale-name';
      n.textContent = label;
      li.append(c, n);
    });
  }

  // wrap tables for horizontal scroll + turn EDS-status cells into pills
  block.querySelectorAll('table').forEach((table) => {
    // status pills: last column when header says "status"
    const headers = [...table.querySelectorAll('thead th')].map((th) => th.textContent.toLowerCase());
    const statusCol = headers.findIndex((h) => h.includes('status'));
    if (statusCol >= 0) {
      table.querySelectorAll('tbody tr').forEach((tr) => {
        const cell = tr.children[statusCol];
        if (!cell) return;
        const text = cell.textContent.trim();
        cell.textContent = '';
        const pill = document.createElement('span');
        pill.className = `sr-status sr-status-${statusModifier(text)}`;
        pill.textContent = text;
        cell.append(pill);
      });
    }

    if (!table.closest('.sr-table-wrap')) {
      const wrap = document.createElement('div');
      wrap.className = 'sr-table-wrap';
      table.replaceWith(wrap);
      wrap.append(table);
    }
  });
}
