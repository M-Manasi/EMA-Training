/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: restructure the WKND FAQ page into clean EDS marker regions.
 *
 * Source: FAQs H1, a hero image, an intro paragraph, a cmp-accordion (7 Q&A),
 * and a "Need more help?" sidebar (phone/email text). Deeply nested, so this
 * transformer (beforeTransform) rebuilds a flat DOM:
 *
 *   <main>
 *     <h1>FAQs</h1>
 *     <p><img hero></p>
 *     <p>intro…</p>
 *     <div class="faq-accordion-src">  [Question | Answer] rows
 *     ---  (section break -> section 1 = title+hero+intro+accordion)
 *     <div class="faq-help-src">       Need more help sidebar
 *     [section-metadata style=faq]
 *
 * The accordion parser turns faq-accordion-src into the accordion block.
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

function el(document, tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.beforeTransform) return;
  const document = element.ownerDocument;

  // Only act on the FAQ template.
  const accordion = element.querySelector('.cmp-accordion');
  if (!accordion) return;

  // Strip global chrome so its logo isn't mistaken for the hero.
  WebImporter.DOMUtils.remove(element, [
    'header', 'footer', '#toggleNav', '#mobileNav', 'iframe', 'script', 'style', 'noscript',
    '[class*="experiencefragment--header"]', '[class*="experiencefragment--footer"]',
  ]);

  // Title.
  const titleEl = element.querySelector('h1.cmp-title__text, .cmp-title h1');

  // Hero image (largest content image, not the logo).
  const heroImg = [...element.querySelectorAll('.cmp-image img, img')]
    .filter((i) => !/logo/i.test(i.getAttribute('src') || ''))
    .sort((a, b) => (b.getBoundingClientRect ? 0 : 0))[0]
    || element.querySelector('.cmp-image img');

  // Intro paragraph (the collective… copy) — the first substantial <p> before the accordion.
  const intro = [...element.querySelectorAll('.cmp-text p, p')]
    .find((p) => /WKND is a collective/i.test(p.textContent)) || null;

  // Accordion items.
  const accEl = element.querySelector('.cmp-accordion');
  const items = [...accEl.querySelectorAll('.cmp-accordion__item')].map((it) => ({
    q: (it.querySelector('.cmp-accordion__title, .cmp-accordion__header, [data-cmp-hook-accordion="button"]') || {}).textContent,
    panel: it.querySelector('.cmp-accordion__panel'),
  })).filter((x) => x.q && x.q.trim());

  // "Need more help?" sidebar.
  const helpTitle = [...element.querySelectorAll('.cmp-title__text, h2, h3')]
    .find((h) => /need more help/i.test(h.textContent));
  const helpText = [...element.querySelectorAll('.cmp-text, .text')]
    .find((t) => /give us a call|love to talk/i.test(t.textContent));

  // ================= rebuild =================
  const frag = document.createElement('div');

  // H1
  frag.append(el(document, 'h1', null, (titleEl && titleEl.textContent.trim()) || 'FAQs'));

  // hero image
  if (heroImg) {
    const p = document.createElement('p');
    const img = el(document, 'img');
    img.setAttribute('src', heroImg.getAttribute('src'));
    img.setAttribute('alt', heroImg.getAttribute('alt') || '');
    p.append(img);
    frag.append(p);
  }

  // intro paragraph
  if (intro) {
    const p = document.createElement('p');
    p.innerHTML = intro.innerHTML.trim();
    frag.append(p);
  }

  // accordion marker (Question | Answer rows)
  const accDiv = el(document, 'div', 'faq-accordion-src');
  items.forEach(({ q, panel }) => {
    const row = el(document, 'div', 'faq-accordion-row');
    row.setAttribute('data-question', q.trim());
    const answer = el(document, 'div', 'faq-accordion-answer');
    if (panel) {
      panel.querySelectorAll('p, ul, ol').forEach((node) => {
        answer.append(node.cloneNode(true));
      });
      if (!answer.childNodes.length) {
        answer.append(el(document, 'p', null, panel.textContent.trim()));
      }
    }
    row.append(answer);
    accDiv.append(row);
  });
  frag.append(accDiv);

  // section break, then Need more help sidebar
  frag.append(el(document, 'hr'));
  if (helpTitle || helpText) {
    const helpDiv = el(document, 'div', 'faq-help-src');
    helpDiv.append(el(document, 'h2', null, (helpTitle && helpTitle.textContent.trim()) || 'Need more help?'));
    if (helpText) {
      // Preserve line breaks as separate paragraphs.
      const lines = helpText.innerHTML.split(/<br\s*\/?>(?:\s*)/i);
      if (lines.length > 1) {
        lines.forEach((ln) => { if (ln.trim()) helpDiv.append(el(document, 'p', null, ln.trim())); });
      } else {
        helpText.textContent.split('\n').map((s) => s.trim()).filter(Boolean)
          .forEach((line) => helpDiv.append(el(document, 'p', null, line)));
      }
    }
    frag.append(helpDiv);
  }

  element.textContent = '';
  while (frag.firstChild) element.append(frag.firstChild);
}
