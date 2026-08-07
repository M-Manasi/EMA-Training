/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import columnsParser from './parsers/columns.js';
import cardsParser from './parsers/cards.js';
import membersCardsParser from './parsers/members-cards.js';

// TRANSFORMER IMPORTS
import magazineTransformer from './transformers/wknd-magazine.js';
import localizeImagesTransformer from './transformers/wknd-localize-images.js';

// PARSER REGISTRY (targets the original source nodes kept inside the markers)
const parsers = {
  columns: columnsParser,
  cards: cardsParser,
  'members-cards': membersCardsParser,
};

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'content-listing',
  description: 'WKND magazine index: title, featured article teaser (grey), article card grid, Members Only teasers.',
  urls: ['https://wknd.site/us/en/magazine.html'],
  blocks: [
    { name: 'columns', instances: ['.mag-featured-src .teaser.cmp-teaser--featured'] },
    { name: 'cards', instances: ['.mag-cards-src .image-list.list, .mag-cards-src ul.cmp-image-list'] },
    { name: 'members-cards', instances: ['.mag-members-src .teaser.cmp-teaser--secure'] },
  ],
};

// wknd-magazine rebuilds the DOM into flat marker regions with <hr> breaks
// (beforeTransform); localizeImages then swaps image srcs to managed media.
const transformers = [
  magazineTransformer,
  localizeImagesTransformer,
];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => {
    try { fn.call(null, hookName, element, enhancedPayload); } catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const els = [...document.querySelectorAll(selector)];
      // members-cards gathers its siblings itself — only take the first match.
      const chosen = blockDef.name === 'members-cards' ? els.slice(0, 1) : els;
      chosen.forEach((element) => pageBlocks.push({ name: blockDef.name, selector, element }));
    });
  });
  return pageBlocks;
}

/** Promote a marker div's children to be direct children of its parent, remove it. */
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

    // 1. beforeTransform: rebuild into markers + localize images
    executeTransformers('beforeTransform', main, payload);

    // 2. parse blocks (columns, cards, members-cards) — each replaces its source
    //    node with a block table inside the marker div.
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try { parser(block.element, { document, url, params }); } catch (e) { console.error(`Failed to parse ${block.name}:`, e); }
      }
    });

    // 3. grey Section Metadata for the featured section, then unwrap markers so
    //    the blocks become direct children (the <hr>s form the section breaks).
    const featuredMarker = main.querySelector('.mag-featured-src');
    if (featuredMarker) {
      const meta = WebImporter.Blocks.createBlock(document, { name: 'Section Metadata', cells: { style: 'grey' } });
      featuredMarker.append(meta);
    }
    unwrap(main.querySelector('.mag-featured-src'));
    unwrap(main.querySelector('.mag-cards-src'));
    unwrap(main.querySelector('.mag-members-src'));

    // 4. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 4b. Normalize localized images to bare absolute managed-media URLs.
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
