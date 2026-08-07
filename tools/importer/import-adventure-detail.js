/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import breadcrumbParser from './parsers/breadcrumb.js';
import keyFactsParser from './parsers/key-facts.js';
import tabsParser from './parsers/tabs.js';

// TRANSFORMER IMPORTS
import adventureDetailTransformer from './transformers/wknd-adventure-detail.js';
import localizeImagesTransformer from './transformers/wknd-localize-images.js';

// PARSER REGISTRY
const parsers = {
  breadcrumb: breadcrumbParser,
  'key-facts': keyFactsParser,
  tabs: tabsParser,
};

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'adventure-detail',
  description: 'WKND adventure detail: breadcrumb, full-bleed gallery image, title, key-facts sidebar, tabbed content (Overview/Itinerary/What to Bring).',
  urls: ['https://wknd.site/us/en/adventures/bali-surf-camp.html'],
  blocks: [
    { name: 'breadcrumb', instances: ['div.breadcrumb-src'] },
    { name: 'key-facts', instances: ['div.key-facts-src'] },
    { name: 'tabs', instances: ['div.tabs-src'] },
  ],
};

// TRANSFORMER REGISTRY. wknd-adventure-detail rebuilds the DOM into clean marker
// regions (beforeTransform); localizeImages then swaps image srcs to managed media.
const transformers = [
  adventureDetailTransformer,
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

/** Promote a marker div's children to be direct children of its parent, then remove it. */
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

    // 2. Section break: section 1 = breadcrumb + gallery; section 2 = title +
    //    key-facts + tabs (style=adventure). Break goes before the H1 title.
    const title = [...main.children].find((c) => c.tagName === 'H1');
    if (title) main.insertBefore(document.createElement('hr'), title);

    // 3. parse blocks (breadcrumb, key-facts, tabs)
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

    // 4. unwrap the plain-content gallery marker (full-bleed image in section 1)
    unwrap(main.querySelector('.adv-gallery-src'));

    // 5. Section Metadata for the two-column layout section (style=adventure),
    //    appended at the end so it applies to section 2.
    const sectionMeta = WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata',
      cells: { style: 'adventure' },
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
