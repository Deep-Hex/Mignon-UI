/**
 * Utility helper to handle file exports/downloads.
 * Automatically switches between Tauri API calls (filesystem write),
 * the modern Web File System Access API (showSaveFilePicker),
 * and standard anchor-tag fallback downloads.
 * 
 * @param {Object} params
 * @param {string|Uint8Array} params.data - The text or binary data to save.
 * @param {string} params.fileName - Suggested filename (e.g. 'my_character.json').
 * @param {'json'|'png'} params.type - The file type/extension.
 * @param {Function} [params.onSuccess] - Callback when file is successfully saved.
 * @param {Function} [params.onError] - Callback on save error.
 */
export async function downloadFile({ data, fileName, type, onSuccess, onError }) {
  try {
    // 1. Native Tauri App
    if (window.__TAURI_INTERNALS__) {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile, writeFile } = await import('@tauri-apps/plugin-fs');

      const filePath = await save({
        defaultPath: fileName,
        filters: [{ name: type.toUpperCase() + ' File', extensions: [type] }]
      });

      if (filePath) {
        if (type === 'png') {
          await writeFile(filePath, data);
        } else {
          await writeTextFile(filePath, data);
        }
        if (onSuccess) onSuccess();
      }
      return;
    }

    // 2. Modern Web Browser Save Picker
    if (window.showSaveFilePicker) {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: type.toUpperCase() + ' File',
          accept: type === 'png' ? { 'image/png': ['.png'] } : { 'application/json': ['.json'] }
        }]
      });
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
      if (onSuccess) onSuccess();
      return;
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.warn("Save dialog failed, falling back to basic download", err);
    if (onError) onError(err);
  }

  // 3. Fallback Download Link
  let fallbackHref;
  if (type === 'png') {
    const blob = new Blob([data], { type: 'image/png' });
    fallbackHref = URL.createObjectURL(blob);
  } else {
    // If data is already a string, encode it; if not, stringify it
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    fallbackHref = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
  }

  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", fallbackHref);
  downloadAnchorNode.setAttribute("download", fileName);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  
  if (type === 'png') {
    URL.revokeObjectURL(fallbackHref);
  }
  if (onSuccess) onSuccess();
}
