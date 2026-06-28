import extract from 'png-chunks-extract';
import encode from 'png-chunks-encode';
import text from 'png-chunk-text';
import { Buffer } from 'buffer';

/**
 * Loads a base64 image or URL into an HTML Image element
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Converts an Image object into a standard PNG Uint8Array
 */
function imageToPngBuffer(img) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    canvas.toBlob((blob) => {
      if (!blob) {
        return reject(new Error("Failed to export canvas to Blob"));
      }
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    }, 'image/png');
  });
}

/**
 * Encodes string to base64
 */
function utf8ToBase64(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

/**
 * Generates a Tavern PNG card (V2 Spec)
 * @param {string} avatarDataUrl Base64 or object URL of the avatar image
 * @param {object} characterData The JSON V2 character data object
 * @returns {Promise<Uint8Array>} The final PNG byte array containing the EXIF data
 */
export async function createTavernPngCard(avatarDataUrl, characterData) {
  // 1. Load image and convert to clean PNG buffer
  const img = await loadImage(avatarDataUrl);
  const pngBuffer = await imageToPngBuffer(img);
  
  // 2. Extract standard chunks
  const chunks = extract(pngBuffer);
  
  // 3. Prepare tEXt chunk
  const jsonStr = JSON.stringify(characterData);
  const base64Data = utf8ToBase64(jsonStr);
  const tEXtChunk = text.encode('chara', base64Data);
  
  // 4. Inject tEXt chunk right before IEND
  // Find the IEND chunk index (it should be the last one, but we search just in case)
  const iendIndex = chunks.findIndex(chunk => chunk.name === 'IEND');
  
  if (iendIndex !== -1) {
    // Insert before IEND
    chunks.splice(iendIndex, 0, tEXtChunk);
  } else {
    // Fallback if no IEND is found (malformed PNG), just push it
    chunks.push(tEXtChunk);
  }
  
  // 5. Re-encode the chunks back into a PNG byte array
  return encode(chunks);
}
