/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import accordionParser from './parsers/accordion.js';

// TRANSFORMER IMPORTS
import faqTransformer from './transformers/wknd-faq.js';
import localizeImagesTransformer from './transformers/wknd-localize-images.js';

const parsers = { accordion: accordionParser };

const PAGE_TEMPLATE = {
  name: 'faq',
  description: 'WKND FAQ: title, hero image, intro, accordion (Q&A), Need more help sidebar.',
  urls: ['https://wknd.site/us/en/faqs.html'],
  blocks: [
    { name: 'accordion', instances: ['div.faq-accordion-src'] },
  ],
};

const transformers = [faqTransformer, localizeImagesTransformer];

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

    // 2. Remove the transformer's <hr> between accordion and help — the whole
    //    FAQ body is a single two-column section (main + Need more help sidebar).
    main.querySelectorAll(':scope > hr').forEach((hr) => hr.remove());

    // 3. parse the accordion block
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try { parser(block.element, { document, url, params }); } catch (e) { console.error(`Failed to parse ${block.name}:`, e); }
      }
    });

    // 4. Section Metadata for the two-column FAQ layout (style=faq).
    const meta = WebImporter.Blocks.createBlock(document, { name: 'Section Metadata', cells: { style: 'faq' } });
    main.appendChild(meta);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 5b. Normalize localized images to bare absolute managed-media URLs.
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
