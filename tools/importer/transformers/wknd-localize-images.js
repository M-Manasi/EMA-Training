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
  // adventures-listing images
  'adobestock-175749320.jpeg': 'media_1a86905dc13f1caa1d0bdcdf304047b38297307c5.jpg',
  'adobestock-200192344.jpeg': 'media_1f597bf9e3f66559daf12d29cf99b6444379a8cbe.jpg',
  'sport-climbing.jpeg': 'media_170b2a3616e34f1f6945a3a6840d5896e37978d16.jpg',
  'adobestock-201222633.jpeg': 'media_19a5af1a42e99ed270bfc14e36e044ac83731bd28.jpg',
  'adobestock-185324648.jpeg': 'media_13f721df562523f0924be582404e750aaffab42e1.jpg',
  'adobestock-59459597.jpeg': 'media_1bac413f3fb7872aec76c9a452e2f43fd6cfa6ff1.jpg',
  'adobestock-294203896.jpeg': 'media_10486ec00bea127883f7d0a1a2284a8b2960441ed.jpg',
  'adobestock-280313729.jpeg': 'media_10edd47eb17ddadb9fb11719a37543705e189705d.jpg',
  'adobe-waadobe-wa-mg-2466.jpeg': 'media_12abbe43148d06aadca747b69d2ceda6f8cd32888.jpg',
  'adobestock-238230356.jpeg': 'media_1429fa23d65c95bb9a5e30c2784695e1f51911688.jpg',
  'adobestock-278302117.jpeg': 'media_168d4df680b92c68b36d08772450bd3d2ec2d19ce.jpg',
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
