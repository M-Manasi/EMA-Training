/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND section boundaries.
 *
 * Inserts EDS section breaks (`<hr>`) and Section Metadata blocks based on the
 * homepage template's `sections` (tools/importer/page-templates.json). Runs in
 * afterTransform only — block parsers run between the two hooks and replace the
 * carousel / featured teaser / image-lists / imagebottom teaser source elements
 * with <table> blocks, so this transformer must anchor on landmarks that
 * survive parsing.
 *
 * ALL selectors verified against migration-work/cleaned.html.
 *
 * Section model (document order):
 *   1. rc2        Hero Carousel            (no style)   first section, no leading break
 *   2. rc3        Featured Article         (style grey) -> Section Metadata
 *   3. rc4-rc7    Recent Articles          (no style)
 *   4. rc8-rc9    Next Adventures          (no style)
 *   5. rc10-rc13  Where do you want to go  (no style)
 *
 * Anchoring rationale (the reason we do NOT use the template `selector` fields
 * verbatim):
 * - The template selectors for rc4-rc7 / rc10-rc13 are the inner
 *   `main.cmp-layout-container--fixed` wrappers, but inner-main #1 actually
 *   CONTAINS the featured teaser (rc3) and the "Next Adventures" title (rc8) as
 *   well — so those selectors do not mark a single section's first element.
 * - The rc8-rc9 selector is the imagebottom teaser, but that section's real
 *   first element is the "Next Adventures" heading, which lives in the PREVIOUS
 *   main (cleaned.html line 356), before the teaser (line 364).
 * - Every block source element is replaced by a <table> during import, so block
 *   selectors do not resolve in afterTransform. The default-content headings
 *   ("Recent Articles" 276, "Next Adventures" 356, "Where do you want to go?"
 *   386) are NOT parsed and remain stable in both the raw and post-parse DOM.
 *
 * So section starts are resolved from those stable headings, and Section 2's
 * start (the featured teaser/table) is taken as the element immediately before
 * the "Recent Articles" heading.
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

/**
 * Find a `div.title` (default-content heading wrapper) whose text contains the
 * given phrase. Covers `div.title.cmp-title--underline` (Recent/Next headings)
 * and the plain `div.title` "Where do you want to go?" heading. Footer titles
 * ("Follow Us") never match the homepage phrases.
 */
function findTitleByText(root, text) {
  const needle = text.trim().toLowerCase();
  const titles = root.querySelectorAll('div.title');
  for (let i = 0; i < titles.length; i += 1) {
    const content = (titles[i].textContent || '').trim().toLowerCase();
    if (content.indexOf(needle) !== -1) return titles[i];
  }
  return null;
}

/**
 * True when `el` is (or wraps) a horizontal rule. The authored WKND separators
 * are `div.separator > div.cmp-separator > hr` (cleaned.html lines 351-353 and
 * 460-462); no content block on this page contains a nested <hr>, so a
 * descendant match is safe and lets us dedup against those separators.
 */
function isHrLike(el) {
  if (!el) return false;
  if (el.tagName === 'HR') return true;
  return !!el.querySelector('hr');
}

/**
 * Insert a section-break <hr> before `anchor`, unless the element immediately
 * preceding it is already an <hr> (authored separator). Returns true if a break
 * was inserted.
 */
function insertBreakBefore(anchor, document) {
  if (!anchor || !anchor.parentNode) return false;
  if (isHrLike(anchor.previousElementSibling)) return false;
  anchor.parentNode.insertBefore(document.createElement('hr'), anchor);
  return true;
}

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.afterTransform) {
    const sections = payload && payload.template && payload.template.sections;
    if (!Array.isArray(sections) || sections.length < 2) return;

    const document = (payload && payload.document) || element.ownerDocument;

    // Resolve stable landmark anchors up front, before any DOM mutation, so
    // reverse-order processing never shifts a not-yet-processed anchor.
    const titleRecent = findTitleByText(element, 'Recent Articles'); // rc4
    const titleNext = findTitleByText(element, 'Next Adventures'); // rc8
    const titleWhere = findTitleByText(element, 'Where do you want to go'); // rc10
    // Section 2 (Featured Article) start = the element right before the
    // "Recent Articles" heading (featured teaser in raw DOM, columns <table>
    // post-parse). Fallback to the raw teaser selector if the heading is absent.
    const featuredEl = titleRecent
      ? titleRecent.previousElementSibling
      : element.querySelector('div.teaser.cmp-teaser--featured');

    const anchorFor = (section) => {
      switch (section.id) {
        case 'rc2':
          return element.querySelector('div.carousel.cmp-carousel--hero');
        case 'rc3':
          return featuredEl;
        case 'rc4-rc7':
          return titleRecent;
        case 'rc8-rc9':
          return titleNext;
        case 'rc10-rc13':
          return titleWhere;
        default:
          return section.selector ? element.querySelector(section.selector) : null;
      }
    };

    // Process sections in reverse so an inserted <hr> never becomes a false
    // "already preceded by hr" for an earlier, not-yet-processed section.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const anchor = anchorFor(section);
      if (!anchor) continue;

      // Section break before every section except the first. Deduped against
      // the authored separator that already precedes "Next Adventures" (rc7).
      if (i > 0) insertBreakBefore(anchor, document);

      // Section Metadata for styled sections. Only rc3 carries a style ('grey').
      // rc3 is a single-block section, so placing the metadata immediately after
      // its anchor keeps it inside Section 2 (before the next section break).
      if (section.style) {
        const block = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style: section.style },
        });
        if (anchor.parentNode) {
          anchor.parentNode.insertBefore(block, anchor.nextSibling);
        }
      }
    }
  }
}
