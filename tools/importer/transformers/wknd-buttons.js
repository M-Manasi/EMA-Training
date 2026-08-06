/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND primary-button CTAs -> EDS button markup.
 *
 * WKND's section call-to-action links ("All Articles", "All Trips") are authored
 * as `div.button.cmp-button--primary > a.cmp-button > span.cmp-button__text`.
 * Imported verbatim they become a plain `<p><a>…</a></p>`, which this repo's
 * decorateButtons() leaves as a text link (it only buttonizes links whose text
 * is wrapped in <strong>/<em>). WKND renders these as solid yellow buttons.
 *
 * So in beforeTransform (while the source classes still exist) we wrap each
 * primary-button link's text in <strong>. After import that yields
 * `<p><a><strong>…</strong></a></p>` — wait, decorateButtons expects the
 * <strong> to be an ancestor of the <a>. We therefore emit the EDS-canonical
 * form the boilerplate importer produces for buttons: <strong> wrapping the
 * <a>. decorateButtons then classes it `.button.primary` (styled to the WKND
 * yellow square button in styles.css).
 *
 * Durable: runs on every (re)import (migration criterion #9).
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.beforeTransform) return;

  element.querySelectorAll('.cmp-button--primary a, a.cmp-button').forEach((a) => {
    // Skip if already wrapped.
    if (a.closest('strong')) return;
    const document = a.ownerDocument;
    const strong = document.createElement('strong');
    a.parentNode.insertBefore(strong, a);
    strong.appendChild(a);
  });
}
