import { createOptimizedPicture } from '../../scripts/aem.js';

const ICONS = `${window.hlx?.codeBasePath || ''}/icons`;
const SOCIALS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'twitter', label: 'Twitter' },
  { key: 'instagram', label: 'Instagram' },
];

/**
 * author-bio block — WKND article author footer.
 *
 * Content model:
 *   cell 1: author avatar image
 *   cell 2: author name (+ optional role paragraph)
 *
 * Renders: avatar (round) + name/role, with Facebook/Twitter/Instagram icons
 * on the right (injected from repo /icons so the AEM pipeline can't rewrite
 * authored <img> to about:error — same pattern as the footer).
 * @param {Element} block
 */
export default function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const imgCell = cells.find((c) => c.querySelector('img, picture'));
  const textCell = cells.find((c) => c !== imgCell && c.textContent.trim());

  block.textContent = '';

  // avatar
  const avatar = document.createElement('div');
  avatar.className = 'author-bio-avatar';
  if (imgCell) {
    const img = imgCell.querySelector('img');
    if (img) {
      avatar.append(createOptimizedPicture(img.src, img.alt || '', false, [{ width: '200' }]));
    }
  }

  // name + role
  const info = document.createElement('div');
  info.className = 'author-bio-info';
  if (textCell) {
    while (textCell.firstChild) info.append(textCell.firstChild);
  }

  // socials
  const social = document.createElement('div');
  social.className = 'author-bio-social';
  SOCIALS.forEach(({ key, label }) => {
    const a = document.createElement('a');
    a.href = '#';
    a.setAttribute('aria-label', label);
    a.className = 'author-bio-social-link';
    const img = document.createElement('img');
    img.src = `${ICONS}/social-${key}-dark.svg`;
    img.alt = label;
    img.width = 20;
    img.height = 20;
    img.loading = 'lazy';
    a.append(img);
    social.append(a);
  });

  block.append(avatar, info, social);
}
