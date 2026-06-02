/**
 * Crops a source image using HTML5 Canvas based on percentage crop states.
 * Returns a Promise that resolves to the cropped image as a Base64 JPEG data URL.
 * 
 * @param {string} sourceImg - Base64 source image data URL.
 * @param {Object} cropState - Percentage coordinates { x, y, w, h } where each is 0-100.
 * @returns {Promise<string>} Cropped image base64 data URL.
 */
export function cropImage(sourceImg, cropState) {
  return new Promise((resolve, reject) => {
    if (!sourceImg) {
      reject(new Error("No source image provided"));
      return;
    }
    const img = new Image();
    img.src = sourceImg;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const cropX = (cropState.x / 100) * img.naturalWidth;
        const cropY = (cropState.y / 100) * img.naturalHeight;
        const cropW = (cropState.w / 100) * img.naturalWidth;
        const cropH = (cropState.h / 100) * img.naturalHeight;
        
        canvas.width = cropW;
        canvas.height = cropH;
        
        ctx.drawImage(
          img,
          cropX, cropY, cropW, cropH,
          0, 0, cropW, cropH
        );
        
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(err);
  });
}
