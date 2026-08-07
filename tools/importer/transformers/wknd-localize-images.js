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
  // article (magazine) images
  'surfer-back-from-the-ocean.jpeg': 'media_1ffe5e90ed6fd33168ccf31df7d3d8e436adb5108.jpg',
  'majestic-rainbow.jpeg': 'media_105a7bf63325289ed49f1e9a74a1dfd1885008de0.jpg',
  'northern-lights.jpeg': 'media_1be586d69308beff574f2ca3c1bf401b7f4a9372d.jpg',
  'jacob-wester.jpeg': 'media_18848bc6b96d02b09a1b6f5c5164824b4e04a5589.jpg',
  // adventure-detail images
  'adobestock-266405335.jpeg': 'media_1f188ba81486020850ed6a49ddae1c6a82b55e2af.jpg',
  // content-listing (magazine) images
  'adobe-waadobe-wa-b6a7083.jpeg': 'media_15e659d39eca4e2451616c0b84e74d5a334fb06f1.jpg',
  'alaskan-grizzly.jpeg': 'media_19678a68f931a689a9e12058f8e200a311027a9c8.jpg',
  'amazon-river-02.jpeg': 'media_1b208ac8dbd966a8beaa8c5047e264b4b94973dd6.jpg',
  // faq image
  'adobestock-277768563.jpeg': 'media_1133e47f59378ddc186f3a3f410745aa74c3102bd.jpg',
  // about-us contributor avatars
  'stacey-roswells.jpeg': 'media_1c58434c333c2413f6d9dbca269e46e3c5c29b479.jpg',
  'alex-iby-343837.jpeg': 'media_1f40e3118907b15ffb10dd48d2a0437c7becc775a.jpg',
  'ian-provo.jpeg': 'media_182c0eb8bb070bf369598d7d8732c8c48b84997f2.jpg',
  'ayo-ogunseinde-237739.jpeg': 'media_111cf9ae65e7681a6868468f5fa34ec1facb83cfe.jpg',
  'justin-barr.jpeg': 'media_17d56677293ed4c3fcfd3ec3bfe4e4dcdb728e16d.jpg',
  'kumar-selvaraj.jpeg': 'media_13d4b8cff87c21c727e187b64b982770f98384229.jpg',
  // bulk-import (adventure-detail English pages) harvested images
  'adobestock-209250305.jpeg': 'media_1ae2684b70deba4b7a2dd58bc8ee85d0c6b749f14.jpg',
  'adam-wilson-642203-unsplash.jpeg': 'media_1a053a07aae70bbd21b35834c6d786dc3501e52bd.jpg',
  'adobestock-279232449.jpeg': 'media_1882f5a07c8036eb1dfecaca5ab54ace854d9332d.jpg',
  'climber-gear-rope.jpeg': 'media_120ec28ba6bb802dfa2a696b5594b2101609e405e.jpg',
  'adobestock-277948178.jpeg': 'media_126c56a5938441fc58a41fe615778fc36cc04aede.jpg',
  'climber-gear-outdoor.jpeg': 'media_1298dba3a770cacdddbdaeea03f90c21f515d3e61.jpg',
  'adobestock-166394648.jpeg': 'media_1ac5934a2d83b01fddb99fedf5ed359b5b8b6089b.jpg',
  'equipment-4.jpeg': 'media_1aabba389ae008ab4ae83beee21df74e70da7b554.jpg',
  'adobestock-241578158.jpeg': 'media_18526c1cc7c4f4127e7c88f934614bc041b1645b4.jpg',
  'adobestock-221043703.jpeg': 'media_148640b75479ffa9ce7c89e080a8b8a93a4a760f1.jpg',
  'adobestock-65986215.jpeg': 'media_1d94bcf0984708efe1c9cbf54b0207eb78b4552ac.jpg',
  'adobestock-272493830.jpeg': 'media_181d7e9f9d628cdb321f42b0fd2c6ea73a0c66cfa.jpg',
  'adobestock-261097343.jpeg': 'media_1e56ff87aeb7dc7d3d4eb4acd41d468f583a00303.jpg',
  'adobestock-268213814.jpeg': 'media_129969a9663ee71a50f9b036b7ba303316f0dbd82.jpg',
  'adobestock-141786166.jpeg': 'media_1633e1a38952261231aa3b79ec32f9cdbba4e3fcd.jpg',
  'freeride-steep.jpeg': 'media_11647aca17e6bfad32c0f3e05cd36fdb1f589bfbc.jpg',
  'adobestock-170334891.jpeg': 'media_1d7dd84bc1278805b7b07dc66ed2535dffdd1c154.jpg',
  'adobestock-93049279.jpeg': 'media_1b6dee852ce987f4625fee72d141802afed788370.jpg',
  'freeride.jpeg': 'media_1e14c170f3ea016b96fd116b518dc5d8e11913726.jpg',
  'adobestock-166718157.jpeg': 'media_1a33580363148b6b4d221d5ccae708d6c2b0e71d7.jpg',
  'adobestock-270835979.jpeg': 'media_1a9885d2fb529f64cad8726d97367713790763f7a.jpg',
  'adobestock-239751461.jpeg': 'media_159752048c5f547ca096ff6de391d1374d20c6415.jpg',
  'adobestock-277654931.jpeg': 'media_1d533d2e3b43d81860cc889f9e66db333012095ac.jpg',
  'adobestock-257501643.jpeg': 'media_10cf0e2ae610624dc0b92cbf0438ee8a10fd4b032.jpg',
  'adobestock-238491803.jpeg': 'media_1cf303e97856849e81d37b490c36859d617e30874.jpg',
  'adobestock-167833331.jpeg': 'media_10b0588c9f730dc1d44f47fedc6041aea6ef3f21f.jpg',
  'adobestock-257541512.jpeg': 'media_1e40a67f770c342bc702002b18099e0df93fa110d.jpg',
  'adobestock-178022573.jpeg': 'media_122a75f68dd784fb5044e4a5d5e439460010bdbd4.jpg',
  'hiker-anapurna.jpeg': 'media_1bfb3f0e144e7599def28c6bbb66e8ab573520708.jpg',
  'equipment-6.jpeg': 'media_169f4c60aaba32300d51e7d5e0fc2fe182eab6d87.jpg',
  'adobestock-21422513.jpeg': 'media_1b45033394de26aabd1395bf1b2def97a88e4945d.jpg',
  'adobestock-291339093.jpeg': 'media_1c5b87c3cf8e4d6a6e7c7bf7bd4d0ff0f7849f8c9.jpg',
  'ice-climbing.jpeg': 'media_134b173a1fa20ba48f905cf9beca38a35c25b8ed5.jpg',
  'skitouring.jpeg': 'media_1e62468f535f713542310b6cfaea5aec002f395ab.jpg',
  'adobestock-75620750.jpeg': 'media_12413b71bb2ff9744d291ff273b554a0cf5a5d91f.jpg',
  'alpinists-rochefort-ridge.jpeg': 'media_177913c03504abb55acb8fe069bdc57025e204ac9.jpg',
  'hiking-campaign.jpeg': 'media_1c8299eedb6d6f452fd05e9c3f4dfe877d8285edb.jpg',
  'alpinists-himalayas.jpeg': 'media_153e7c907c14e0e038b7b0a3c111b5bd34f26ce0a.jpg',
  'adobestock-113485796.jpeg': 'media_17028641add659e7ed7026a822eb893df3f5a2feb.jpg',
  'adobestock-113490014.jpeg': 'media_15dc7a989960050e83cd165e4df676c1575fb61ca.jpg',
  'surfing-5.jpeg': 'media_145b1978ca439e535ac467e3aae1ad8b3f7456007.jpg',
  'selvaraj-surfing.jpeg': 'media_1b5d503f9d892b6286a3af161685e98a5a8b3ae98.jpg',
  'adobestock-272479375.jpeg': 'media_160a3a436eb47ed237f44e805a3310a7d28a1088b.jpg',
  'surfing-2.jpeg': 'media_188e608be0a88a750009e939020d6ebac72a799da.jpg',
  'adobestock-224653243.jpeg': 'media_133e715086bb5f589505c681207e788413efc731a.jpg',
  'mountain-biking.jpeg': 'media_10740784700a03cf30a5daa77b286b1452446c922.jpg',
  'adobestock-122578479.jpeg': 'media_1b00bf043444a859d2dd5750633d2d9fa52328c37.jpg',
  'adobestock-122618183.jpeg': 'media_1717690ac90b92ca13d18067a725141bcda1851a7.jpg',
  'forest-trail.jpeg': 'media_1ae3363cec098ffe9e174d691cb4e780db8d307f5.jpg',
  'adobestock-277761435.jpeg': 'media_1835a72c519761e2950d82639a6bd55b0eab7001e.jpg',
  'sequoiaside.jpeg': 'media_11e606eb7b5c71543509af245963b8e20a1b2b938.jpg',
  'blast.jpeg': 'media_120794d39b3de6509d98f3c660e165ecc7add0b25.jpg',
  'mx121.jpeg': 'media_1d29e48893c4706a2b6ef898c6f16ba6a2cc2a210.jpg',
  'adobestock-196967522.jpeg': 'media_10a8aa1e22ca907f254e6dfc6617f2c73c4e63644.jpg',
  // bulk-import (article/listing/faq/homepage English pages) harvested images
  'article-01-hero.png': 'media_11c9b56a1f4f2ea19150f28d7d5baee4378a9f3b8.png',
  'robson-hatsukami-morgan-280159.jpeg': 'media_192d46151aa5625a43eef3e0580b9d01f84524cef.jpg',
  'camp-alaska.jpeg': 'media_13b6c17e69e12f17b56ea062794eb910012754393.jpg',
  'alaskan-landscape-01.jpeg': 'media_151f24b0b4c8d9098015083137a863c7cc38e5490.jpg',
  'plane.jpeg': 'media_1712ca29efa31b7eb9d019283bc7c9e7176a24c9d.jpg',
  'fish.jpeg': 'media_1877ce239cbe393aa9f0e96c1bb5e7f874af04a50.jpg',
  'amazon-river-01.jpeg': 'media_11feb4dea0e336842efc8a39ec1fec5ef00b54f84.jpg',
  'dorado-fish-03.jpeg': 'media_1e4abae6534cbad1f6b13102b8dca8bfb8951941c.jpg',
  'milkyway-amazon.jpeg': 'media_13e6cdfda9739971c079e0ff1706723763fffadbe.jpg',
  'adobestock-166388792.jpeg': 'media_15c8b7cdd7e8e9f095f427182bcefbd4e650e2229.jpg',
  'adobestock-266406767.jpeg': 'media_1ff744e052d0125c8ea2d283e4b781f042ef4d095.jpg',
  'adobestock-272184938.jpeg': 'media_160af54f2452a2249b5fe9762dd412ffa6a7ad7d1.jpg',
  'skitouring1sjoeberg.jpeg': 'media_1a93aff180eed636c38d16f6a422d6afe3cac02f9.jpg',
  'skitouring3sjoeberg.jpeg': 'media_195c92127414d89ccfc4313f71144c87ec8778f9f.jpg',
  'skitouring6sjoeberg.jpeg': 'media_1ca54c23a03450ae7f7e5b3a0c4edacb05b6a4818.jpg',
  'skitouring8sjoeberg.jpeg': 'media_1deca205afbe13411acbdd816eb3ae88e998e9e37.jpg',
  'adobe-waadobe-wa-mg-3094.jpeg': 'media_1ac2508651397d4efbd11d642d0614ad82887e87c.jpg',
  'adobe-waadobe-wa-mg-3851.jpeg': 'media_1a4f37d788256468b3177725eae44750392762837.jpg',
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
