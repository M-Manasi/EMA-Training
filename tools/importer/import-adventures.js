/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import adventuresParser from './parsers/adventures.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/wknd-cleanup.js';
import localizeImagesTransformer from './transformers/wknd-localize-images.js';
import adventuresCategoriesTransformer from './transformers/wknd-adventures-categories.js';
import sectionsTransformer from './transformers/wknd-sections.js';

// PARSER REGISTRY
const parsers = {
  hero: heroParser,
  adventures: adventuresParser,
};

// PAGE TEMPLATE CONFIGURATION (embedded from page-templates.json)
const PAGE_TEMPLATE = {
  name: 'adventures-listing',
  description: "WKND adventures listing: page title (Adventures), hero teaser, 'Current Adventures' heading, and a category-tabbed adventures card grid.",
  urls: ['https://wknd.site/us/en/adventures.html'],
  blocks: [
    { name: 'hero', instances: ['div.teaser.cmp-teaser--hero'] },
    { name: 'adventures', instances: ['ul.cmp-image-list'] },
  ],
  sections: [
    { id: 'adv-main', name: 'Adventures', selector: 'div.teaser.cmp-teaser--hero', style: null, blocks: ['hero', 'adventures'], defaultContent: ['div.title.cmp-title--underline'] },
  ],
};

// TRANSFORMER REGISTRY. The categories transformer collapses the 6 per-tab
// image-lists into one annotated list (beforeTransform), so it must run before
// block-finding. Sections transformer is skipped for single-section pages.
const transformers = [
  cleanupTransformer,
  localizeImagesTransformer,
  adventuresCategoriesTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook.
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all block instances on the page from the embedded template.
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;
    const main = document.body;

    // 1. beforeTransform (cleanup + image localization + category collapse)
    executeTransformers('beforeTransform', main, payload);

    // 2. find blocks
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. parse each block (skip elements already replaced by a prior parser)
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform (chrome removal + section breaks/metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 5b. Normalize localized images back to bare absolute managed-media URLs
    // (same as the homepage import — see import-homepage.js for the rationale).
    const MEDIA_ORIGIN = 'https://main--ema-training--m-manasi.aem.page';
    main.querySelectorAll('img[src], source[srcset]').forEach((el) => {
      const attr = el.tagName === 'SOURCE' ? 'srcset' : 'src';
      const val = el.getAttribute(attr);
      if (val) {
        const m = val.match(/(https?:\/\/[^/]*ema-training[^/]*)?\/(media_[0-9a-f]+\.\w+)/i);
        if (m) el.setAttribute(attr, `${MEDIA_ORIGIN}/${m[2]}`);
      }
    });

    // 6. sanitized document path (localized, no extension)
    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, ''),
    );

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
