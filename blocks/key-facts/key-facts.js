/**
 * key-facts block — WKND adventure-detail summary sidebar.
 *
 * Content model: one row per fact — [ Label | Value ] (e.g. "Activity" |
 * "Surfing"). Renders a stacked list of label/value pairs, each with a light
 * left border (matching WKND's cmp-contentfragment element styling).
 * @param {Element} block
 */
export default function decorate(block) {
  const list = document.createElement('dl');
  list.className = 'key-facts-list';

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const label = cells[0]?.textContent.trim();
    const value = cells[1]?.textContent.trim();
    if (!label) return;

    const item = document.createElement('div');
    item.className = 'key-facts-item';

    const dt = document.createElement('dt');
    dt.className = 'key-facts-label';
    dt.textContent = label;

    const dd = document.createElement('dd');
    dd.className = 'key-facts-value';
    dd.textContent = value || '';

    item.append(dt, dd);
    list.append(item);
  });

  block.textContent = '';
  block.append(list);
}
