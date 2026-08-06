import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// code base path for repo-hosted icons (works local + preview + live)
const ICONS = `${window.hlx?.codeBasePath || ''}/icons`;

/** Replace the "WKND" text logo link with the light logo image. */
function decorateFooterLogo(brand) {
  const link = brand.querySelector('a');
  if (!link) return;
  const img = document.createElement('img');
  img.src = `${ICONS}/wknd-logo-light.svg`;
  img.alt = 'WKND Logo';
  img.width = 120;
  link.textContent = '';
  link.append(img);
}

/** Replace social link text (Facebook/Twitter/Instagram) with its icon. */
function decorateSocial(socialSection) {
  socialSection.querySelectorAll('ul a').forEach((a) => {
    const label = a.textContent.trim();
    const name = label.toLowerCase();
    if (!['facebook', 'twitter', 'instagram'].includes(name)) return;
    a.textContent = '';
    // dark icon on a light box, matching WKND
    const img = document.createElement('img');
    img.src = `${ICONS}/social-${name}-dark.svg`;
    img.alt = label;
    img.width = 20;
    img.height = 20;
    a.append(img);
  });
}

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

  // inject repo-hosted images (logo + social icons) from codeBasePath
  const brand = footer.querySelector('.footer-brand');
  if (brand) decorateFooterLogo(brand);
  const social = footer.querySelector('.footer-social');
  if (social) decorateSocial(social);

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
