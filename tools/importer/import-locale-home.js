/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/wknd-cleanup.js';
import localizeImagesTransformer from './transformers/wknd-localize-images.js';

const parsers = { hero: heroParser };

// The secondary-locale homepages (ca/fr, ch/de, ch/fr, ch/it, de/de, es/es,
// fr/fr, it/it, us/es) are all the same "Coming Soon" placeholder: a single
// cmp-teaser--hero (full-bleed image + white content box with the heading).
// Reuses the existing hero block.
const PAGE_TEMPLATE = {
  name: 'locale-home',
  description: 'WKND localized homepage placeholder: a single hero teaser ("Coming Soon").',
  urls: ['https://wknd.site/de/de.html'],
  blocks: [
    { name: 'hero', instances: ['div.teaser.cmp-teaser--hero'] },
  ],
};

const transformers = [cleanupTransformer, localizeImagesTransformer];

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
      // take only the first hero teaser (the placeholder has exactly one)
      const els = [...document.querySelectorAll(selector)].slice(0, 1);
      els.forEach((element) => pageBlocks.push({ name: blockDef.name, selector, element }));
    });
  });
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try { parser(block.element, { document, url, params }); } catch (e) { console.error(`Failed to parse ${block.name}:`, e); }
      }
    });

    executeTransformers('afterTransform', main, payload);

    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

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
