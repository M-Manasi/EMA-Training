import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    // Members-only / locked cards carry no link (the content can't be opened
    // until you sign in). Flag them so CSS can render the WKND lock badge — a
    // yellow top-left corner triangle with a padlock — and the members-only
    // layout (text first, image last, grey "Read More"). Content-driven: no
    // authoring change needed, mirrors WKND's cmp-teaser--secure.
    if (!li.querySelector('a[href]')) {
      li.classList.add('cards-card-secure');
      const body = li.querySelector('.cards-card-body');
      if (body && !body.querySelector('.cards-card-readmore')) {
        const readMore = document.createElement('span');
        readMore.className = 'cards-card-readmore';
        readMore.textContent = 'Read More';
        body.append(readMore);
      }
    }
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.replaceChildren(ul);
}
