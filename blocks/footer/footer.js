import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment. Dual-path: local dev serves content under /content
  // (aem up --html-mount /content); production (DA/aem.live) serves it at the
  // metadata path (default /footer).
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment('/content/footer') || await loadFragment(footerPath);
  if (!fragment) return;

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  // label the fragment sections: 0 = brand, 1 = nav links, 2 = social, 3 = legal
  const classes = ['brand', 'nav', 'social', 'legal'];
  classes.forEach((c, i) => {
    const section = footer.children[i];
    if (section) section.classList.add(`footer-${c}`);
  });

  // group brand + nav + social into a top row for layout
  const topRow = document.createElement('div');
  topRow.className = 'footer-top';
  ['footer-brand', 'footer-nav', 'footer-social'].forEach((sel) => {
    const el = footer.querySelector(`:scope > .${sel}`);
    if (el) topRow.append(el);
  });
  if (topRow.children.length) footer.prepend(topRow);

  block.append(footer);
}
