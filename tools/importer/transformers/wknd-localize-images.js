/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: localize WKND images to our own DA-managed media.
 *
 * The WKND source images were uploaded to Document Authoring
 * (m-manasi/ema-training/assets/) where they resolve to optimized `media_`
 * hashes on our EDS origin. This transformer rewrites the source <img src>
 * (and <source srcset>) to the ABSOLUTE delivery-origin media URL, e.g.
 *   https://main--ema-training--m-manasi.aem.page/media_<hash>.<ext>
 *
 * IMPORTANT — why the absolute media_ URL (not a friendly /assets/ path):
 * The AEM rendering pipeline only treats an <img> as managed media (and builds
 * an optimized <picture> with ?width/format/optimize renditions) when the src
 * is an absolute URL on the delivery origin ending in `media_<hash>.<ext>`.
 * Authored friendly paths like `/assets/beach-walking.jpeg`, root-relative
 * `/media_<hash>`, `./media_<hash>`, or content.da.live URLs are ALL rewritten
 * to `about:error` at render time (verified empirically on preview). Only the
 * absolute `https://<branch>--<repo>--<owner>.aem.page/media_<hash>.<ext>` form
 * renders. The pipeline then rewrites it to a relative `./media_...` picture.
 *
 * Durable: runs on every (re)import in beforeTransform, so re-imports keep the
 * managed-media references without any manual doc editing (migration
 * criterion #9).
 *
 * The lookup is keyed by trailing filename so it is robust to the coreimg
 * rendition suffix differences (.coreimg.jpeg vs .coreimg.60.1600.jpeg).
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

// Delivery origin that serves our DA-managed media as optimized pictures.
const MEDIA_ORIGIN = 'https://main--ema-training--m-manasi.aem.page';

// trailing source filename -> DA-managed media hash (resolved from /assets/<name>)
const MEDIA_MAP = {
  'adobestock-216674449.jpeg': 'media_160d8ccfe3e920b6e81fe7ffb507587e8d0b600c6.jpg',
  'beach-walking.jpeg': 'media_1d95db09ecb454af549e5d06475d3398ed661dddc.jpg',
  'adobestock-185234795.jpeg': 'media_10180da88ec4141063b3af3f7708f03b7c2d1f23f.jpg',
  'adobestock-156407519.jpeg': 'media_1b115bc501a071e2ca38e1f94b87803514e6c416f.jpg',
  'adobestock-140634652.jpeg': 'media_137e525a8479336997a84917d2ad521f873e4df22.jpg',
  'adobestock-184591344.jpeg': 'media_1126bdcc651118cef62c3cd9aa4c4ca7aafab4819.jpg',
  'adobestock-151584995.jpeg': 'media_1b0b6fbba183b41fad4ef7ca750bb1b6ae5f88111.jpg',
  'adobestock-122615840.jpeg': 'media_192c4eb2321321fa7e0e12ed045e4c67c02d57f27.jpg',
  'adobestock-231698835.jpeg': 'media_19372b9cd05d2b8537bbf41e77455a8bc5007f783.jpg',
  'surfer-wave-02.jpeg': 'media_1bd10685af4f3d38127de55d4da60d4ef86518b8d.jpg',
  'article-01-picture-01.png': 'media_1dbed54a221e2f060b17c1adf8af2fb2647720456.png',
  'adobestock-164735399.jpeg': 'media_1da6af63de266afa2bb6813dad3ba3d618dc80666.jpg',
  'skitouring5sjoeberg.jpeg': 'media_139ca701d4581ba5ee72977826d38cb44b331c9db.jpg',
};

/** Resolve a source URL to an absolute managed-media URL by trailing filename. */
function localizedMediaUrl(src) {
  if (!src) return null;
  const clean = src.split('?')[0].split('#')[0];
  const base = clean.substring(clean.lastIndexOf('/') + 1);
  const hash = MEDIA_MAP[base];
  return hash ? `${MEDIA_ORIGIN}/${hash}` : null;
}

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.beforeTransform) return;

  element.querySelectorAll('img[src]').forEach((img) => {
    const url = localizedMediaUrl(img.getAttribute('src'));
    if (url) {
      img.setAttribute('src', url);
      // drop the srcset that referenced the old rendition; the pipeline
      // rebuilds responsive sizes from the managed media.
      img.removeAttribute('srcset');
    }
  });

  element.querySelectorAll('source[srcset]').forEach((source) => {
    const url = localizedMediaUrl(source.getAttribute('srcset'));
    if (url) source.setAttribute('srcset', url);
  });
}
