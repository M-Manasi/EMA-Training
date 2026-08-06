/**
 * related block — WKND article sidebar ("Share This Story" / up-next list).
 *
 * Content model:
 *   row 1: heading text (e.g. "Share This Story") — single cell
 *   rows 2+: [ linked title | date ]
 *
 * Renders a titled list of related-article links with dates.
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  block.textContent = '';

  // First row = heading.
  const headingRow = rows.shift();
  if (headingRow) {
    const h = document.createElement('h2');
    h.className = 'related-title';
    h.textContent = headingRow.textContent.trim();
    block.append(h);
  }

  const list = document.createElement('ul');
  list.className = 'related-list';

  rows.forEach((row) => {
    const cols = [...row.children];
    const titleCol = cols[0];
    const dateCol = cols[1];
    if (!titleCol) return;

    const li = document.createElement('li');
    li.className = 'related-item';

    const link = titleCol.querySelector('a');
    const a = document.createElement('a');
    a.className = 'related-item-link';
    a.href = link ? link.getAttribute('href') : '#';

    const title = document.createElement('span');
    title.className = 'related-item-title';
    title.textContent = (link || titleCol).textContent.trim();
    a.append(title);

    if (dateCol && dateCol.textContent.trim()) {
      const date = document.createElement('span');
      date.className = 'related-item-date';
      date.textContent = dateCol.textContent.trim();
      a.append(date);
    }

    li.append(a);
    list.append(li);
  });

  block.append(list);
}
