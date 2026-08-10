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

// country code → display name, matching WKND's locale panel
const COUNTRY_NAMES = {
  US: 'United States',
  CA: 'Canada',
  CH: 'Switzerland',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
};

/**
 * Parses a locale link's "CC xx-YY" text into { code, locale, href, label }.
 * @param {Element} link the locale anchor
 */
function parseLocaleLink(link) {
  const text = link.textContent.trim();
  const match = text.match(/^([A-Z]{2})\s+(.*)$/);
  if (!match) return null;
  return { code: match[1], locale: match[2].trim(), href: link.getAttribute('href') };
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
 * Builds the Sign In modal (matches WKND: dark panel, Asar heading with yellow
 * underline, Welcome Back, username/password fields, forgot link, yellow
 * submit). Returns { modal, open, close }.
 */
function buildSignInModal() {
  const modal = document.createElement('div');
  modal.className = 'nav-signin-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Sign In');
  modal.hidden = true;
  modal.innerHTML = `
    <div class="nav-signin-overlay"></div>
    <div class="nav-signin-dialog">
      <h2 class="nav-signin-title">Sign In</h2>
      <p class="nav-signin-welcome">Welcome Back</p>
      <form class="nav-signin-form">
        <label class="nav-signin-field">
          <span class="nav-signin-sr">Username</span>
          <input type="text" name="username" placeholder="USERNAME" autocomplete="username">
        </label>
        <label class="nav-signin-field">
          <span class="nav-signin-sr">Password</span>
          <input type="password" name="password" placeholder="PASSWORD" autocomplete="current-password">
        </label>
        <a class="nav-signin-forgot" href="#forgot-password">Forgot your password?</a>
        <button type="submit" class="nav-signin-submit">Sign In</button>
      </form>
      <hr class="nav-signin-sep">
    </div>`;

  const close = () => {
    modal.hidden = true;
    document.body.style.overflowY = '';
  };
  const open = () => {
    modal.hidden = false;
    document.body.style.overflowY = 'hidden';
    modal.querySelector('input')?.focus();
  };
  modal.querySelector('.nav-signin-overlay').addEventListener('click', close);
  modal.querySelector('.nav-signin-form').addEventListener('submit', (e) => e.preventDefault());
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape' && !modal.hidden) close(); });

  return { modal, open, close };
}

/**
 * Wires up the locale selector: a flag+code toggle in the utility bar that
 * opens a WKND-style panel of country rows (flag + country name + pipe-
 * separated locale links), built from the authored locale list.
 * @param {Element} navTools the tools section holding the raw locale <ul>
 */
function decorateLocaleSelector(navTools) {
  const rawList = navTools.querySelector('ul');
  if (!rawList) return;

  // parse the authored locale links, preserving order
  const entries = [...rawList.querySelectorAll('li a')]
    .map(parseLocaleLink)
    .filter(Boolean);
  if (!entries.length) return;

  // group by country code (keeps first-seen order)
  const groups = [];
  entries.forEach((e) => {
    let g = groups.find((x) => x.code === e.code);
    if (!g) { g = { code: e.code, items: [] }; groups.push(g); }
    g.items.push(e);
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-locale';

  // toggle: current locale (first entry) flag + code
  const current = entries[0];
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-locale-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-haspopup', 'true');
  const toggleFlag = document.createElement('img');
  toggleFlag.src = `${ICONS}/flag-${current.code}.svg`;
  toggleFlag.alt = COUNTRY_NAMES[current.code] || current.code;
  toggleFlag.width = 20;
  const toggleLabel = document.createElement('span');
  toggleLabel.textContent = current.locale;
  toggle.append(toggleFlag, toggleLabel);

  // panel: one row per country
  const panel = document.createElement('div');
  panel.className = 'nav-locale-panel';
  groups.forEach((g) => {
    const row = document.createElement('div');
    row.className = 'nav-locale-country';
    const flag = document.createElement('img');
    flag.src = `${ICONS}/flag-${g.code}.svg`;
    flag.alt = COUNTRY_NAMES[g.code] || g.code;
    flag.width = 32;
    const info = document.createElement('div');
    info.className = 'nav-locale-info';
    const name = document.createElement('span');
    name.className = 'nav-locale-name';
    name.textContent = COUNTRY_NAMES[g.code] || g.code;
    const codes = document.createElement('div');
    codes.className = 'nav-locale-codes';
    g.items.forEach((it, i) => {
      const a = document.createElement('a');
      a.href = it.href;
      a.textContent = it.locale;
      // mark the current locale as active (first overall entry)
      if (it === current) a.classList.add('is-current');
      codes.append(a);
      if (i < g.items.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'nav-locale-sep';
        sep.textContent = '|';
        codes.append(sep);
      }
    });
    info.append(name, codes);
    row.append(flag, info);
    panel.append(row);
  });

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    panel.classList.toggle('open', !open);
  });
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      toggle.setAttribute('aria-expanded', 'false');
      panel.classList.remove('open');
    }
  });

  wrapper.append(toggle, panel);
  rawList.replaceWith(wrapper);
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

  // mark the nav link for the current section as active (WKND highlights it
  // yellow, e.g. FAQS on /faqs). The active link is the one whose href path is
  // the longest prefix of the current page path — this ignores any host prefix
  // (e.g. the local dev "/content" mount) and never matches the bare locale
  // root (so "Home"/logo isn't highlighted on section pages).
  const sectionsEl = nav.querySelector('.nav-sections');
  if (sectionsEl) {
    const here = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
    let best = null;
    let bestLen = 0;
    sectionsEl.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href').replace(/\.html$/, '').replace(/\/$/, '');
      const seg = href.split('/').filter(Boolean);
      // require at least a section segment beyond the locale (…/xx/yy/<section>)
      if (seg.length < 3) return;
      if ((here === href || here.endsWith(href)) && href.length > bestLen) {
        best = a;
        bestLen = href.length;
      }
    });
    if (best) {
      best.setAttribute('aria-current', 'page');
      best.closest('li')?.classList.add('nav-item-active');
    }
  }

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

  // sign-in modal (opened from the Sign In link)
  const { modal: signInModal, open: openSignIn } = buildSignInModal();

  // tools: sign-in link + locale selector, plus the JS-built search
  const navTools = nav.querySelector('.nav-tools');
  if (navTools) {
    const signIn = navTools.querySelector('p');
    if (signIn) {
      signIn.classList.add('nav-sign-in');
      const signInLink = signIn.querySelector('a');
      if (signInLink) {
        signInLink.addEventListener('click', (e) => { e.preventDefault(); openSignIn(); });
      }
    }
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
  block.append(navWrapper, signInModal);
}
