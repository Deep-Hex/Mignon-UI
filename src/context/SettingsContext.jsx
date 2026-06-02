/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../services/api';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({});
  const [engineStatus, setEngineStatus] = useState('Checking Engine...');
  const [engineOnline, setEngineOnline] = useState(false);

  const [settingsForm, setSettingsForm] = useState({
    provider: 'ollama',
    openrouter_key: '',
    local_endpoint: 'http://127.0.0.1:11434/v1',
    selected_model: '',
    temperature: 0.9,
    max_tokens: 2048,
    system_template: '',
    persona_name: 'User',
    persona_avatar: null,
    persona_description: '',
    persona_character_id: null,
    cloud_rate_limit: 15,
  });

  const _applySettingsToForm = useCallback((data) => {
    setSettingsForm({
      provider: data.provider || 'ollama',
      openrouter_key: data.openrouter_key || '',
      local_endpoint: data.local_endpoint || 'http://127.0.0.1:11434/v1',
      selected_model: data.selected_model || '',
      temperature: data.temperature !== undefined ? data.temperature : 0.9,
      max_tokens: data.max_tokens !== undefined ? data.max_tokens : 2048,
      system_template: data.system_template || '',
      persona_name: data.persona_name || 'User',
      persona_avatar: data.persona_avatar || null,
      persona_description: data.persona_description || '',
      persona_character_id: data.persona_character_id || null,
      cloud_rate_limit: data.cloud_rate_limit !== undefined ? data.cloud_rate_limit : 15,
    });
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.fetchSettings();
      setSettings(data);
      _applySettingsToForm(data);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, [_applySettingsToForm]);

  const checkEngineConnection = useCallback(async () => {
    try {
      const data = await api.testConnection();
      if (data.status === 'success') {
        setEngineOnline(true);
        setEngineStatus(data.message);
        if (data.active_model) {
          setSettings(prev => {
            const modelChanged = prev.selected_model !== data.active_model;
            if (modelChanged) {
              setSettingsForm(form => {
                // Only update form if the user hasn't actively modified it from current settings.selected_model
                if (form.selected_model === prev.selected_model) {
                  return { ...form, selected_model: data.active_model };
                }
                return form;
              });
            }
            return { ...prev, selected_model: data.active_model };
          });
        }
      } else {
        setEngineOnline(false);
        setEngineStatus(data.message || 'Engine Offline');
      }
    } catch {
      setEngineOnline(false);
      setEngineStatus('Engine Offline');
    }
  }, []);

  const handleSettingsSubmit = useCallback(async (form) => {
    const data = await api.saveSettings(form);
    setSettings(data);
    await checkEngineConnection();
    return data;
  }, [checkEngineConnection]);

  const handleSettingsProviderChange = useCallback((providerVal) => {
    setSettingsForm(prev => {
      let { selected_model: model, local_endpoint: endpoint } = prev;
      if (providerVal === 'openrouter') {
        if (!model || ['dolphin-llama3', 'kobold-model'].includes(model)) {
          model = 'nousresearch/hermes-3-llama-3-8b';
        }
      } else if (providerVal === 'kobold') {
        if (!endpoint || endpoint === 'http://127.0.0.1:11434/v1' || endpoint === 'http://localhost:1234/v1') endpoint = 'http://127.0.0.1:5001/v1';
        if (!model || model === 'nousresearch/hermes-3-llama-3-8b') model = 'kobold-model';
      } else if (providerVal === 'custom') {
        if (!endpoint || endpoint === 'http://127.0.0.1:11434/v1' || endpoint === 'http://127.0.0.1:5001/v1') endpoint = 'http://localhost:1234/v1';
        if (!model || ['dolphin-llama3', 'kobold-model', 'nousresearch/hermes-3-llama-3-8b'].includes(model)) {
          model = 'custom-model';
        }
      } else {
        // ollama
        if (!endpoint || endpoint === 'http://127.0.0.1:5001/v1' || endpoint === 'http://localhost:1234/v1') endpoint = 'http://127.0.0.1:11434/v1';
        if (!model || model === 'nousresearch/hermes-3-llama-3-8b' || model === 'kobold-model') model = 'dolphin-llama3';
      }
      return { ...prev, provider: providerVal, selected_model: model, local_endpoint: endpoint };
    });
  }, []);

  const resetForm = useCallback(() => {
    _applySettingsToForm(settings);
  }, [_applySettingsToForm, settings]);

  // Boot sync
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkEngineConnection();
    const interval = setInterval(checkEngineConnection, 15000);
    return () => clearInterval(interval);
  }, [checkEngineConnection]);

  const value = useMemo(() => ({
    settings, setSettings,
    settingsForm, setSettingsForm,
    engineStatus, engineOnline,
    fetchSettings, checkEngineConnection,
    handleSettingsSubmit, handleSettingsProviderChange,
    resetForm,
  }), [
    settings,
    settingsForm,
    engineStatus, engineOnline,
    fetchSettings, checkEngineConnection,
    handleSettingsSubmit, handleSettingsProviderChange,
    resetForm,
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider');
  return ctx;
}
