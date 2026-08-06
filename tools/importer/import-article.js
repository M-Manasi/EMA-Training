/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import articleHeaderParser from './parsers/article-header.js';
import authorBioParser from './parsers/author-bio.js';
import relatedParser from './parsers/related.js';

// TRANSFORMER IMPORTS
import articleTransformer from './transformers/wknd-article.js';
import localizeImagesTransformer from './transformers/wknd-localize-images.js';

// PARSER REGISTRY
const parsers = {
  'article-header': articleHeaderParser,
  'author-bio': authorBioParser,
  related: relatedParser,
};

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'article',
  description: 'WKND magazine article: hero image, breadcrumb+title+byline header, article body (headings/paragraphs/images/quote), author bio, related sidebar.',
  urls: ['https://wknd.site/us/en/magazine/arctic-surfing.html'],
  blocks: [
    { name: 'article-header', instances: ['div.article-header-src'] },
    { name: 'author-bio', instances: ['div.author-bio-src'] },
    { name: 'related', instances: ['div.related-src'] },
  ],
};

// TRANSFORMER REGISTRY. wknd-article rebuilds the DOM into clean marker regions
// (beforeTransform); localizeImages then swaps image srcs to managed media.
const transformers = [
  articleTransformer,
  localizeImagesTransformer,
];

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

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    });
  });
  return pageBlocks;
}

/**
 * Promote a marker div's children to be direct children of its parent, then
 * remove the marker (used for the plain-content hero + body regions).
 */
function unwrap(marker) {
  if (!marker || !marker.parentNode) return;
  const parent = marker.parentNode;
  while (marker.firstChild) parent.insertBefore(marker.firstChild, marker);
  parent.removeChild(marker);
}

export default {
  transform: (payload) => {
    const {
      document, url, params,
    } = payload;
    const main = document.body;

    // 1. beforeTransform: rebuild DOM into markers + localize images
    executeTransformers('beforeTransform', main, payload);

    // 2. Insert section breaks:
    //    Section 1 = hero image; Section 2 (style=article) = header+body+author+related.
    const heroMarker = main.querySelector('.article-hero-src');
    const headerMarker = main.querySelector('.article-header-src');
    if (heroMarker && headerMarker) {
      main.insertBefore(document.createElement('hr'), headerMarker);
    }

    // 3. parse blocks (header, author-bio, related)
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name}:`, e);
        }
      }
    });

    // 4. unwrap the plain-content markers (hero image + article body)
    unwrap(main.querySelector('.article-hero-src'));
    unwrap(main.querySelector('.article-body-src'));

    // 5. Section Metadata for the article layout section (style=article), placed
    //    at the end of the content so it applies to section 2.
    const sectionMeta = WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata',
      cells: { style: 'article' },
    });
    main.appendChild(sectionMeta);

    // 6. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6b. Normalize localized images to bare absolute managed-media URLs.
    const MEDIA_ORIGIN = 'https://main--ema-training--m-manasi.aem.page';
    main.querySelectorAll('img[src], source[srcset]').forEach((el) => {
      const attr = el.tagName === 'SOURCE' ? 'srcset' : 'src';
      const val = el.getAttribute(attr);
      if (val) {
        const m = val.match(/(https?:\/\/[^/]*ema-training[^/]*)?\/(media_[0-9a-f]+\.\w+)/i);
        if (m) el.setAttribute(attr, `${MEDIA_ORIGIN}/${m[2]}`);
      }
    });

    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, ''),
    );

    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }];
  },
};
