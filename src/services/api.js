// --- API CLIENT SERVICES FOR SQLite BACKEND ---

export async function fetchSettings() {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

export async function saveSettings(settingsForm) {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settingsForm)
  });
  if (!res.ok) throw new Error("Failed to save settings");
  return res.json();
}

export async function testConnection() {
  const res = await fetch("/api/settings/test-connection");
  if (!res.ok) throw new Error("Failed to test connection");
  return res.json();
}

export async function fetchCharacters() {
  const res = await fetch("/api/characters");
  if (!res.ok) throw new Error("Failed to load characters");
  return res.json();
}

export async function createCharacter(characterForm) {
  const res = await fetch("/api/characters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(characterForm)
  });
  if (!res.ok) throw new Error("Failed to create character");
  return res.json();
}

export async function updateCharacter(id, characterForm) {
  const res = await fetch(`/api/characters/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(characterForm)
  });
  if (!res.ok) throw new Error("Failed to update character");
  return res.json();
}

/** @deprecated Use createCharacter or updateCharacter instead */
export async function saveCharacter(characterForm) {
  if (characterForm.id) {
    return updateCharacter(characterForm.id, characterForm);
  }
  return createCharacter(characterForm);
}

export async function deleteCharacter(id) {
  const res = await fetch(`/api/characters/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete character");
  return true;
}

export async function importTavernCard(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/characters/import-tavern", {
    method: "POST",
    body: formData
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Import failed");
  }
  return res.json();
}

export async function fetchRooms() {
  const res = await fetch("/api/rooms");
  if (!res.ok) throw new Error("Failed to load rooms");
  return res.json();
}

export async function createRoom(roomData) {
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(roomData)
  });
  if (!res.ok) throw new Error("Failed to create room");
  return res.json();
}

export async function deleteRoom(id) {
  const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete room");
  return true;
}

export async function fetchRoomMemories(roomId) {
  const res = await fetch(`/api/rooms/${roomId}/memories`);
  if (!res.ok) throw new Error("Failed to load room memories");
  return res.json();
}

export async function fetchRoomMessages(roomId) {
  const res = await fetch(`/api/rooms/${roomId}/messages`);
  if (!res.ok) throw new Error("Failed to load room messages");
  return res.json();
}

export async function sendMessage(roomId, content, senderName = "User") {
  const formData = new FormData();
  formData.append("content", content);
  formData.append("sender_name", senderName);
  
  const res = await fetch(`/api/rooms/${roomId}/messages`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error("Failed to deliver message");
  return true;
}

export async function swipeMessage(roomId, msgId, newIndex) {
  const res = await fetch(`/api/rooms/${roomId}/messages/${msgId}/swipe?index=${newIndex}`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to swipe response");
  return true;
}

export async function regenerateSwipe(roomId, msgId, onToken, signal) {
  const res = await fetch(`/api/rooms/${roomId}/messages/${msgId}/swipe-regen`, {
    method: "POST",
    signal: signal
  });
  if (!res.ok) throw new Error("Failed to start swipe regeneration");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let result = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    for (const line of text.split("\n")) {
      if (!line.startsWith("data:")) continue;
      try {
        const json = JSON.parse(line.slice(5).trim());
        if (json.token && onToken) onToken(json.token);
        if (json.done) result = json;
        if (json.error) throw new Error(json.error);
      } catch (e) {
        if (e.message && !e.message.includes("JSON")) throw e;
      }
    }
  }
  return result;
}

export async function deleteMessage(msgId) {
  const res = await fetch(`/api/messages/${msgId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete response");
  return true;
}

export async function updateMessage(msgId, content) {
  const formData = new FormData();
  formData.append("content", content);

  const res = await fetch(`/api/messages/${msgId}`, {
    method: "PUT",
    body: formData
  });
  if (!res.ok) throw new Error("Failed to edit message");
  return res.json();
}

export async function fetchLore() {
  const res = await fetch("/api/lore");
  if (!res.ok) throw new Error("Failed to load lore");
  return res.json();
}

export async function createLore(loreForm) {
  const res = await fetch("/api/lore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(loreForm)
  });
  if (!res.ok) throw new Error("Failed to create lore entry");
  return res.json();
}

export async function updateLore(id, loreForm) {
  const res = await fetch(`/api/lore/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(loreForm)
  });
  if (!res.ok) throw new Error("Failed to update lore entry");
  return res.json();
}

/** @deprecated Use createLore or updateLore instead */
export async function saveLore(loreForm) {
  if (loreForm.id) {
    return updateLore(loreForm.id, loreForm);
  }
  return createLore(loreForm);
}

export async function deleteLore(id) {
  const res = await fetch(`/api/lore/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete lore entry");
  return true;
}

export async function fetchWorlds() {
  const res = await fetch("/api/worlds");
  if (!res.ok) throw new Error("Failed to load worlds");
  return res.json();
}

export async function createWorld(worldData) {
  const res = await fetch("/api/worlds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(worldData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create world");
  }
  return res.json();
}

export async function deleteWorld(id) {
  const res = await fetch(`/api/worlds/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete world");
  return true;
}

export async function fetchStickers() {
  const res = await fetch("/api/stickers");
  if (!res.ok) throw new Error("Failed to load stickers");
  return res.json();
}

export async function createSticker(stickerData) {
  const res = await fetch("/api/stickers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stickerData)
  });
  if (!res.ok) throw new Error("Failed to create sticker");
  return res.json();
}

export async function updateSticker(id, stickerData) {
  const res = await fetch(`/api/stickers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stickerData)
  });
  if (!res.ok) throw new Error("Failed to update sticker");
  return res.json();
}

export async function deleteSticker(id) {
  const res = await fetch(`/api/stickers/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete sticker");
  return true;
}

export async function truncateMessages(roomId, messageId) {
  const res = await fetch(`/api/rooms/${roomId}/messages/${messageId}/truncate`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to truncate chat history");
  return res.json();
}

export async function branchRoom(roomId, messageId) {
  const res = await fetch(`/api/rooms/${roomId}/messages/${messageId}/branch`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to branch chat room");
  return res.json();
}

export async function addRoomMember(roomId, characterId) {
  const res = await fetch(`/api/rooms/${roomId}/members/${characterId}`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to add member to room");
  return res.json();
}

export async function removeRoomMember(roomId, characterId) {
  const res = await fetch(`/api/rooms/${roomId}/members/${characterId}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Failed to remove member from room");
  return res.json();
}

export async function fetchNextSpeaker(roomId, messageContent = "", mutedIds = "", mode = "efficient") {
  const formData = new FormData();
  formData.append("message_content", messageContent);
  formData.append("muted_ids", mutedIds);
  formData.append("mode", mode);

  const res = await fetch(`/api/rooms/${roomId}/next-speaker`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error("Failed to select next speaker");
  return res.json();
}

export async function updateSceneState(roomId, sceneState) {
  const formData = new FormData();
  formData.append("scene_state", typeof sceneState === "string" ? sceneState : JSON.stringify(sceneState));

  const res = await fetch(`/api/rooms/${roomId}/scene-state`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error("Failed to update room scene state");
  return res.json();
}


