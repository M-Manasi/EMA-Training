import { createOptimizedPicture } from '../../scripts/aem.js';

/*
 * hero — WKND "image-bottom" teaser.
 *
 * Authored structure (2 rows, 1 cell each):
 *   row 1: cell with the background/banner image (picture)
 *   row 2: cell with heading + description + CTA link
 *
 * Decorated structure (rows flattened so layout children are direct):
 *   .hero
 *     .hero-image    (picture)
 *     .hero-content  (h2 + p + CTA)
 *
 * On WKND the source renders the image full-bleed on top with a white content
 * box below it; on desktop the box is pulled up to overlap the bottom of the
 * image. CSS handles the overlap — this decorator tags the two regions, drops
 * the intermediate row wrappers, and wires up the CTA. Written generically so a
 * hero authored with the image and text cells in either order still resolves.
 */

/**
 * Splits the block's cells into the one holding the image and the one holding
 * the text, regardless of authored order.
 * @param {Element} block The hero block element
 * @returns {{ imageCell: Element|null, contentCell: Element|null }}
 */
function classifyCells(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  let imageCell = null;
  let contentCell = null;

  cells.forEach((cell) => {
    const hasImage = cell.querySelector('picture, img');
    const hasText = cell.querySelector('h1, h2, h3, h4, h5, h6, p, a');
    if (hasImage && !imageCell) {
      imageCell = cell;
    } else if (hasText && !contentCell) {
      contentCell = cell;
    }
  });

  return { imageCell, contentCell };
}

/**
 * loads and decorates the hero block
 * @param {Element} block The hero block element
 */
export default async function decorate(block) {
  const { imageCell, contentCell } = classifyCells(block);

  // --- Image region ---
  if (imageCell) {
    const img = imageCell.querySelector('img');
    if (img) {
      // Rebuild as an optimized, responsive picture. This is the block's LCP
      // image, so load it eagerly at high priority.
      const optimized = createOptimizedPicture(
        img.src,
        img.getAttribute('alt') || '',
        true,
        [{ width: '2000' }, { media: '(max-width: 600px)', width: '750' }],
      );
      const optimizedImg = optimized.querySelector('img');
      optimizedImg.setAttribute('loading', 'eager');
      optimizedImg.setAttribute('fetchpriority', 'high');
      imageCell.querySelector('picture')?.replaceWith(optimized);
    }
    imageCell.classList.add('hero-image');
  }

  // --- Content region ---
  if (contentCell) {
    contentCell.classList.add('hero-content');
    // Tag the standalone CTA link (kept a plain <a> by decorateButtons since it
    // isn't emphasized) so CSS can render it as the WKND yellow button.
    const cta = contentCell.querySelector('p > a:only-child');
    if (cta && cta.parentElement.textContent.trim() === cta.textContent.trim()) {
      cta.parentElement.classList.add('hero-cta');
    }
  }

  // Flatten the intermediate row wrappers: promote image + content to be direct
  // children of the block (image first) so the CSS column layout and the
  // desktop overlap work without extra nesting.
  const ordered = [imageCell, contentCell].filter(Boolean);
  ordered.forEach((cell) => block.append(cell));
  [...block.querySelectorAll(':scope > div')].forEach((row) => {
    if (row !== imageCell && row !== contentCell && !row.children.length) {
      row.remove();
    }
  });
}
