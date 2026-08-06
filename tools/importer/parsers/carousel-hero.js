/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: carousel-hero
 * Base block: carousel
 * Source: https://wknd.site/us/en.html (div.carousel.cmp-carousel--hero)
 * Generated for WKND homepage migration (DA project).
 *
 * Library convention (Carousel): 2 columns, one row per slide.
 *   Cell 1: image (mandatory, no other content).
 *   Cell 2: text — title (heading) + description + CTA.
 * Matches blocks/carousel-hero/carousel-hero.js decorator, which per slide-row
 * reads `:scope > div` and assigns colIdx 0 -> slide image, colIdx 1 -> slide content.
 */
export default function parse(element, { document }) {
  // Each slide is a carousel item wrapping a hero teaser. Fall back to the
  // teaser itself if the item wrapper class differs across pages.
  let slides = Array.from(element.querySelectorAll(':scope .cmp-carousel__item'));
  if (!slides.length) {
    slides = Array.from(element.querySelectorAll(':scope .teaser.cmp-teaser--hero, :scope .teaser'));
  }

  const cells = [];

  slides.forEach((slide) => {
    // Image cell: the slide's teaser image.
    const img = slide.querySelector('.cmp-teaser__image img, img');

    // Content cell: heading + description + CTA.
    const title = slide.querySelector('.cmp-teaser__title, h1, h2, h3');
    const descriptionEl = slide.querySelector('.cmp-teaser__description, p');
    const cta = slide.querySelector('.cmp-teaser__action-link, .cmp-teaser__action-container a, a');

    const contentCell = [];
    if (title) contentCell.push(title);
    if (descriptionEl) {
      // Normalize a rich-text container div into clean paragraph markup.
      if (descriptionEl.querySelector('p, ul, ol')) {
        contentCell.push(descriptionEl);
      } else {
        const p = document.createElement('p');
        p.innerHTML = descriptionEl.innerHTML.trim();
        contentCell.push(p);
      }
    }
    if (cta) contentCell.push(cta);

    // Only emit a slide row when there is at least an image or some content.
    if (img || contentCell.length) {
      cells.push([img || '', contentCell]);
    }
  });

  // Empty-block guard: nothing usable found.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-hero', cells });
  element.replaceWith(block);
}
