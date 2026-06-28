import { parseSvgGradient } from './chatWallpapers';

export const BG_COLOR_PRESETS = [
  // ── SOLID COLORS ──
  { name: 'Cyber Raspberry', value: '#ff1493' },
  { name: 'Neon Blue', value: '#00f0ff' },
  { name: 'Vibrant Emerald', value: '#00ffcc' },
  { name: 'Warm Amber', value: '#fbbf24' },
  { name: 'Obsidian Black', value: '#050508' },
  { name: 'Classic Slate', value: '#475569' },
  { name: 'Pure White', value: '#ffffff' },
  // ── PREMIUM GRADIENTS ──
  { name: 'Cyber Neon', value: 'linear-gradient(135deg, #ff1493 0%, #00f0ff 100%)' },
  { name: 'Obsidian Dusk', value: 'linear-gradient(135deg, #0f0c20 0%, #06060c 100%)' },
  { name: 'Cherry Velvet', value: 'linear-gradient(135deg, #8a2387 0%, #e94057 50%, #f27121 100%)' },
  { name: 'Vibrant Sunset', value: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)' },
  { name: 'Emerald Glow', value: 'linear-gradient(135deg, #1f4037 0%, #99f2c8 100%)' },
  { name: 'Aurora Sky', value: 'linear-gradient(135deg, #0575e6 0%, #00f260 100%)' }
];

export const STROKE_PRESETS = [
  // ── SOLID COLORS ──
  { name: 'Cyber Raspberry', value: '#ff1493' },
  { name: 'Neon Blue', value: '#00f0ff' },
  { name: 'Vibrant Emerald', value: '#00ffcc' },
  { name: 'Warm Amber', value: '#fbbf24' },
  { name: 'Obsidian Black', value: '#050508' },
  { name: 'Classic Slate', value: '#475569' },
  { name: 'Pure White', value: '#ffffff' },
  // ── PREMIUM GRADIENTS ──
  { name: 'Neon Dream', value: 'linear-gradient(135deg, #ff1493 0%, #00f0ff 100%)' },
  { name: 'Cyber Sunset', value: 'linear-gradient(135deg, #ff1493 0%, #fbbf24 100%)' },
  { name: 'Emerald Wave', value: 'linear-gradient(135deg, #00ffcc 0%, #2563eb 100%)' },
  { name: 'Cotton Candy', value: 'linear-gradient(135deg, #00f0ff 0%, #ff1493 100%)' },
  { name: 'Royal Twilight', value: 'linear-gradient(135deg, #8a2387 0%, #e94057 50%, #f27121 100%)' }
];

export const parseGradient = (gradientStr) => {
  const defaultVal = { type: 'linear', angle: 135, colors: ['#ff1493', '#00f0ff'] };
  return parseSvgGradient(gradientStr) || defaultVal;
};

export const constructGradientString = (type, angle, colors) => {
  const stops = colors.map((c, i) => {
    const pct = Math.round((i / (colors.length - 1)) * 100);
    return `${c} ${pct}%`;
  }).join(', ');

  if (type === 'radial') {
    return `radial-gradient(circle, ${stops})`;
  } else if (type === 'conic') {
    return `conic-gradient(from ${angle}deg, ${stops})`;
  } else {
    return `linear-gradient(${angle}deg, ${stops})`;
  }
};

export const resizeAndCompressImage = (base64Str, maxDimension = 1200, quality = 0.8) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

/**
 * Returns the two swatch colors for a given UI theme ID.
 * @param {string} themeId 
 * @param {boolean} isDark 
 * @returns {[string, string]} Tuple of color codes
 */
export function getThemeSwatches(themeId, isDark) {
  const swatchMap = {
    bubblegum: isDark ? ['#e54b7c', '#4ba3e3'] : ['#ffb7ce', '#a3defe'],
    cyberpunk: ['#ff007f', '#00f0ff'],
    dollhouse: isDark ? ['#ff1493', '#210035'] : ['#ff1493', '#fff0f5'],
    builder: isDark ? ['#f5c400', '#00852b'] : ['#d31212', '#0055a5'],
    classic: isDark ? ['#38bdf8', '#090d16'] : ['#2563eb', '#e2e8f0'],
    darkyellow: isDark ? ['#f5c400', '#080808'] : ['#f5c400', '#1a1a1c'],
    sketchbook: isDark ? ['#ffd700', '#18181b'] : ['#fcfaf2', '#2f3e46'],
    skins: isDark ? ['#d99c68', '#1c1512'] : ['#a87b51', '#fdfaf6']
  };

  return swatchMap[themeId] || ['#38bdf8', '#090d16']; // Default fallback
}
