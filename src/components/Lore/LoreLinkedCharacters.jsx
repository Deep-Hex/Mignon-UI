import React from 'react';
import { User } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';

export default function LoreLinkedCharacters({
  currentWorldId,
  characters,
  worlds,
  onCharacterSubmit,
  toast
}) {
  const [showCharDropdown, setShowCharDropdown] = React.useState(false);
  const [charSearchQuery, setCharSearchQuery] = React.useState('');
  const charDropdownRef = React.useRef(null);

  useClickOutside(charDropdownRef, () => setShowCharDropdown(false));

  const linkedChars = characters.filter(c => c.world_id === currentWorldId);
  const filteredChars = characters.filter(c => 
    c.name.toLowerCase().includes(charSearchQuery.toLowerCase())
  );

  return (
    <div 
      className="world-meta-card interactive" 
      ref={charDropdownRef}
      style={{ flex: '0 0 auto', borderRight: 'var(--border-width) solid var(--border)', position: 'relative' }}
      onClick={() => setShowCharDropdown(!showCharDropdown)}
      title="Linked Characters"
    >
      <div className="avatar-stack" style={{ marginRight: '12px' }}>
        {linkedChars.length === 0 ? (
          <div className="avatar-stack-fallback">
            <User size={14} />
          </div>
        ) : (
          <>
            {linkedChars.slice(0, 3).map((c, idx) => (
              c.avatar ? (
                <img 
                  key={c.id} 
                  src={c.avatar} 
                  alt={c.name} 
                  style={{
                    marginLeft: idx > 0 ? '-10px' : '0px',
                    zIndex: 3 - idx,
                    border: '2px solid var(--bg-window)'
                  }}
                />
              ) : (
                <div 
                  key={c.id} 
                  className="avatar-stack-fallback"
                  style={{
                    marginLeft: idx > 0 ? '-10px' : '0px',
                    zIndex: 3 - idx,
                    fontFamily: 'var(--font-code)',
                    fontSize: '0.72rem',
                    fontWeight: 'bold',
                    border: '2px solid var(--bg-window)'
                  }}
                >
                  {c.name.slice(0, 1).toUpperCase()}
                </div>
              )
            ))}
            {linkedChars.length > 3 && (
              <div className="avatar-stack-text-bubble" style={{ marginLeft: '-10px', zIndex: 0, border: '2px solid var(--bg-window)' }}>
                +{linkedChars.length - 3}
              </div>
            )}
          </>
        )}
      </div>
      
      <div>
        <span className="world-meta-label">Linked Characters</span>
        <span className="world-meta-value">
          {linkedChars.length} {linkedChars.length === 1 ? 'Character' : 'Characters'}
        </span>
      </div>

      {showCharDropdown && (
        <div className="world-char-popover" style={{ left: '0', top: '100%', marginTop: '6px' }} onClick={(e) => e.stopPropagation()}>
          <div className="world-char-popover-title">
            Link Characters
          </div>
          <div className="world-char-popover-search">
            <input 
              type="text" 
              placeholder="Search characters..." 
              value={charSearchQuery}
              onChange={(e) => setCharSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="world-char-grid-scroll scrollbar-custom">
            {filteredChars.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-sec)', padding: '8px', textAlign: 'center' }}>
                No characters found.
              </div>
            ) : (
              <div className="world-char-grid">
                {filteredChars.map(c => {
                  const isLinkedHere = c.world_id === currentWorldId;
                  const isLinkedElsewhere = c.world_id !== null && c.world_id !== currentWorldId;

                  let linkedWorldName = "";
                  if (isLinkedElsewhere) {
                    const w = worlds.find(world => world.id === c.world_id);
                    linkedWorldName = w ? w.name : "another lore book";
                  }

                  return (
                    <div 
                      key={c.id} 
                      className={`world-char-grid-item ${isLinkedHere ? 'linked' : ''} ${isLinkedElsewhere ? 'linked-elsewhere' : ''}`}
                      onClick={async () => {
                        if (isLinkedElsewhere) return;
                        try {
                          const updated = { 
                            ...c, 
                            world_id: isLinkedHere ? null : currentWorldId 
                          };
                          await onCharacterSubmit(updated);
                        } catch (err) {
                          toast.error(`Failed to update character association: ${err.message || String(err)}`);
                        }
                      }}
                      title={isLinkedElsewhere ? `Linked to: ${linkedWorldName}` : c.name}
                    >
                      <div className="world-char-grid-avatar-container">
                        {c.avatar ? (
                          <img src={c.avatar} alt={c.name} className="world-char-grid-avatar" />
                        ) : (
                          <div className="world-char-grid-avatar-fallback">
                            {c.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        {isLinkedHere && (
                          <div className="world-char-grid-check-badge">
                            ✓
                          </div>
                        )}
                      </div>
                      <span className="world-char-grid-name">{c.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
