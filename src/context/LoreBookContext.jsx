/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../services/api';

const LoreBookContext = createContext(null);

export function LoreBookProvider({ children }) {
  const [lore, setLore] = useState([]);
  const [worlds, setWorlds] = useState([]);
  const [currentWorldId, setCurrentWorldId] = useState(null);

  const [loreForm, setLoreForm] = useState({
    id: null, world_id: null, title: '', keys: '', content: '', weight: 100, is_active: true,
  });
  const [worldForm, setWorldForm] = useState({ name: '', description: '' });

  const fetchLore = useCallback(async () => {
    try { setLore(await api.fetchLore()); } catch (e) { console.error('Failed to load lore:', e); }
  }, []);

  const fetchWorlds = useCallback(async () => {
    try {
      const data = await api.fetchWorlds();
      setWorlds(data);
      setCurrentWorldId(prev => {
        if (prev !== null && data.some(w => w.id === prev)) return prev;
        return data.length > 0 ? data[0].id : null;
      });
    } catch (e) { console.error('Failed to load worlds:', e); }
  }, []);

  const handleLoreSubmit = useCallback(async (form) => {
    await api.saveLore(form);
    await fetchLore();
  }, [fetchLore]);

  const handleToggleLoreActive = useCallback(async (entry, checked) => {
    await api.saveLore({ ...entry, is_active: checked });
    await fetchLore();
  }, [fetchLore]);

  const handleDeleteLore = useCallback(async (entry) => {
    await api.deleteLore(entry.id);
    await fetchLore();
  }, [fetchLore]);

  const handleEditLoreClick = useCallback((entry, setActiveModal) => {
    setLoreForm({
      id: entry.id,
      world_id: entry.world_id || currentWorldId,
      title: entry.title,
      keys: entry.keys,
      content: entry.content,
      weight: entry.weight !== undefined ? entry.weight : 100,
      is_active: entry.is_active,
    });
    setActiveModal('lore');
  }, [currentWorldId]);

  const handleWorldSubmit = useCallback(async (form) => {
    const newWorld = await api.createWorld(form);
    await fetchWorlds();
    if (newWorld?.id) setCurrentWorldId(newWorld.id);
    return newWorld;
  }, [fetchWorlds]);

  const handleDeleteWorld = useCallback(async (worldId) => {
    await api.deleteWorld(worldId);
    setCurrentWorldId(prev => prev === worldId ? null : prev);
    await fetchWorlds();
    await fetchLore();
  }, [fetchWorlds, fetchLore]);

  const handleWorldImport = useCallback(async (fileName, jsonData) => {
    const newWorld = await api.importWorld(fileName, jsonData);
    await fetchWorlds();
    await fetchLore();
    if (newWorld?.id) setCurrentWorldId(newWorld.id);
    return newWorld;
  }, [fetchWorlds, fetchLore]);

  const handleRenameWorld = useCallback(async (worldId, newName) => {
    const world = worlds.find(w => w.id === worldId);
    if (!world) return;
    await api.updateWorld(worldId, { ...world, name: newName });
    await fetchWorlds();
  }, [worlds, fetchWorlds]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLore();
    fetchWorlds();
  }, [fetchLore, fetchWorlds]);

  const value = useMemo(() => ({
    lore, setLore,
    worlds, setWorlds,
    currentWorldId, setCurrentWorldId,
    loreForm, setLoreForm,
    worldForm, setWorldForm,
    fetchLore, fetchWorlds,
    handleLoreSubmit, handleToggleLoreActive, handleDeleteLore, handleEditLoreClick,
    handleWorldSubmit, handleDeleteWorld, handleWorldImport, handleRenameWorld,
  }), [
    lore,
    worlds,
    currentWorldId,
    loreForm,
    worldForm,
    fetchLore, fetchWorlds,
    handleLoreSubmit, handleToggleLoreActive, handleDeleteLore, handleEditLoreClick,
    handleWorldSubmit, handleDeleteWorld, handleWorldImport, handleRenameWorld,
  ]);

  return (
    <LoreBookContext.Provider value={value}>
      {children}
    </LoreBookContext.Provider>
  );
}

export function useLoreBookContext() {
  const ctx = useContext(LoreBookContext);
  if (!ctx) throw new Error('useLoreBookContext must be used within LoreBookProvider');
  return ctx;
}
