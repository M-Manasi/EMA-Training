/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: localize WKND images.
 *
 * Rewrites <img src> (and <source srcset>) that point at the absolute
 * wknd.site origin to local /assets/<name> paths. The assets were uploaded to
 * Document Authoring (m-manasi/ema-training/assets/) and resolve to optimized
 * `media_` hashes on the EDS origin — so images are self-hosted and support the
 * pipeline's ?width/format/optimize params (the raw wknd.site coreimg URLs do
 * not reliably support those, which broke createOptimizedPicture output).
 *
 * Durable: runs on every (re)import in beforeTransform, so re-imports keep the
 * localized paths without any manual doc editing (migration criterion #9).
 *
 * The lookup is keyed by trailing filename so it is robust to the coreimg
 * rendition suffix differences (.coreimg.jpeg vs .coreimg.60.1600.jpeg).
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

// trailing filename -> local /assets path (uploaded to DA)
const IMAGE_MAP = {
  'adobestock-216674449.jpeg': '/assets/adobestock-216674449.jpg',
  'beach-walking.jpeg': '/assets/beach-walking.jpeg',
  'adobestock-185234795.jpeg': '/assets/adobestock-185234795.jpeg',
  'adobestock-156407519.jpeg': '/assets/adobestock-156407519.jpg',
  'adobestock-140634652.jpeg': '/assets/adobestock-140634652.jpg',
  'adobestock-184591344.jpeg': '/assets/adobestock-184591344.jpg',
  'adobestock-151584995.jpeg': '/assets/adobestock-151584995.jpg',
  'adobestock-122615840.jpeg': '/assets/adobestock-122615840.jpg',
  'adobestock-231698835.jpeg': '/assets/adobestock-231698835.jpg',
  'surfer-wave-02.jpeg': '/assets/surfer-wave-02.jpg',
  'article-01-picture-01.png': '/assets/article-01-picture-01.png',
  'adobestock-164735399.jpeg': '/assets/adobestock-164735399.jpg',
  'skitouring5sjoeberg.jpeg': '/assets/skitouring5sjoeberg.jpg',
};

/** Resolve a source URL to a localized /assets path by trailing filename. */
function localizedPath(src) {
  if (!src) return null;
  const clean = src.split('?')[0].split('#')[0];
  const base = clean.substring(clean.lastIndexOf('/') + 1);
  return IMAGE_MAP[base] || null;
}

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.beforeTransform) return;

  element.querySelectorAll('img[src]').forEach((img) => {
    const local = localizedPath(img.getAttribute('src'));
    if (local) {
      img.setAttribute('src', local);
      // drop width/height that referenced the old rendition; the pipeline
      // recomputes responsive sizes from the localized asset
      img.removeAttribute('srcset');
    }
  });

  element.querySelectorAll('source[srcset]').forEach((source) => {
    const local = localizedPath(source.getAttribute('srcset'));
    if (local) source.setAttribute('srcset', local);
  });
}
