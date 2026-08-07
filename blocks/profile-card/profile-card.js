import { createOptimizedPicture } from '../../scripts/aem.js';

const ICONS = `${window.hlx?.codeBasePath || ''}/icons`;
const SOCIALS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'twitter', label: 'Twitter' },
  { key: 'instagram', label: 'Instagram' },
];

/**
 * profile-card block — WKND contributor / guide profiles.
 *
 * Content model: one row per person — [ avatar image | name + role ]. Renders a
 * responsive grid of centered cards: circular photo, name, role, and
 * Facebook/Twitter/Instagram icons (injected from repo /icons so the AEM
 * pipeline can't rewrite authored <img> to about:error — same pattern as the
 * footer/author-bio).
 * @param {Element} block
 */
export default function decorate(block) {
  const grid = document.createElement('div');
  grid.className = 'profile-card-grid';

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const imgCell = cells.find((c) => c.querySelector('img, picture'));
    const textCell = cells.find((c) => c !== imgCell && c.textContent.trim());
    if (!imgCell && !textCell) return;

    const card = document.createElement('article');
    card.className = 'profile-card-item';

    // avatar (round)
    const avatar = document.createElement('div');
    avatar.className = 'profile-card-avatar';
    const img = imgCell && imgCell.querySelector('img');
    if (img) {
      avatar.append(createOptimizedPicture(img.src, img.alt || '', false, [{ width: '400' }]));
    }
    card.append(avatar);

    // name + role
    const info = document.createElement('div');
    info.className = 'profile-card-info';
    if (textCell) {
      while (textCell.firstChild) info.append(textCell.firstChild);
    }
    card.append(info);

    // social icons
    const social = document.createElement('div');
    social.className = 'profile-card-social';
    SOCIALS.forEach(({ key, label }) => {
      const a = document.createElement('a');
      a.href = '#';
      a.setAttribute('aria-label', `${label} — ${info.textContent.trim().split('\n')[0] || 'profile'}`);
      a.className = 'profile-card-social-link';
      const icon = document.createElement('img');
      icon.src = `${ICONS}/social-${key}-dark.svg`;
      icon.alt = label;
      icon.width = 18;
      icon.height = 18;
      icon.loading = 'lazy';
      a.append(icon);
      social.append(a);
    });
    card.append(social);

    grid.append(card);
  });

  block.textContent = '';
  block.append(grid);
}
