/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('rp_active_tab') || 'chars');
  const [activeModal, setActiveModal] = useState(null);
  const [searchCharsQuery, setSearchCharsQuery] = useState('');
  const [searchLoreQuery, setSearchLoreQuery] = useState('');
  const [searchRoomsQuery, setSearchRoomsQuery] = useState('');
  const [searchWorldsQuery, setSearchWorldsQuery] = useState('');
  const [activeWorldDetail, setActiveWorldDetail] = useState(() => localStorage.getItem('rp_active_world_detail') === 'true');
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemPrefersDark ? 'dark' : 'light';
  });
  const [themeDesign, setThemeDesign] = useState(() => localStorage.getItem('theme_design') || 'bubblegum');

  const THEMES = useMemo(() => [
    { id: 'bubblegum', name: 'Bubblegum Pop' },
    { id: 'cyberpunk', name: 'Neo-Cyber' },
    { id: 'dollhouse', name: 'Dollhouse' },
    { id: 'builder', name: 'Builder' },
    { id: 'classic', name: 'Darf Classic' },
    { id: 'darkyellow', name: 'Dark Yellow' },
    { id: 'sketchbook', name: 'Sketch Book' }
  ], []);

  useEffect(() => { localStorage.setItem('rp_active_tab', activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem('rp_active_world_detail', activeWorldDetail); }, [activeWorldDetail]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    localStorage.setItem('theme_design', themeDesign);
    
    const root = document.documentElement;
    
    // Remove all possible theme classes
    const themeIds = ['bubblegum', 'cyberpunk', 'dollhouse', 'builder', 'classic', 'darkyellow', 'sketchbook'];
    themeIds.forEach(id => {
      root.classList.remove(`theme-${id}-light`);
      root.classList.remove(`theme-${id}-dark`);
    });
    
    // Add current theme class
    root.classList.add(`theme-${themeDesign}-${theme}`);

    if (theme === 'dark') {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }
  }, [theme, themeDesign]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const value = useMemo(() => ({
    activeTab, setActiveTab,
    activeModal, setActiveModal,
    searchCharsQuery, setSearchCharsQuery,
    searchLoreQuery, setSearchLoreQuery,
    searchRoomsQuery, setSearchRoomsQuery,
    searchWorldsQuery, setSearchWorldsQuery,
    activeWorldDetail, setActiveWorldDetail,
    theme, toggleTheme, setTheme,
    themeDesign, setThemeDesign, THEMES
  }), [
    activeTab, activeModal,
    searchCharsQuery, searchLoreQuery,
    searchRoomsQuery, searchWorldsQuery,
    activeWorldDetail, theme, toggleTheme, setTheme,
    themeDesign, setThemeDesign, THEMES
  ]);

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

export function useUIContext() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUIContext must be used within UIProvider');
  return ctx;
}
