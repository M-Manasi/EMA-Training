import { toClassName } from '../../scripts/aem.js';

/**
 * tabs block — WKND adventure-detail content tabs (Overview / Itinerary / …).
 *
 * Content model: one row per tab — [ Tab Label | Tab Content ]. The first cell
 * is the label; the second holds that tab's rich content (paragraphs, images,
 * lists). Renders a tablist above stacked panels; clicking a tab shows its
 * panel and hides the others. First tab is active by default.
 * @param {Element} block
 */
export default async function decorate(block) {
  const rows = [...block.children];

  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  const panels = [];

  rows.forEach((row, i) => {
    const cells = [...row.children];
    const labelCell = cells[0];
    const contentCell = cells[1];
    const label = (labelCell?.textContent || `Tab ${i + 1}`).trim();
    const id = toClassName(label) || `tab-${i}`;
    const active = i === 0;

    // Build the panel from the content cell.
    const panel = document.createElement('div');
    panel.className = 'tabs-panel';
    panel.id = `tabpanel-${id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `tab-${id}`);
    panel.setAttribute('aria-hidden', active ? 'false' : 'true');
    if (contentCell) {
      while (contentCell.firstChild) panel.append(contentCell.firstChild);
    }
    panels.push(panel);

    // Build the tab button.
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.textContent = label;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    button.addEventListener('click', () => {
      panels.forEach((pnl) => pnl.setAttribute('aria-hidden', 'true'));
      tablist.querySelectorAll('button').forEach((btn) => btn.setAttribute('aria-selected', 'false'));
      panel.setAttribute('aria-hidden', 'false');
      button.setAttribute('aria-selected', 'true');
    });
    tablist.append(button);
  });

  block.textContent = '';
  block.append(tablist, ...panels);
}
