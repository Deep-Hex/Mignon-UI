/* eslint-disable react-hooks/set-state-in-effect */
import React from 'react';
import { useUIContext }        from '../../context/UIContext';
import { useCharacterContext } from '../../context/CharacterContext';
import { useLoreWorldContext } from '../../context/LoreWorldContext';
import { useToast }            from '../../context/ToastContext';
import { 
  Plus, Edit3, X, Image as ImageIcon, Download,
  Star, Globe, Copy, Skull
} from 'lucide-react';

export default function CharacterModal({ isOpen }) {
  const ui    = useUIContext();
  const chars = useCharacterContext();
  const lw    = useLoreWorldContext();
  const { toast, showConfirm } = useToast();

  const [isFavorited, setIsFavorited] = React.useState(false);
  const [tags, setTags] = React.useState([]);
  const [tagInputValue, setTagInputValue] = React.useState('');
  const [showWorldDropdown, setShowWorldDropdown] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowWorldDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Helper to extract tags from personality text
  const parseTagsFromPersonality = (personalityText) => {
    if (!personalityText) return { tags: [], cleanPersonality: "" };
    const match = personalityText.match(/\[Tags:\s*([^\]]*)\]/);
    if (match) {
      const tagsStr = match[1];
      const tagsList = tagsStr.split(',').map(t => t.trim()).filter(t => t);
      const cleanPersonality = personalityText.replace(/\[Tags:\s*[^\]]*\]\n?/, '').trim();
      return { tags: tagsList, cleanPersonality };
    }
    return { tags: [], cleanPersonality: personalityText };
  };

  // Helper to serialize tags back into personality text
  const serializeTagsIntoPersonality = (personalityText, tagsArray) => {
    const cleanText = personalityText ? personalityText.replace(/\[Tags:\s*[^\]]*\]\n?/, '').trim() : '';
    if (tagsArray.length === 0) return cleanText;
    const tagsStr = `[Tags: ${tagsArray.join(', ')}]`;
    return `${tagsStr}\n\n${cleanText}`.trim();
  };

  // Sync tags and strip them from the displayed personality input when card data loads
  React.useEffect(() => {
    if (isOpen) {
      const { tags: parsedTags, cleanPersonality } = parseTagsFromPersonality(chars.characterForm.personality);
      setTags(parsedTags);
      if (chars.characterForm.personality !== cleanPersonality) {
        chars.setCharacterForm(prev => ({
          ...prev,
          personality: cleanPersonality
        }));
      }
    } else {
      setTags([]);
      setTagInputValue('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, chars.characterForm.id]);

  if (!isOpen) return null;

  // Real-time token estimator based on ~4 chars per token ratio
  const estimateTokens = (text) => {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  };

  const nameTokens = estimateTokens(chars.characterForm.name);
  const greetingTokens = estimateTokens(chars.characterForm.greeting);
  const personaTokens = estimateTokens(chars.characterForm.personality);
  const scenarioTokens = estimateTokens(chars.characterForm.scenario);
  const dialogueTokens = estimateTokens(chars.characterForm.example_dialogue);
  const totalTokens = nameTokens + greetingTokens + personaTokens + scenarioTokens + dialogueTokens;

  // Handles client-side Tavern JSON card export
  const handleExportCardJson = (e) => {
    e.preventDefault();
    if (!chars.characterForm.name) {
      toast.error("Please enter a character name before exporting.");
      return;
    }
    // Embed tags inside personality for export
    const finalPersonality = serializeTagsIntoPersonality(chars.characterForm.personality, tags);
    const exportForm = {
      ...chars.characterForm,
      personality: finalPersonality
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportForm, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${chars.characterForm.name.toLowerCase()}_tavern_card.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success(`${chars.characterForm.name} card exported successfully!`);
  };

  // Handles cloning character card
  const handleCloneCharacter = async (e) => {
    e.preventDefault();
    try {
      const finalPersonality = serializeTagsIntoPersonality(chars.characterForm.personality, tags);
      const clonedForm = {
        ...chars.characterForm,
        id: null, // clear ID to create new
        name: `${chars.characterForm.name} (Copy)`,
        personality: finalPersonality
      };
      await chars.handleCharacterSubmit(clonedForm);
      toast.success(`Cloned ${chars.characterForm.name} successfully!`);
      ui.setActiveModal(null);
    } catch (err) {
      toast.error(`Clone failed: ${err.message}`);
    }
  };

  // Handles deleting character directly from form
  const handleDeleteCharacter = async (e) => {
    e.preventDefault();
    const ok = await showConfirm(`Are you sure you want to delete ${chars.characterForm.name}?`);
    if (!ok) return;
    try {
      await chars.handleDeleteCharacter(chars.characterForm.id);
      toast.success(`${chars.characterForm.name} deleted.`);
      ui.setActiveModal(null);
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  // Handles tag additions
  const handleAddTag = () => {
    if (!tagInputValue.trim()) return;
    const rawTags = tagInputValue.split(',');
    const newTags = [...tags];
    let addedAny = false;

    rawTags.forEach(t => {
      const cleanTag = t.trim().toLowerCase();
      if (cleanTag && !newTags.includes(cleanTag)) {
        newTags.push(cleanTag);
        addedAny = true;
      }
    });

    if (addedAny) {
      setTags(newTags);
    }
    setTagInputValue('');
  };

  // Handles tag deletions
  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="modal-backdrop active" id="modal-character">
      <div className="modal-box large glassmorphism scale-in">
        <div className="modal-header">
          <h2 id="char-modal-title">
            {chars.characterForm.id ? <Edit3 size={18} /> : <Plus size={18} />} 
            {chars.characterForm.id ? ' Edit Character' : ' Create Character'}
          </h2>
          <button type="button" className="modal-close-btn" onClick={() => ui.setActiveModal(null)}>
            <X size={18} />
          </button>
        </div>
        <form 
          id="character-form" 
          onSubmit={async (e) => { 
            e.preventDefault(); 
            try { 
              // Automatically include any pending tags that are typed but not explicitly added yet
              let finalTags = [...tags];
              if (tagInputValue.trim()) {
                const pendingTags = tagInputValue.split(',');
                pendingTags.forEach(t => {
                  const cleanTag = t.trim().toLowerCase();
                  if (cleanTag && !finalTags.includes(cleanTag)) {
                    finalTags.push(cleanTag);
                  }
                });
              }

              const finalPersonality = serializeTagsIntoPersonality(chars.characterForm.personality, finalTags);
              const submissionForm = {
                ...chars.characterForm,
                personality: finalPersonality
              };
              await chars.handleCharacterSubmit(submissionForm); 
              ui.setActiveModal(null); 
            } catch (err) { 
              toast.error(`Save failed: ${err.message}`); 
            } 
          }}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
          <div className="modal-body scrollbar-custom" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', padding: 0 }}>
            <div className="form-split-layout" style={{ display: 'flex', flex: 1, minHeight: 0, height: '100%' }}>
              {/* Left Column: Identity, Tags & Actions */}
              <div className="form-column form-column-left">
                
                <div className="identity-card">
                  {/* Left Side: Avatar Upload Container */}
                  <div className="avatar-upload-wrapper">
                    <div 
                      className="avatar-upload-box" 
                      id="char-avatar-container"
                      onClick={() => document.getElementById("char-avatar-input").click()}
                      title="Upload Avatar"
                      style={{ cursor: 'pointer' }}
                    >
                      {chars.characterForm.avatar ? (
                        <img id="char-avatar-preview" src={chars.characterForm.avatar} alt="Preview" style={{ display: 'block' }} />
                      ) : (
                        <ImageIcon className="placeholder-icon" size={24} />
                      )}
                      <input 
                        type="file" 
                        id="char-avatar-input" 
                        accept="image/*" 
                        style={{ display: 'none' }}
                        onChange={chars.handleAvatarFileChange}
                      />
                    </div>
                    {chars.characterForm.avatar && (
                      <button
                        type="button"
                        className="remove-avatar-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          chars.setCharacterForm(prev => ({ ...prev, avatar: null }));
                        }}
                      >
                        Remove Image
                      </button>
                    )}
                  </div>

                  {/* Right Side: Name & SillyTavern Button Row */}
                  <div className="identity-details-wrapper">
                    <div className="form-group flex-fill" style={{ marginBottom: 0 }}>
                      <label htmlFor="char-name">Character Name</label>
                      <input 
                        type="text" 
                        id="char-name" 
                        required 
                        placeholder="e.g., Seraphina, Lyra..."
                        value={chars.characterForm.name}
                        onChange={(e) => chars.setCharacterForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    
                    {/* SillyTavern Toolbar Mini Buttons */}
                    <div className="card-action-bar" style={{ display: 'flex', gap: '4px', marginTop: '4px', width: '100%' }}>
                      {/* Star Button */}
                      <button 
                        type="button" 
                        className="mini-silly-btn"
                        title="Favorite Character"
                        onClick={() => {
                          setIsFavorited(!isFavorited);
                          toast.success(isFavorited ? "Removed from favorites." : "Added to favorites!");
                        }}
                        style={{ color: isFavorited ? 'var(--pink)' : 'var(--text)' }}
                      >
                        <Star size={16} />
                      </button>

                      {/* World Config with Dropdown */}
                      <div className="world-dropdown-container" ref={dropdownRef} style={{ position: 'relative', display: 'flex', flex: 1, minWidth: 0 }}>
                        <button 
                          type="button" 
                          className="mini-silly-btn enabled"
                          title="Associate / Manage World"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowWorldDropdown(!showWorldDropdown);
                          }}
                          style={{ color: chars.characterForm.world_id ? 'var(--pink)' : 'var(--text)', width: '100%' }}
                        >
                          <Globe size={16} />
                        </button>
                        
                        {showWorldDropdown && (
                          <div className="world-select-popover scrollbar-custom" style={{
                            position: 'absolute',
                            top: '100%',
                            left: '0',
                            marginTop: '6px',
                            background: 'var(--bg-window)',
                            border: 'var(--border-width) solid var(--border)',
                            borderRadius: 'var(--r-sm)',
                            boxShadow: 'var(--shadow-sm)',
                            padding: '8px',
                            zIndex: 1000,
                            minWidth: '220px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-sec)', padding: '2px 4px', borderBottom: '1px dashed var(--border)', marginBottom: '4px', fontFamily: 'var(--font-head)', fontWeight: 'bold' }}>
                              ASSOCIATE WORLD
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                chars.setCharacterForm(prev => ({ ...prev, world_id: null }));
                                setShowWorldDropdown(false);
                                toast.success("Set as Standalone Character (No World).");
                              }}
                              style={{
                                background: !chars.characterForm.world_id ? 'var(--purple)' : 'none',
                                color: 'var(--text)',
                                border: 'none',
                                padding: '6px 8px',
                                borderRadius: 'var(--r-xs)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.78rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <span>Standalone (No World)</span>
                              {!chars.characterForm.world_id && <span>✦</span>}
                            </button>

                            {lw.worlds.map(w => {
                              const isActive = chars.characterForm.world_id === w.id;
                              return (
                                <button
                                  key={w.id}
                                  type="button"
                                  onClick={() => {
                                    chars.setCharacterForm(prev => ({ ...prev, world_id: w.id }));
                                    setShowWorldDropdown(false);
                                    toast.success(`Associated with world: ${w.name}`);
                                  }}
                                  style={{
                                    background: isActive ? 'var(--purple)' : 'none',
                                    color: 'var(--text)',
                                    border: 'none',
                                    padding: '6px 8px',
                                    borderRadius: 'var(--r-xs)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '0.78rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}
                                >
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{w.name}</span>
                                  {isActive && <span>✦</span>}
                                </button>
                              );
                            })}

                          </div>
                        )}
                      </div>

                      {/* Copy (Duplicate Character Card) */}
                      <button 
                        type="button" 
                        className="mini-silly-btn"
                        title="Duplicate/Clone Character"
                        disabled={!chars.characterForm.id}
                        onClick={handleCloneCharacter}
                      >
                        <Copy size={16} />
                      </button>

                      {/* Download (Export JSON) */}
                      <button 
                        type="button" 
                        className="mini-silly-btn"
                        title="Export JSON Tavern Card"
                        onClick={handleExportCardJson}
                      >
                        <Download size={16} />
                      </button>

                      {/* Skull (Delete Character) */}
                      <button 
                        type="button" 
                        className="mini-silly-btn danger"
                        title="Delete Character Card"
                        disabled={!chars.characterForm.id}
                        onClick={handleDeleteCharacter}
                      >
                        <Skull size={16} />
                      </button>
                    </div>

                    {/* Live Token Count Banner */}
                    <div style={{ margin: '8px 0 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', fontFamily: 'var(--font-code)', fontSize: '0.82rem', borderTop: '1px dashed var(--border)', width: '100%', paddingTop: '8px' }}>
                      <span style={{ color: 'var(--text)', fontWeight: 'bold' }}>
                        {totalTokens} Tokens (Estimated)
                      </span>
                      <span style={{ color: 'var(--text-sec)', fontSize: '0.74rem' }}>
                        ({nameTokens + personaTokens + scenarioTokens} Permanent)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Character Tags Management (SillyTavern Style) */}
                <div className="form-group" style={{ marginTop: '16px' }}>
                  {/* Render active tag badges first (above the input box) */}
                  {tags.length > 0 && (
                    <div className="tag-badges-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {tags.map((t, idx) => (
                        <span key={idx} className="silly-tag-badge">
                          {t}
                          <button 
                            type="button" 
                            className="remove-tag-btn" 
                            title={`Remove tag: ${t}`}
                            onClick={() => handleRemoveTag(t)}
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Search / Create Tag Input Box */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      id="tag-input" 
                      placeholder="Search / Create tags..." 
                      value={tagInputValue}
                      onChange={(e) => setTagInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <button 
                      type="button" 
                      className="primary-btn" 
                      onClick={handleAddTag}
                      style={{ padding: '0 16px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* NSFW Toggle Option */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', marginBottom: tags.includes('nsfw') ? '4px' : '16px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }}>
                  <label htmlFor="char-nsfw-toggle" style={{ fontSize: '0.9rem', fontFamily: 'var(--font-code)', fontWeight: 'bold', color: 'var(--text)', cursor: 'pointer' }}>
                    Allow NSFW
                  </label>
                  <label className="switch" style={{ flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      id="char-nsfw-toggle"
                      checked={tags.includes('nsfw')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (!tags.includes('nsfw')) {
                            setTags([...tags, 'nsfw']);
                            chars.setCharacterForm(prev => ({ ...prev, nsfw_inject: false }));
                          }
                        } else {
                          setTags(tags.filter(t => t !== 'nsfw'));
                          chars.setCharacterForm(prev => ({ ...prev, nsfw_inject: false }));
                        }
                      }}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                {/* Conditional NSFW Prompt Injection Toggle */}
                {tags.includes('nsfw') && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', marginBottom: '16px', paddingLeft: '16px' }} data-testid="nsfw-inject-container">
                    <label htmlFor="char-nsfw-inject-toggle" style={{ fontSize: '0.82rem', fontFamily: 'var(--font-code)', color: 'var(--text-sec)', cursor: 'pointer' }}>
                      NSFW Prompt Injection
                    </label>
                    <label className="switch" style={{ flexShrink: 0, transform: 'scale(0.85)' }}>
                      <input
                        type="checkbox"
                        id="char-nsfw-inject-toggle"
                        checked={!!chars.characterForm.nsfw_inject}
                        onChange={(e) => {
                          chars.setCharacterForm(prev => ({ ...prev, nsfw_inject: e.target.checked }));
                        }}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                )}

                {/* Spacer to push buttons to the bottom, aligning them with the right column */}
                <div style={{ flex: 1 }} />

                {/* Form Actions (Save & Cancel) */}
                <div className="form-actions-left" style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button 
                    type="submit" 
                    className="primary-btn"
                    style={{ flex: 1, padding: '10px 24px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                  >
                    Save Character
                  </button>
                  <button 
                    type="button" 
                    className="secondary-btn" 
                    onClick={() => ui.setActiveModal(null)}
                    style={{ padding: '10px 20px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '90px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Right Column: Persona & Behavior */}
              {/* Available textarea height = 90vh - 56px header - 48px col padding - 48px gaps - 144px labels = calc(90vh - 296px) */}
              <div className="form-column form-column-right scrollbar-custom">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="char-personality">Persona / Description</label>
                  <textarea 
                    id="char-personality" 
                    placeholder="Describe their history, body, desires, quirks, voice, and hidden depths..."
                    value={chars.characterForm.personality}
                    onChange={(e) => chars.setCharacterForm(prev => ({ ...prev, personality: e.target.value }))}
                    style={{ height: 'calc((90vh - 296px) * 5 / 13)', minHeight: '80px', resize: 'vertical' }}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="char-scenario">Scenario / Situation</label>
                  <textarea 
                    id="char-scenario" 
                    placeholder="Set the scene — where are you both, what just happened?"
                    value={chars.characterForm.scenario}
                    onChange={(e) => chars.setCharacterForm(prev => ({ ...prev, scenario: e.target.value }))}
                    style={{ height: 'calc((90vh - 296px) * 2 / 13)', minHeight: '50px', resize: 'vertical' }}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="char-greeting">Opening Line / First Message</label>
                  <textarea 
                    id="char-greeting" 
                    placeholder="The first thing they say when the scene begins..."
                    value={chars.characterForm.greeting}
                    onChange={(e) => chars.setCharacterForm(prev => ({ ...prev, greeting: e.target.value }))}
                    style={{ height: 'calc((90vh - 296px) * 3 / 13)', minHeight: '60px', resize: 'vertical' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="char-dialogue">Example Dialogue (Optional)</label>
                  <textarea 
                    id="char-dialogue" 
                    placeholder="&lt;START&gt;&#10;&lt;User&gt;: Hello&#10;Seraphina: *looks up with lidded eyes* You came..."
                    value={chars.characterForm.example_dialogue}
                    onChange={(e) => chars.setCharacterForm(prev => ({ ...prev, example_dialogue: e.target.value }))}
                    style={{ height: 'calc((90vh - 296px) * 3 / 13)', minHeight: '60px', resize: 'vertical' }}
                  />
                </div>
              </div>
          </div>
        </div>
      </form>
    </div>
  </div>
  );
}
