function updateActiveSlide(slide) {
  const block = slide.closest('.carousel-hero');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-hero-slide');

  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });

  const indicators = block.querySelectorAll('.carousel-hero-slide-indicator');
  indicators.forEach((indicator, idx) => {
    if (idx !== slideIndex) {
      indicator.querySelector('button').removeAttribute('disabled');
    } else {
      indicator.querySelector('button').setAttribute('disabled', 'true');
    }
  });
}

export function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carousel-hero-slide');
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  activeSlide.querySelectorAll('a').forEach((link) => link.removeAttribute('tabindex'));
  block.querySelector('.carousel-hero-slides').scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-hero-slide-indicators');
  if (!slideIndicators) return;

  slideIndicators.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  block.querySelector('.slide-prev').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
  });
  block.querySelector('.slide-next').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  });

  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) updateActiveSlide(entry.target);
    });
  }, { threshold: 0.5 });
  block.querySelectorAll('.carousel-hero-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-hero-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-hero-slide');

  row.querySelectorAll(':scope > div').forEach((column, colIdx) => {
    column.classList.add(`carousel-hero-slide-${colIdx === 0 ? 'image' : 'content'}`);
    slide.append(column);
  });

  // Prioritise the first slide's image (LCP); lazy-load the rest.
  const img = slide.querySelector('img');
  if (img) {
    if (slideIndex === 0) {
      img.setAttribute('loading', 'eager');
      img.setAttribute('fetchpriority', 'high');
    } else {
      img.setAttribute('loading', 'lazy');
    }
  }

  // The first slide's heading is the page's primary heading — promote it to
  // an <h1> so the page has exactly one h1 (accessibility / heading order).
  if (slideIndex === 0) {
    const heading = slide.querySelector('h2, h3, h4, h5, h6');
    if (heading) {
      const h1 = document.createElement('h1');
      h1.id = heading.id;
      h1.innerHTML = heading.innerHTML;
      heading.replaceWith(h1);
    }
  }

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

/**
 * Reads a config row (a link/path to the JSON index). Present => dynamic.
 * Optional `filter:` token picks the entry-page segment (default `carousel`).
 */
function readConfig(block) {
  const cfg = { indexPath: null, pathFilter: 'carousel', isConfig: false };
  const firstRow = block.firstElementChild;
  if (!firstRow) return cfg;
  const link = firstRow.querySelector('a[href]');
  const text = firstRow.textContent.trim();
  const cells = [...firstRow.children];
  if (link && /\.json(\?|$)/i.test(link.getAttribute('href'))) {
    cfg.indexPath = link.getAttribute('href');
    cfg.isConfig = true;
  } else if (cells.length === 1 && /\.json(\?|$)/i.test(text)) {
    cfg.indexPath = text;
    cfg.isConfig = true;
  }
  const filterMatch = text.match(/filter\s*[:=]\s*\/?([a-z0-9-]+)\/?/i);
  if (filterMatch) cfg.pathFilter = filterMatch[1].toLowerCase();
  return cfg;
}

/** Keeps only entry rows for the current locale under /{locale}/{segment}/<name>. */
function isEntryPage(path, localePrefix, segment) {
  if (!path) return false;
  const clean = path.replace(/\.html$/, '');
  return new RegExp(`^${localePrefix}/${segment}/[^/]+/?$`).test(clean);
}

/** Builds a slide row (image div + content div) matching the authored shape. */
function buildSlideRow(row) {
  const wrapper = document.createElement('div');
  const imageDiv = document.createElement('div');
  if (row.image) {
    const pic = document.createElement('picture');
    const img = document.createElement('img');
    img.src = row.image;
    img.alt = row.title || '';
    pic.append(img);
    imageDiv.append(pic);
  }
  const contentDiv = document.createElement('div');
  const h = document.createElement('h2');
  h.textContent = row.title || '';
  contentDiv.append(h);
  if (row.description) {
    const p = document.createElement('p');
    p.textContent = row.description;
    contentDiv.append(p);
  }
  if (row.ctalabel && row.ctatarget) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = row.ctatarget;
    a.textContent = row.ctalabel;
    p.append(a);
    contentDiv.append(p);
  }
  wrapper.append(imageDiv, contentDiv);
  return wrapper;
}

/**
 * DYNAMIC: fetch the index, filter to the current locale's carousel entry
 * pages, sort by `order`, and replace the block's children with slide rows.
 * Returns true on success; throws so decorate() can fall back to static rows.
 */
async function loadDynamicSlides(block, { indexPath, pathFilter }) {
  const path = indexPath || '/query-index.json';
  const localePrefix = `/${window.location.pathname.split('/').filter(Boolean).slice(0, 2).join('/')}`;
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`carousel-hero: index ${path} -> ${resp.status}`);
  const json = await resp.json();
  const rows = (Array.isArray(json) ? json : json.data || [])
    .filter((r) => isEntryPage(r.path, localePrefix, pathFilter));
  if (!rows.length) throw new Error(`carousel-hero: no ${pathFilter} rows in index`);
  rows.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  block.textContent = '';
  rows.forEach((r) => block.append(buildSlideRow(r)));
}

let carouselId = 0;
export default async function decorate(block) {
  const cfg = readConfig(block);
  if (cfg.isConfig) {
    try {
      await loadDynamicSlides(block, cfg);
    } catch (e) {
      // config row present but index failed — drop it so stale authored rows
      // (if any) below the config row still render; otherwise block is empty.
      if (block.firstElementChild) block.firstElementChild.remove();
    }
  }
  carouselId += 1;
  block.setAttribute('id', `carousel-hero-${carouselId}`);
  const rows = block.querySelectorAll(':scope > div');
  const isSingleSlide = rows.length < 2;

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const container = document.createElement('div');
  container.classList.add('carousel-hero-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-hero-slides');
  block.prepend(slidesWrapper);

  let slideIndicators;
  if (!isSingleSlide) {
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute('aria-label', 'Carousel Slide Controls');
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-hero-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);

    // Prev/next arrows live in the same bottom controls bar as the dots
    // (matches WKND, where dots are centered and arrows sit at the right).
    const slideNavButtons = document.createElement('div');
    slideNavButtons.classList.add('carousel-hero-navigation-buttons');
    slideNavButtons.innerHTML = `
      <button type="button" class="slide-prev" aria-label="Previous Slide"></button>
      <button type="button" class="slide-next" aria-label="Next Slide"></button>
    `;
    slideIndicatorsNav.append(slideNavButtons);

    block.append(slideIndicatorsNav);
  }

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    slidesWrapper.append(slide);

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-hero-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" aria-label="Show Slide ${idx + 1} of ${rows.length}"></button>`;
      slideIndicators.append(indicator);
    }
    row.remove();
  });

  container.append(slidesWrapper);
  block.prepend(container);

  if (!isSingleSlide) {
    bindEvents(block);
  }
}
