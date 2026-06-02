/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../services/api';

const CharacterContext = createContext(null);

export function CharacterProvider({ children }) {
  const [characters, setCharacters] = useState([]);
  const [characterForm, setCharacterForm] = useState({
    id: null,
    world_id: null,
    name: '',
    avatar: null,
    greeting: '',
    personality: '',
    scenario: '',
    example_dialogue: '',
    nsfw_inject: false,
  });

  const fetchCharacters = useCallback(async () => {
    try {
      const data = await api.fetchCharacters();
      setCharacters(data);
    } catch (e) {
      console.error('Failed to load characters:', e);
    }
  }, []);

  const handleCharacterSubmit = useCallback(async (form) => {
    await api.saveCharacter(form);
    await fetchCharacters();
  }, [fetchCharacters]);

  const handleTavernImport = useCallback(async (file) => {
    const char = await api.importTavernCard(file);
    await fetchCharacters();
    return char;
  }, [fetchCharacters]);

  const handleDeleteCharacter = useCallback(async (charId) => {
    await api.deleteCharacter(charId);
    await fetchCharacters();
  }, [fetchCharacters]);

  const handleEditCharacterClick = useCallback((c, setActiveModal) => {
    setCharacterForm({
      id: c.id,
      world_id: c.world_id,
      name: c.name,
      avatar: c.avatar,
      greeting: c.greeting || '',
      personality: c.personality || '',
      scenario: c.scenario || '',
      example_dialogue: c.example_dialogue || '',
      nsfw_inject: c.nsfw_inject !== undefined ? c.nsfw_inject : false,
    });
    setActiveModal('character');
  }, []);

  const handleAvatarFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCharacterForm(prev => ({ ...prev, avatar: event.target.result }));
    };
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCharacters();
  }, [fetchCharacters]);

  const value = useMemo(() => ({
    characters,
    characterForm, setCharacterForm,
    fetchCharacters,
    handleCharacterSubmit,
    handleTavernImport,
    handleDeleteCharacter,
    handleEditCharacterClick,
    handleAvatarFileChange,
  }), [
    characters,
    characterForm,
    fetchCharacters,
    handleCharacterSubmit,
    handleTavernImport,
    handleDeleteCharacter,
    handleEditCharacterClick,
    handleAvatarFileChange,
  ]);

  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacterContext() {
  const ctx = useContext(CharacterContext);
  if (!ctx) throw new Error('useCharacterContext must be used within CharacterProvider');
  return ctx;
}
