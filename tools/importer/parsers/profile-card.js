/* eslint-disable */
/* global WebImporter */
/**
 * Parser: profile-card block.
 * Consumes `div.profile-card-src` whose children are `div.profile-card-row`,
 * each with an avatar cell (.profile-card-img) + a text cell (.profile-card-text
 * = name h3 + role h5). Emits a 2-column profile-card block: [ image | name+role ].
 */
export default function parse(element, { document }) {
  const rows = [...element.querySelectorAll(':scope > .profile-card-row')];
  if (!rows.length) {
    element.remove();
    return;
  }

  const cells = rows.map((row) => {
    const img = row.querySelector('.profile-card-img img, img');
    const textWrap = row.querySelector('.profile-card-text') || row;
    const textNodes = [...textWrap.childNodes];
    return [img || '', textNodes];
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'profile-card', cells });
  element.replaceWith(block);
}
