/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: derive adventure categories from the WKND tabs, collapse to one
 * annotated list.
 *
 * The WKND adventures page renders a cmp-tabs with one tabpanel per category
 * (All, Climbing, Cycling, Skiing, Surfing, Travel); every panel contains a
 * cmp-image-list, and an adventure appears in "All" plus each category it
 * belongs to. We want a SINGLE list (the "All" panel's items) where each item
 * carries its categories, so the adventures block can build the tab filter
 * client-side without duplicated content.
 *
 * Strategy (beforeTransform, while ids/classes still exist):
 *  1. Map each tab label -> its tabpanel via the tab's aria-controls.
 *  2. For every non-"All" panel, collect the item titles it contains and record
 *     the category against each title.
 *  3. On the "All" panel's image-list items, set data-categories="Cat1, Cat2".
 *  4. Unwrap the "All" image-list out of the tabs component and remove the tabs
 *     wrapper (with the now-redundant per-category panels), leaving just the
 *     annotated list where the parser can find it.
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

function itemTitle(item) {
  const t = item.querySelector('.cmp-image-list__item-title');
  return t ? t.textContent.trim() : '';
}

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.beforeTransform) return;

  const tabs = element.querySelector('.cmp-tabs');
  if (!tabs) return;

  // 1. tab label -> panel element
  const tabEls = Array.from(tabs.querySelectorAll('.cmp-tabs__tab'));
  const labelToPanel = [];
  tabEls.forEach((tab) => {
    const label = tab.textContent.trim();
    const panelId = tab.getAttribute('aria-controls');
    const panel = panelId ? element.querySelector(`#${CSS.escape ? CSS.escape(panelId) : panelId}`) : null;
    if (panel) labelToPanel.push({ label, panel });
  });
  if (!labelToPanel.length) return;

  // 2. title -> [categories] from non-All panels
  const titleCategories = {};
  labelToPanel.forEach(({ label, panel }) => {
    if (label.toLowerCase() === 'all') return;
    panel.querySelectorAll('.cmp-image-list__item').forEach((item) => {
      const title = itemTitle(item);
      if (!title) return;
      if (!titleCategories[title]) titleCategories[title] = [];
      if (!titleCategories[title].includes(label)) titleCategories[title].push(label);
    });
  });

  // 3. annotate the All list's items
  const allEntry = labelToPanel.find((x) => x.label.toLowerCase() === 'all') || labelToPanel[0];
  const allList = allEntry.panel.querySelector('.cmp-image-list');
  if (!allList) return;
  allList.querySelectorAll('.cmp-image-list__item').forEach((item) => {
    const title = itemTitle(item);
    const cats = titleCategories[title] || [];
    item.setAttribute('data-categories', cats.join(', '));
  });

  // 4. hoist the annotated list out and drop the tabs wrapper
  tabs.parentNode.insertBefore(allList, tabs);
  tabs.remove();
}
