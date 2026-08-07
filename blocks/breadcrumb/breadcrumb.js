/**
 * breadcrumb block — WKND breadcrumb trail (Adventures / Bali Surf Camp).
 *
 * Content model: a single cell holding the trail — links and/or plain text for
 * the current page, in order. Renders a nav > ol with the last item marked as
 * the current page.
 * @param {Element} block
 */
export default function decorate(block) {
  const cell = block.querySelector(':scope > div > div') || block;
  // Collect ordered items: anchors become links, the trailing text is current.
  const items = [];
  cell.querySelectorAll('a[href]').forEach((a) => {
    items.push({ text: a.textContent.trim(), href: a.getAttribute('href') });
  });
  // The current (last) crumb is the cell's text that is NOT inside an anchor.
  // (aem.js wrapTextNodes may wrap that loose text in a <p>, so read the full
  // cell text and subtract the link texts rather than only scanning text nodes.)
  const linkText = items.map((i) => i.text).join(' ');
  let currentText = cell.textContent.trim();
  items.forEach((i) => { currentText = currentText.replace(i.text, ' '); });
  currentText = currentText.replace(/\s+/g, ' ').trim();
  if (!currentText && linkText) currentText = '';

  const nav = document.createElement('nav');
  nav.className = 'breadcrumb-nav';
  nav.setAttribute('aria-label', 'Breadcrumb');
  const ol = document.createElement('ol');
  ol.className = 'breadcrumb-list';

  items.forEach(({ text, href }) => {
    const li = document.createElement('li');
    li.className = 'breadcrumb-item';
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    li.append(a);
    ol.append(li);
  });

  if (currentText) {
    const li = document.createElement('li');
    li.className = 'breadcrumb-item breadcrumb-item-current';
    li.setAttribute('aria-current', 'page');
    li.textContent = currentText;
    ol.append(li);
  }

  block.textContent = '';
  nav.append(ol);
  block.append(nav);
}
