import { useState, useEffect, useRef } from 'react';
import { useUIContext } from '../../context/UIContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { Settings as SettingsIcon, X, Smile, Plus, User as UserIcon, Sparkles, Sun, Moon } from 'lucide-react';

export default function SettingsModal({ isOpen }) {
  const ui = useUIContext();
  const settings = useSettingsContext();
  const { toast } = useToast();
  const [isEditingStickers, setIsEditingStickers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const personaAvatarInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleStateChange = (e) => {
      setIsEditingStickers(e.detail.isEditingMode);
    };
    window.addEventListener('sticker-state-changed', handleStateChange);
    window.dispatchEvent(new CustomEvent('sticker-request-state'));
    return () => {
      window.removeEventListener('sticker-state-changed', handleStateChange);
    };
  }, [isOpen]);

  const handlePersonaAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      settings.setSettingsForm(prev => ({ ...prev, persona_avatar: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleClose = () => {
    if (isSaving) return;
    settings.resetForm();
    ui.setActiveModal(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop active"
      id="modal-settings"
      onClick={(e) => {
        if (e.target.id === 'modal-settings') {
          handleClose();
        }
      }}
    >
      <div className="modal-box glassmorphism scale-in">
        <div className="modal-header">
          <h2><SettingsIcon size={18} /> System Settings</h2>
          <button className="modal-close-btn" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body scrollbar-custom">
          <form id="settings-form" onSubmit={async (e) => {
            e.preventDefault();
            if (isSaving) return;
            setIsSaving(true);
            try {
              await settings.handleSettingsSubmit(settings.settingsForm);
              toast.success('Settings updated successfully!');
              ui.setActiveModal(null);
            } catch {
              toast.error('Error sending settings update.');
            } finally {
              setIsSaving(false);
            }
          }}>
            <fieldset disabled={isSaving} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>

              {/* ── LLM PROVIDER ── */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ marginBottom: 0 }}>AI LLM Provider</label>
                  <span className={`status-badge ${settings.engineOnline ? 'online' : 'offline'}`} style={{
                    fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '3px 8px', borderRadius: 'var(--r-sm)', border: 'var(--border-width) solid var(--border)',
                    background: settings.engineOnline ? 'var(--blue)' : 'var(--pink)', color: '#000', fontWeight: 'bold',
                    boxShadow: '2px 2px 0px rgba(0,0,0,1)'
                  }}>
                    <span style={{
                      background: settings.engineOnline ? '#00ffcc' : '#ff4a7d',
                      width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block',
                      boxShadow: settings.engineOnline ? '0 0 8px #00ffcc' : 'none'
                    }}></span>
                    {settings.engineOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <select
                  id="setting-provider"
                  value={settings.settingsForm.provider}
                  onChange={(e) => settings.handleSettingsProviderChange(e.target.value)}
                >
                  <option value="ollama">Local Ollama</option>
                  <option value="kobold">Local Kobold.cpp</option>
                  <option value="custom">Custom (LM Studio / OpenAI compatible)</option>
                  <option value="openrouter">Cloud OpenRouter</option>
                </select>
              </div>

              {settings.settingsForm.provider === "openrouter" && (
                <>
                  <div className="form-group" id="group-openrouter-key">
                    <label>OpenRouter API Key</label>
                    <input
                      type="password"
                      id="setting-openrouter-key"
                      placeholder="sk-or-v1-..."
                      value={settings.settingsForm.openrouter_key}
                      onChange={(e) => settings.setSettingsForm(prev => ({ ...prev, openrouter_key: e.target.value }))}
                    />
                    <small className="help-text">Your key is stored locally in SQLite only.</small>
                  </div>
                  <div className="form-group" id="group-cloud-rate-limit">
                    <label>Cloud Generation Rate Limit</label>
                    <select
                      id="setting-cloud-rate-limit"
                      value={settings.settingsForm.cloud_rate_limit ?? 15}
                      onChange={(e) => settings.setSettingsForm(prev => ({ ...prev, cloud_rate_limit: parseInt(e.target.value) }))}
                    >
                      <option value="5">5 requests/min (Very Safe)</option>
                      <option value="10">10 requests/min (Safe)</option>
                      <option value="15">15 requests/min (Normal)</option>
                      <option value="30">30 requests/min (Fast)</option>
                      <option value="0">Unlimited (Warning: Bill Shock risk)</option>
                    </select>
                    <small className="help-text">Prevents runaway auto-chaining loops from draining your cloud credits.</small>
                  </div>
                </>
              )}

              {settings.settingsForm.provider !== "openrouter" && (
                <div className="form-group" id="group-local-endpoint">
                  <label>Local Endpoint URL</label>
                  <input
                    type="text"
                    id="setting-local-endpoint"
                    placeholder="http://127.0.0.1:11434/v1"
                    value={settings.settingsForm.local_endpoint}
                    onChange={(e) => settings.setSettingsForm(prev => ({ ...prev, local_endpoint: e.target.value }))}
                  />
                  <small className="help-text" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                    <span>Ollama: <code>http://127.0.0.1:11434/v1</code></span>
                    <span>Kobold.cpp: <code>http://127.0.0.1:5001/v1</code></span>
                    <span>LM Studio: <code>http://localhost:1234/v1</code></span>
                  </small>
                </div>
              )}

              <div className="form-group">
                <label>Selected Model Name</label>
                <input
                  type="text"
                  id="setting-selected-model"
                  placeholder="Enter model name..."
                  value={settings.settingsForm.selected_model}
                  onChange={(e) => settings.setSettingsForm(prev => ({ ...prev, selected_model: e.target.value }))}
                />
              </div>



              <div className="form-row">
                <div className="form-group half">
                  <label>Temperature (<span>{settings.settingsForm.temperature}</span>)</label>
                  <input
                    type="range"
                    id="setting-temperature"
                    min="0.1" max="1.5" step="0.05"
                    value={settings.settingsForm.temperature}
                    onChange={(e) => settings.setSettingsForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  />
                </div>
                <div className="form-group half">
                  <label>Max Tokens (<span>{settings.settingsForm.max_tokens}</span>)</label>
                  <input
                    type="range"
                    id="setting-max-tokens"
                    min="128" max="8192" step="128"
                    value={settings.settingsForm.max_tokens}
                    onChange={(e) => settings.setSettingsForm(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Global System Prompt Template</label>
                <textarea
                  id="setting-system-template"
                  rows="5"
                  value={settings.settingsForm.system_template}
                  onChange={(e) => settings.setSettingsForm(prev => ({ ...prev, system_template: e.target.value }))}
                />
                <small className="help-text">Master instructions loaded into model context to define tone, format, and compliance.</small>
              </div>

              {/* ── YOUR PERSONA ── */}
              <div className="form-group" style={{ marginTop: '24px', borderTop: 'var(--border-width) solid var(--border)', paddingTop: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-head)', fontWeight: 'bold', fontSize: '1rem', textTransform: 'uppercase' }}>
                  <Sparkles size={18} /> Your Persona
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-sec)', marginTop: '6px', marginBottom: '14px', lineHeight: '1.4' }}>
                  Define who <em>you</em> are in the roleplay. Bots will address you by this name and react to your backstory.
                </p>

                <div>
                  <div className="form-row align-center" style={{ gap: '16px', marginBottom: '16px' }}>
                    <div
                      id="persona-avatar-upload"
                      className="avatar-upload-box"
                      style={{
                        width: '72px',
                        height: '72px',
                        flexShrink: 0,
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        opacity: isSaving ? 0.6 : 1,
                        pointerEvents: isSaving ? 'none' : 'auto'
                      }}
                      onClick={() => personaAvatarInputRef.current?.click()}
                      title={isSaving ? "Saving..." : "Click to upload avatar"}
                    >
                      {settings.settingsForm.persona_avatar
                        ? <img src={settings.settingsForm.persona_avatar} alt="Persona avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <UserIcon className="placeholder-icon" size={28} />}
                      <input
                        ref={personaAvatarInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handlePersonaAvatarChange}
                      />
                    </div>
                    <div className="form-group flex-fill" style={{ marginBottom: 0 }}>
                      <label>Your Name</label>
                      <input
                        type="text"
                        id="persona-name"
                        placeholder="e.g. Aria, Commander, Kira..."
                        value={settings.settingsForm.persona_name}
                        onChange={(e) => settings.setSettingsForm(prev => ({ ...prev, persona_name: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Backstory / Personality</label>
                    <textarea
                      id="persona-description"
                      rows="4"
                      placeholder="Describe your character's personality, history, quirks..."
                      value={settings.settingsForm.persona_description}
                      onChange={(e) => settings.setSettingsForm(prev => ({ ...prev, persona_description: e.target.value }))}
                    />
                    <small className="help-text">Injected into every system prompt so bots know who they're talking to.</small>
                  </div>
                </div>
              </div>

              {/* ── UI STICKERS ── */}
              <div className="form-group" style={{ marginTop: '24px', borderTop: 'var(--border-width) solid var(--border)', paddingTop: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-head)', fontWeight: 'bold', fontSize: '1rem', textTransform: 'uppercase' }}>
                  <Smile size={18} /> UI Decals &amp; Stickers
                  <span style={{
                    fontSize: '0.62rem',
                    padding: '2px 6px',
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--pink)',
                    color: '#000000',
                    fontWeight: '800',
                    border: '1px solid var(--border)',
                    boxShadow: '1px 1px 0px rgba(0,0,0,1)',
                    marginLeft: '6px',
                    letterSpacing: '0.5px',
                    display: 'inline-block'
                  }}>
                    EXPERIMENTAL
                  </span>
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-sec)', marginTop: '6px', marginBottom: '14px', lineHeight: '1.4' }}>
                  Place transparent anime chibis, borders, badges, or custom decorations anywhere on your workspace!
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => window.dispatchEvent(new CustomEvent('sticker-trigger-upload'))}
                  >
                    <Plus size={14} /> Add Decal
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    style={{
                      flex: 1, padding: '8px 12px', fontSize: '0.8rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      background: isEditingStickers ? 'var(--pink)' : 'var(--blue)'
                    }}
                    onClick={() => window.dispatchEvent(new CustomEvent('sticker-toggle-editing'))}
                  >
                    {isEditingStickers ? "Lock Positions" : "Reposition Decals"}
                  </button>
                </div>
              </div>

              {/* ── THEME & APPEARANCE ── */}
              <div className="form-group" style={{ marginTop: '24px', borderTop: 'var(--border-width) solid var(--border)', paddingTop: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-head)', fontWeight: 'bold', fontSize: '1rem', textTransform: 'uppercase' }}>
                  <Sparkles size={18} /> Theme &amp; Appearance
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-sec)', marginTop: '6px', marginBottom: '14px', lineHeight: '1.4' }}>
                  Customize your workspace design style and color palette.
                </p>

                {/* Mode Selection */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    className={`secondary-btn flex-fill`}
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: ui.theme === 'light' ? 'var(--blue)' : 'var(--bg-input)',
                      color: ui.theme === 'light' ? '#000000' : 'var(--text)',
                      border: 'var(--border-width) solid var(--border)',
                      boxShadow: ui.theme === 'light' ? '2px 2px 0px var(--border)' : 'none',
                      fontWeight: ui.theme === 'light' ? 'bold' : 'normal',
                    }}
                    onClick={() => ui.setTheme('light')}
                  >
                    <Sun size={15} /> Light Mode
                  </button>
                  <button
                    type="button"
                    className={`secondary-btn flex-fill`}
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: ui.theme === 'dark' ? 'var(--pink)' : 'var(--bg-input)',
                      color: ui.theme === 'dark' ? '#000000' : 'var(--text)',
                      border: 'var(--border-width) solid var(--border)',
                      boxShadow: ui.theme === 'dark' ? '2px 2px 0px var(--border)' : 'none',
                      fontWeight: ui.theme === 'dark' ? 'bold' : 'normal',
                    }}
                    onClick={() => ui.setTheme('dark')}
                  >
                    <Moon size={15} /> Dark Mode
                  </button>
                </div>

                {/* Design Family Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {ui.THEMES.map((t) => {
                    const isActive = ui.themeDesign === t.id;
                    const isDark = ui.theme === 'dark';
                    const swatches = {
                      bubblegum: isDark ? ['#e54b7c', '#4ba3e3'] : ['#ffb7ce', '#a3defe'],
                      cyberpunk: ['#ff007f', '#00f0ff'],
                      dollhouse: isDark ? ['#ff1493', '#210035'] : ['#ff1493', '#fff0f5'],
                      builder: isDark ? ['#f5c400', '#00852b'] : ['#d31212', '#0055a5'],
                      classic: isDark ? ['#38bdf8', '#090d16'] : ['#2563eb', '#e2e8f0'],
                      darkyellow: isDark ? ['#f5c400', '#080808'] : ['#f5c400', '#1a1a1c'],
                      sketchbook: isDark ? ['#ffd700', '#18181b'] : ['#fcfaf2', '#2f3e46']
                    }[t.id];

                    return (
                      <div
                        key={t.id}
                        onClick={() => ui.setThemeDesign(t.id)}
                        style={{
                          padding: '12px',
                          borderRadius: 'var(--r-md)',
                          border: 'var(--border-width) solid var(--border)',
                          background: isActive ? 'var(--bg-card-active)' : 'var(--bg-window)',
                          cursor: 'pointer',
                          boxShadow: isActive ? '3px 3px 0px var(--border)' : '1px 1px 0px var(--border)',
                          transform: isActive ? 'translate(-2px, -2px)' : 'none',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                        className="theme-card-option"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text)' }}>
                            {t.name}
                          </span>
                          {isActive && (
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: 'var(--primary)',
                              display: 'block'
                            }} />
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {swatches.map((c, i) => (
                            <span
                              key={i}
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                background: c,
                                border: '1px solid rgba(0,0,0,0.15)',
                                boxShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="primary-btn full-width mt-10"
                disabled={isSaving}
                style={{
                  opacity: isSaving ? 0.7 : 1,
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  );
}
