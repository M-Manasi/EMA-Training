/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND site-wide cleanup.
 *
 * Removes non-authorable global chrome and import artifacts so the imported
 * document contains only the page-level content an author would create/edit.
 *
 * ALL selectors below were verified against migration-work/cleaned.html
 * (the sanitized WKND homepage DOM). None are guessed.
 *
 * Scope decisions:
 * - Header / footer are AEM Experience Fragments (global chrome) that are
 *   already migrated as EDS blocks. They MUST NOT be duplicated into each
 *   page's content, so they are stripped here.
 * - AEM layout wrappers (div.root, div.cmp-container, div.aem-Grid,
 *   .aem-GridColumn, .responsivegrid) are intentionally NOT removed: the
 *   importer flattens <div> nesting to markdown, block parsers match by class
 *   regardless of wrapper depth, and broadly removing <div> risks deleting real
 *   content (see generate-import-transformer.md "Avoid broad selectors").
 *   Leaving them in place is harmless and safer.
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // --- Import artifacts that never belong in authored content ---
    // The sanitized DOM has no <script>/<style>/<noscript>, but the live page
    // does; strip them before parsing so they can never leak into a block cell.
    WebImporter.DOMUtils.remove(element, [
      'script',
      'style',
      'noscript',
    ]);

    // Remove HTML comments (e.g. the footer "Responsive grid" markers on
    // cleaned.html lines 516/540). Use a comment iterator instead of an
    // innerHTML rebuild so live DOM node references stay intact for parsing.
    const doc = element.ownerDocument;
    if (doc && typeof doc.createNodeIterator === 'function') {
      const commentIterator = doc.createNodeIterator(
        element,
        NodeFilter.SHOW_COMMENT,
      );
      const comments = [];
      let current = commentIterator.nextNode();
      while (current) {
        comments.push(current);
        current = commentIterator.nextNode();
      }
      comments.forEach((comment) => comment.remove());
    }
  }

  if (hookName === TransformHook.afterTransform) {
    // --- Global chrome (non-authorable) ---
    // cleaned.html line 5:   <header class="experiencefragment cmp-experiencefragment--header ...">
    // cleaned.html line 471: <footer class="experiencefragment cmp-experiencefragment--footer ...">
    // Bare header/footer tags are included as a defensive, site-wide fallback;
    // on this page they resolve to the same experience-fragment elements.
    // cleaned.html line 568: <div id="toggleNav"> (mobile nav toggle, body-level)
    // cleaned.html line 574: <div id="mobileNav" class="cmp-navigation--mobile"> (body-level, contains the mobile <nav>)
    // cleaned.html line 566: <iframe id="destination_publishing_iframe_wkndsite_0" ...> (Adobe/demdex ID-sync tracking clientlib)
    WebImporter.DOMUtils.remove(element, [
      'header.cmp-experiencefragment--header',
      'footer.cmp-experiencefragment--footer',
      'header',
      'footer',
      '#toggleNav',
      '#mobileNav',
      'iframe',
    ]);

    // --- Leftover non-content elements / artifacts ---
    // Stray <meta> nodes sit next to core-image <img> tags (cleaned.html lines
    // 183, 204, 227, 271, 334, 378); they are AEM component metadata, not
    // authorable content. <link>/<noscript> are stripped defensively.
    WebImporter.DOMUtils.remove(element, [
      'meta',
      'link',
      'noscript',
    ]);
  }
}
