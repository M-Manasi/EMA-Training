/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import profileCardParser from './parsers/profile-card.js';

// TRANSFORMER IMPORTS
import aboutTransformer from './transformers/wknd-about.js';
import localizeImagesTransformer from './transformers/wknd-localize-images.js';

const parsers = { 'profile-card': profileCardParser };

const PAGE_TEMPLATE = {
  name: 'about-us',
  description: 'WKND About Us: title, Our Contributors + WKND Guides profile-card grids.',
  urls: ['https://wknd.site/us/en/about-us.html'],
  blocks: [
    { name: 'profile-card', instances: ['div.profile-card-src'] },
  ],
};

const transformers = [aboutTransformer, localizeImagesTransformer];

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
      document.querySelectorAll(selector).forEach((element) => pageBlocks.push({ name: blockDef.name, selector, element }));
    });
  });
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    // 1. beforeTransform: rebuild into markers + localize images
    executeTransformers('beforeTransform', main, payload);

    // 2. parse profile-card blocks (one per group)
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try { parser(block.element, { document, url, params }); } catch (e) { console.error(`Failed to parse ${block.name}:`, e); }
      }
    });

    // 3. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 3b. Normalize localized images to bare absolute managed-media URLs.
    const MEDIA_ORIGIN = 'https://main--ema-training--m-manasi.aem.page';
    main.querySelectorAll('img[src], source[srcset]').forEach((elm) => {
      const attr = elm.tagName === 'SOURCE' ? 'srcset' : 'src';
      const val = elm.getAttribute(attr);
      if (val) {
        const m = val.match(/(https?:\/\/[^/]*ema-training[^/]*)?\/(media_[0-9a-f]+\.\w+)/i);
        if (m) elm.setAttribute(attr, `${MEDIA_ORIGIN}/${m[2]}`);
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
