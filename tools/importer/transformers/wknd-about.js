/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: restructure the WKND About Us page into clean EDS markers.
 *
 * Source: "About Us" H1, then two contributor groups — "Our Contributors"
 * (heading + intro + 4 people) and "WKND Guides" (heading + intro + 3 people).
 * Each person is a circular image + H3 name + H5 role + social links, laid out
 * in AEM grid columns. This transformer (beforeTransform) rebuilds:
 *
 *   <main>
 *     <h1>About Us</h1>
 *     <h2>Our Contributors</h2>
 *     <p>intro…</p>
 *     <div class="profile-card-src">   [avatar | name+role] rows (4)
 *     ---
 *     <h2>WKND Guides</h2>
 *     <p>intro…</p>
 *     <div class="profile-card-src">   [avatar | name+role] rows (3)
 *
 * A person is matched by an H3 name whose column also holds an <img>; the role
 * is the sibling H5. Social links are re-injected by the block JS from /icons.
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

// The seven contributors/guides, in source order, grouped by section.
const GROUPS = [
  {
    heading: 'Our Contributors',
    intro: 'Meet the outstanding individuals responsible for bringing you the most compelling stories across the globe.',
    people: ['Stacey Roswells', 'Jake Hammer', 'Ian Provo', 'Jacob Wester'],
  },
  {
    heading: 'WKND Guides',
    intro: 'Meet our extraordinary travel guides. When you travel with a certified WKND guide you gain access to attractions and perspectives not found on the pages of a guide book.',
    people: ['Sofia Sjöberg', 'Justin Barr', 'Kumar Selveraj'],
  },
];

function el(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.beforeTransform) return;
  const document = element.ownerDocument;

  // Only act on the About Us page (has "Our Contributors").
  const titleEls = [...element.querySelectorAll('.cmp-title__text, h1, h2, h3, h4, h5')];
  const hasContributors = titleEls.some((t) => /our contributors/i.test(t.textContent));
  if (!hasContributors) return;

  // Strip chrome first so its images don't interfere with avatar matching.
  WebImporter.DOMUtils.remove(element, [
    'header', 'footer', '#toggleNav', '#mobileNav', 'iframe', 'script', 'style', 'noscript',
    '[class*="experiencefragment--header"]', '[class*="experiencefragment--footer"]',
  ]);

  const pageTitle = [...element.querySelectorAll('h1.cmp-title__text, .cmp-title h1')][0];

  // Resolve a person to { name, role, img } by finding the name title and its
  // enclosing column that also holds the avatar image + role.
  const resolvePerson = (name) => {
    const nameEl = [...element.querySelectorAll('.cmp-title__text, h3')]
      .find((t) => t.textContent.trim() === name);
    if (!nameEl) return null;
    let col = nameEl;
    for (let i = 0; i < 7 && col; i += 1) {
      if (col.querySelector && col.querySelector('img')) break;
      col = col.parentElement;
    }
    const img = col && col.querySelector('img');
    const role = col
      ? [...col.querySelectorAll('.cmp-title__text, h4, h5')].map((x) => x.textContent.trim()).find((t) => t && t !== name)
      : null;
    return { name, role: role || '', img };
  };

  // ================= rebuild =================
  const frag = document.createElement('div');
  frag.append(el(document, 'h1', null, (pageTitle && pageTitle.textContent.trim()) || 'About Us'));

  GROUPS.forEach((group, gi) => {
    if (gi > 0) frag.append(el(document, 'hr'));
    frag.append(el(document, 'h2', null, group.heading));
    frag.append(el(document, 'p', null, group.intro));

    const cardsDiv = el(document, 'div', 'profile-card-src');
    group.people.forEach((personName) => {
      const person = resolvePerson(personName);
      if (!person) return;
      const row = el(document, 'div', 'profile-card-row');
      // avatar cell
      const imgWrap = el(document, 'div', 'profile-card-img');
      if (person.img) {
        const img = el(document, 'img');
        img.setAttribute('src', person.img.getAttribute('src'));
        img.setAttribute('alt', person.name);
        imgWrap.append(img);
      }
      // text cell: name (h3) + role (paragraph — a subtitle, not a heading, to
      // avoid an h3->h5 heading-order jump flagged by a11y checks).
      const textWrap = el(document, 'div', 'profile-card-text');
      textWrap.append(el(document, 'h3', null, person.name));
      if (person.role) {
        const roleP = el(document, 'p', 'profile-card-role', person.role);
        textWrap.append(roleP);
      }
      row.append(imgWrap, textWrap);
      cardsDiv.append(row);
    });
    frag.append(cardsDiv);
  });

  element.textContent = '';
  while (frag.firstChild) element.append(frag.firstChild);
}
