// src/services/loreService.js
// Client-side Lore service. Manages lore books/settings, lore keys, and lore RAG index.

import * as crud from './crud';
import * as rag from './rag';

export async function fetchWorlds() {
  return crud.getWorlds();
}

export async function createWorld(worldData) {
  return crud.createWorld(worldData);
}

export async function updateWorld(id, worldData) {
  return crud.updateWorld(id, worldData);
}

export async function deleteWorld(id) {
  await rag.clearEmbeddings("lore", String(id));
  return crud.deleteWorld(id);
}

export async function fetchLore() {
  return crud.getLore();
}

async function createLore(loreForm) {
  const lore = await crud.createLore(loreForm);
  
  // Index in RAG vector store
  if (lore.world_id) {
    const textToEmbed = `[LORE: ${lore.title}]\nTrigger keywords: ${lore.keys}\n\n${lore.content}`;
    await rag.saveEmbedding(`lore_${lore.id}`, "lore", String(lore.world_id), lore.title, textToEmbed);
  }
  
  return lore;
}

async function updateLore(id, loreForm) {
  const lore = await crud.updateLore(id, loreForm);
  
  // Update in RAG vector store
  if (lore.world_id) {
    const textToEmbed = `[LORE: ${lore.title}]\nTrigger keywords: ${lore.keys}\n\n${lore.content}`;
    await rag.saveEmbedding(`lore_${lore.id}`, "lore", String(lore.world_id), lore.title, textToEmbed);
  } else {
    // Delete if world removed
    await rag.deleteEmbedding(`lore_${id}`);
  }
  
  return lore;
}

export async function saveLore(loreForm) {
  if (loreForm.id) {
    return updateLore(loreForm.id, loreForm);
  }
  return createLore(loreForm);
}

export async function deleteLore(id) {
  await rag.deleteEmbedding(`lore_${id}`);
  return crud.deleteLore(id);
}

export async function importWorldInfo(fileName, jsonData) {
  const name = fileName.replace(/\.json$/i, '');
  const description = `Imported from ${fileName}`;
  const world = await crud.createWorld({ name, description });

  if (jsonData && jsonData.entries) {
    const entries = Object.values(jsonData.entries);
    for (const entry of entries) {
      const keys = Array.isArray(entry.key) ? entry.key.join(', ') : (entry.key || '');
      const savedLore = await crud.createLore({
        world_id: world.id,
        title: entry.comment || (Array.isArray(entry.key) && entry.key[0]) || `Entry ${entry.uid}`,
        keys: keys,
        content: entry.content || '',
        weight: entry.order !== undefined ? entry.order : 100,
        is_active: true
      });

      // Index in RAG vector store
      const textToEmbed = `[LORE: ${savedLore.title}]\nTrigger keywords: ${savedLore.keys}\n\n${savedLore.content}`;
      await rag.saveEmbedding(`lore_${savedLore.id}`, "lore", String(world.id), savedLore.title, textToEmbed);
    }
  }
  return world;
}
