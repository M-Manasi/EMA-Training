/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselHeroParser from './parsers/carousel-hero.js';
import columnsParser from './parsers/columns.js';
import cardsParser from './parsers/cards.js';
import heroParser from './parsers/hero.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/wknd-cleanup.js';
import localizeImagesTransformer from './transformers/wknd-localize-images.js';
import sectionsTransformer from './transformers/wknd-sections.js';

// PARSER REGISTRY
const parsers = {
  'carousel-hero': carouselHeroParser,
  columns: columnsParser,
  cards: cardsParser,
  hero: heroParser,
};

// PAGE TEMPLATE CONFIGURATION (embedded from page-templates.json)
const PAGE_TEMPLATE = {
  name: 'homepage',
  description: 'WKND homepage: hero carousel, featured article teaser, recent-articles card grid, featured adventure teaser, adventures card grid, section CTAs.',
  urls: ['https://wknd.site/us/en.html'],
  blocks: [
    { name: 'carousel-hero', instances: ['div.carousel.cmp-carousel--hero'] },
    { name: 'columns', instances: ['div.teaser.cmp-teaser--featured'] },
    { name: 'cards', instances: ['div.image-list.list'] },
    { name: 'hero', instances: ['div.teaser.cmp-teaser--hero.cmp-teaser--imagebottom'] },
  ],
  sections: [
    { id: 'rc2', name: 'Hero Carousel', selector: 'div.carousel.cmp-carousel--hero', style: null, blocks: ['carousel-hero'], defaultContent: [] },
    { id: 'rc3', name: 'Featured Article', selector: 'div.teaser.cmp-teaser--featured', style: 'grey', blocks: ['columns'], defaultContent: [] },
    { id: 'rc4-rc7', name: 'Recent Articles', selector: 'main.cmp-layout-container--fixed:nth-of-type(1)', style: null, blocks: ['cards'], defaultContent: ['div.title.cmp-title--underline:nth-of-type(2)', 'div.button.cmp-button--primary:nth-of-type(1)', 'div.separator:nth-of-type(1)'] },
    { id: 'rc8-rc9', name: 'Next Adventures', selector: 'div.teaser.cmp-teaser--imagebottom', style: null, blocks: ['hero'], defaultContent: ['div.title.cmp-title--underline:nth-of-type(6)'] },
    { id: 'rc10-rc13', name: 'Where do you want to go', selector: 'main.cmp-layout-container--fixed:nth-of-type(2)', style: null, blocks: ['cards'], defaultContent: ['div.title:nth-of-type(1)', 'div.button.cmp-button--primary:nth-of-type(2)', 'div.separator:nth-of-type(2)'] },
  ],
};

// TRANSFORMER REGISTRY (cleanup + image localization first, then sections)
const transformers = [
  cleanupTransformer,
  localizeImagesTransformer,
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

    // 1. beforeTransform (initial cleanup)
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

    // 5b. Re-localize: adjustImageUrls makes paths absolute against the source
    // origin, which re-prefixes our localized "/assets/..." back to
    // "https://<source>/assets/...". Strip the source origin so localized
    // images stay root-relative (served from our own EDS origin as media_).
    main.querySelectorAll('img[src], source[srcset]').forEach((el) => {
      const attr = el.tagName === 'SOURCE' ? 'srcset' : 'src';
      const val = el.getAttribute(attr);
      if (val) {
        const m = val.match(/^https?:\/\/[^/]+(\/assets\/.+)$/);
        if (m) el.setAttribute(attr, m[1]);
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
