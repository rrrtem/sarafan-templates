/* Shared crop geometry for HTML previews and lossless 1080 × 1350 PNG exports. */
(() => {
  const clamp = (value, min, max, fallback) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  function normalize(value = {}) {
    value = value && typeof value === 'object' ? value : {};
    return { x: clamp(value.x, 0, 1, .5), y: clamp(value.y, 0, 1, .5), zoom: clamp(value.zoom, 1, 3, 1), fit: value.fit === 'contain' ? 'contain' : 'cover' };
  }
  function geometry(imageWidth, imageHeight, slot, value) {
    const state = normalize(value);
    const ratios = [slot.width / imageWidth, slot.height / imageHeight];
    // Fit all four corners inside an ellipse, rather than its rectangular bounds.
    const scale = (state.fit === 'contain' ? 1 / Math.hypot(imageWidth / slot.width, imageHeight / slot.height) : Math.max(...ratios)) * state.zoom;
    const width = imageWidth * scale, height = imageHeight * scale;
    return { x: slot.x + (slot.width - width) * state.x, y: slot.y + (slot.height - height) * state.y, width, height };
  }
  const images = new Map();
  function loadImage(src) {
    if (!images.has(src)) images.set(src, new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => { images.delete(src); reject(new Error('Не удалось загрузить фотографию.')); };
      image.src = window.SARAFAN_CROP_MEDIA?.[src] || src;
    }));
    return images.get(src);
  }
  async function paint(canvas, edit, state) {
    const [image, overlay] = await Promise.all([loadImage(edit.image), loadImage(edit.overlay)]);
    // An older paint must never replace a newer slider/drag result.
    const revision = state;
    if (canvas.cropRevision && canvas.cropRevision !== revision) return;
    canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = edit.background; ctx.fillRect(0, 0, 1080, 1350);
    const s = edit.slot, g = geometry(image.naturalWidth, image.naturalHeight, s, state);
    ctx.save(); ctx.beginPath();
    ctx.ellipse(s.x + s.width / 2, s.y + s.height / 2, s.width / 2, s.height / 2, 0, 0, 2 * Math.PI); ctx.clip();
    ctx.fillStyle = edit.matte || edit.background; ctx.fillRect(s.x, s.y, s.width, s.height);
    ctx.drawImage(image, g.x, g.y, g.width, g.height); ctx.restore();
    ctx.drawImage(overlay, 0, 0, 1080, 1350);
  }
  window.SarafanCrop = { normalize, geometry, loadImage, paint };
})();
