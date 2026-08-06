import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

// code base path for repo-hosted icons (works local + preview + live)
const ICONS = `${window.hlx?.codeBasePath || ''}/icons`;

/**
 * Replaces the "WKND" text logo link with the logo image (served from /icons).
 * @param {Element} navBrand the brand section
 */
function decorateLogo(navBrand) {
  const link = navBrand.querySelector('a');
  if (!link) return;
  const img = document.createElement('img');
  img.src = `${ICONS}/wknd-logo.svg`;
  img.alt = 'WKND Logo';
  img.width = 128;
  link.textContent = '';
  link.append(img);
}

/**
 * Builds a flag <img> for a locale link. The link text starts with a 2-letter
 * country code (e.g. "US en-US"); we strip it and prepend the flag image.
 * @param {Element} link the locale anchor
 */
function decorateLocaleFlag(link) {
  const text = link.textContent.trim();
  const match = text.match(/^([A-Z]{2})\s+(.*)$/);
  if (!match) return;
  const [, code, label] = match;
  link.textContent = '';
  const img = document.createElement('img');
  img.src = `${ICONS}/flag-${code}.svg`;
  img.alt = label;
  img.width = 20;
  const span = document.createElement('span');
  span.textContent = label;
  link.append(img, span);
}

/**
 * Closes the mobile nav on Escape.
 * @param {Event} e keydown event
 */
function closeOnEscape(e) {
  if (e.code !== 'Escape') return;
  const nav = document.getElementById('nav');
  if (!nav || isDesktop.matches) return;
  // eslint-disable-next-line no-use-before-define
  toggleMenu(nav, false);
  const button = nav.querySelector('.nav-hamburger button');
  if (button) button.focus();
}

/**
 * Toggles the mobile nav open/closed.
 * @param {Element} nav the nav element
 * @param {Boolean} forceExpanded optional forced state
 */
function toggleMenu(nav, forceExpanded = null) {
  const expanded = forceExpanded !== null
    ? !forceExpanded
    : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  if (button) {
    button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  }
  if (!expanded && !isDesktop.matches) {
    window.addEventListener('keydown', closeOnEscape);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
  }
}

/**
 * Builds the search form for the main bar. Controls are created in JS
 * (not authored in the nav fragment) per the nav content contract.
 * @returns {Element} the search form element
 */
function buildSearchForm() {
  const form = document.createElement('form');
  form.className = 'nav-search';
  form.setAttribute('role', 'search');
  form.action = '/us/en/search';
  const label = document.createElement('label');
  label.className = 'nav-search-label';
  label.setAttribute('for', 'nav-search-input');
  label.textContent = 'Search';
  // magnifier icon (inline SVG) to match the source search field
  const icon = document.createElement('span');
  icon.className = 'nav-search-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  const input = document.createElement('input');
  input.id = 'nav-search-input';
  input.type = 'search';
  input.name = 'q';
  input.placeholder = 'Search';
  input.setAttribute('aria-label', 'Search');
  form.append(label, icon, input);
  return form;
}

/**
 * Wires up the locale dropdown toggle in the utility bar.
 * @param {Element} localeWrapper the container holding the locale list
 */
function decorateLocaleSelector(navTools) {
  const list = navTools.querySelector('ul');
  if (!list) return;
  list.classList.add('nav-locale-list');

  // wrap the toggle + list in a dedicated container so it can sit after Sign In
  const localeWrapper = document.createElement('div');
  localeWrapper.className = 'nav-locale';
  list.replaceWith(localeWrapper);
  localeWrapper.append(list);

  // build the flag image for every locale entry from its country code
  list.querySelectorAll('li a').forEach((a) => decorateLocaleFlag(a));

  // find current locale (first entry) to seed the toggle label + flag
  const currentEntry = list.querySelector('li a');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-locale-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-haspopup', 'true');
  if (currentEntry) {
    const flag = currentEntry.querySelector('img');
    if (flag) toggle.append(flag.cloneNode(true));
    const span = document.createElement('span');
    span.textContent = currentEntry.querySelector('span')?.textContent.trim() || currentEntry.textContent.trim();
    toggle.append(span);
  } else {
    toggle.textContent = 'en-US';
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    list.classList.toggle('open', !open);
  });

  // close when clicking outside
  document.addEventListener('click', (e) => {
    if (!localeWrapper.contains(e.target)) {
      toggle.setAttribute('aria-expanded', 'false');
      list.classList.remove('open');
    }
  });

  localeWrapper.prepend(toggle);
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment. Dual-path: local dev serves content under /content
  // (aem up --html-mount /content); production (DA/aem.live) serves it at the
  // metadata path (default /nav).
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment('/content/nav') || await loadFragment(navPath);
  if (!fragment) return;

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  // fragment sections: 0 = brand (logo), 1 = nav links, 2 = tools (sign-in + locale)
  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  // brand: strip button styling from the logo link, then inject the logo image
  const navBrand = nav.querySelector('.nav-brand');
  if (navBrand) {
    const brandLink = navBrand.querySelector('a');
    if (brandLink) {
      brandLink.className = '';
      const container = brandLink.closest('.button-container');
      if (container) container.className = '';
    }
    decorateLogo(navBrand);
  }

  // tools: sign-in link + locale selector, plus the JS-built search
  const navTools = nav.querySelector('.nav-tools');
  if (navTools) {
    const signIn = navTools.querySelector('p');
    if (signIn) signIn.classList.add('nav-sign-in');
    decorateLocaleSelector(navTools);
  }

  // the search form is a standalone main-bar element (stays visible on mobile,
  // built in JS, not authored)
  const navSections = nav.querySelector('.nav-sections');
  const search = buildSearchForm();

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav));

  // close (×) button inside the drawer + backdrop, so the mobile menu is
  // always dismissable (the open drawer would otherwise cover the hamburger)
  if (navSections) {
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'nav-drawer-close';
    close.setAttribute('aria-label', 'Close navigation');
    close.innerHTML = '&times;';
    close.addEventListener('click', () => toggleMenu(nav, false));
    navSections.prepend(close);
  }
  const backdrop = document.createElement('div');
  backdrop.className = 'nav-backdrop';
  backdrop.addEventListener('click', () => toggleMenu(nav, false));

  // build the two bars: dark utility bar (tools) on top, white main bar below
  const utilityBar = document.createElement('div');
  utilityBar.className = 'nav-utility';
  if (navTools) utilityBar.append(navTools);

  const mainBar = document.createElement('div');
  mainBar.className = 'nav-main';
  mainBar.append(hamburger);
  if (navBrand) mainBar.append(navBrand);
  if (navSections) mainBar.append(navSections);
  mainBar.append(search);

  nav.append(utilityBar, mainBar, backdrop);
  nav.setAttribute('aria-expanded', 'false');

  // reset nav state when crossing the desktop/mobile breakpoint
  isDesktop.addEventListener('change', () => toggleMenu(nav, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
