import { useUIContext }        from '../../context/UIContext';
import { useSettingsContext }  from '../../context/SettingsContext';
import { useCharacterContext } from '../../context/CharacterContext';
import { useChatContext }      from '../../context/ChatContext';
import { User as UserIcon, X, Sparkles, ChevronRight } from 'lucide-react';

export default function PersonaPickerModal({ isOpen }) {
  const ui       = useUIContext();
  const settings = useSettingsContext();
  const chars    = useCharacterContext();
  const chat     = useChatContext();

  if (!isOpen) return null;

  const s = settings.settings;
  const customPersonaName = s?.persona_name || 'User';
  const customPersonaAvatar = s?.persona_avatar || null;
  const currentPersonaCharId = settings.settingsForm.persona_character_id;

  return (
    <div className="modal-backdrop active" id="modal-persona-picker">
      <div
        className="modal-box glassmorphism scale-in"
        style={{ maxWidth: '480px' }}
      >
        <div className="modal-header">
          <h2><Sparkles size={18} /> Who are you playing as?</h2>
          <button
            className="modal-close-btn"
            title="Skip — keep current persona"
            onClick={() => chat.handlePersonaPickerSkip(ui.setActiveModal, ui.setActiveWorldDetail, ui.setActiveTab)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body scrollbar-custom" style={{ padding: '20px' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-sec)', marginBottom: '16px', lineHeight: '1.5' }}>
            Select the persona you want to play as for this chat session.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* Custom Persona Option */}
            <button
              type="button"
              id="persona-pick-custom"
              className="persona-pick-card"
              data-active={currentPersonaCharId === null ? 'true' : 'false'}
              onClick={() => chat.handlePersonaPickerConfirm(null, s, ui.setActiveModal, ui.setActiveWorldDetail, ui.setActiveTab)}
            >
              <div className="char-avatar" style={{ width: '48px', height: '48px', flexShrink: 0 }}>
                {customPersonaAvatar
                  ? <img src={customPersonaAvatar} alt={customPersonaName} />
                  : <UserIcon size={20} />}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 'bold', fontSize: '0.95rem' }}>
                  {customPersonaName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-sec)', marginTop: '2px' }}>
                  Custom Persona
                </div>
              </div>
              {currentPersonaCharId === null && (
                <span style={{
                  fontSize: '0.7rem', fontFamily: 'var(--font-head)', fontWeight: 'bold',
                  background: 'var(--primary)', color: 'var(--primary-text)',
                  padding: '2px 8px', borderRadius: 'var(--r-sm)', border: 'var(--border-width) solid var(--border)'
                }}>Active</span>
              )}
              <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>

            {/* Character Options */}
            {chars.characters.length > 0 && (
              <>
                <div style={{
                  fontSize: '0.72rem', fontFamily: 'var(--font-head)', fontWeight: 'bold',
                  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                  paddingLeft: '2px', marginTop: '4px'
                }}>
                  Play as a Character
                </div>
                {chars.characters.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    id={`persona-pick-char-${c.id}`}
                    className="persona-pick-card"
                    data-active={currentPersonaCharId === c.id ? 'true' : 'false'}
                    onClick={() => chat.handlePersonaPickerConfirm(c.id, s, ui.setActiveModal, ui.setActiveWorldDetail, ui.setActiveTab)}
                  >
                    <div className="char-avatar" style={{ width: '48px', height: '48px', flexShrink: 0 }}>
                      {c.avatar ? <img src={c.avatar} alt={c.name} /> : <UserIcon size={20} />}
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 'bold', fontSize: '0.95rem' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-sec)', marginTop: '2px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px'
                      }}>
                        {c.personality || 'No description.'}
                      </div>
                    </div>
                    {currentPersonaCharId === c.id && (
                      <span style={{
                        fontSize: '0.7rem', fontFamily: 'var(--font-head)', fontWeight: 'bold',
                        background: 'var(--primary)', color: 'var(--primary-text)',
                        padding: '2px 8px', borderRadius: 'var(--r-sm)', border: 'var(--border-width) solid var(--border)'
                      }}>Active</span>
                    )}
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Skip button */}
          <button
            type="button"
            id="persona-pick-skip"
            className="secondary-btn full-width"
            style={{ marginTop: '20px', fontSize: '0.85rem' }}
            onClick={() => chat.handlePersonaPickerSkip(ui.setActiveModal, ui.setActiveWorldDetail, ui.setActiveTab)}
          >
            Skip — Use Current Persona
          </button>
        </div>
      </div>
    </div>
  );
}
