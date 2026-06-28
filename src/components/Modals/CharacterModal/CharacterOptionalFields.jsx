import { 
  Sparkles, Map, MessageCircle, MessageSquare, Globe, 
  FolderOpen, User, ChevronUp, ChevronDown, Plus, X 
} from 'lucide-react';

const estimateTokens = (text) => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

function RemoveFieldButton({ fieldKey, onRemove, setActiveOptionalFields }) {
  return (
    <span
      role="button"
      className="remove-optional-field-btn"
      title="Remove Field"
      onClick={(e) => {
        e.stopPropagation();
        setActiveOptionalFields(prev => ({ ...prev, [fieldKey]: false }));
        onRemove();
      }}
    >
      <X size={14} />
    </span>
  );
}

export default function CharacterOptionalFields({
  characterForm,
  setCharacterForm,
  activeOptionalFields,
  setActiveOptionalFields,
  personalityTraits,
  setPersonalityTraits,
  expandedSections,
  setExpandedSections,
  toggleSection
}) {
  const scenarioTokens = estimateTokens(characterForm.scenario);
  const dialogueTokens = estimateTokens(characterForm.example_dialogue);
  const systemPromptTokens = estimateTokens(characterForm.system_prompt);
  const postHistoryTokens = estimateTokens(characterForm.post_history_instructions);
  const creatorNotesTokens = estimateTokens(characterForm.creator_notes);
  const alternateGreetingsTokens = (characterForm.alternate_greetings || [])
    .reduce((sum, g) => sum + estimateTokens(g), 0);

  return (
    <>
      {/* Collapsible Section: Personality */}
      {activeOptionalFields.traits && (
        <div className={`collapsible-card ${expandedSections.traits ? 'expanded' : ''}`}>
          <button
            type="button"
            className="collapsible-header"
            onClick={() => toggleSection('traits')}
          >
            <div className="header-left">
              <Sparkles size={16} className="header-icon" />
              <span className="header-title">Personality</span>
            </div>
            <div className="header-right">
              <span className="token-badge">{estimateTokens(personalityTraits)} tokens</span>
              <RemoveFieldButton
                fieldKey="traits"
                onRemove={() => setPersonalityTraits('')}
                setActiveOptionalFields={setActiveOptionalFields}
              />
              {expandedSections.traits ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <div className="collapsible-content-wrapper">
            <div className="collapsible-content">
              <p className="field-desc">
                Short, comma-separated traits or tags defining their personality (e.g. quiet, intelligent, tsundere, kind). These are serialized and stored efficiently.
              </p>
              <input
                type="text"
                id="char-personality-traits"
                placeholder="e.g., quiet, intelligent, tsundere, kind..."
                value={personalityTraits}
                onChange={(e) => setPersonalityTraits(e.target.value)}
                className="collapsible-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Section: Scenario */}
      {activeOptionalFields.scenario && (
        <div className={`collapsible-card ${expandedSections.scenario ? 'expanded' : ''}`}>
          <button
            type="button"
            className="collapsible-header"
            onClick={() => toggleSection('scenario')}
          >
            <div className="header-left">
              <Map size={16} className="header-icon" />
              <span className="header-title">Scenario</span>
            </div>
            <div className="header-right">
              <span className="token-badge">{scenarioTokens} tokens</span>
              <RemoveFieldButton
                fieldKey="scenario"
                onRemove={() => setCharacterForm(prev => ({ ...prev, scenario: '' }))}
                setActiveOptionalFields={setActiveOptionalFields}
              />
              {expandedSections.scenario ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <div className="collapsible-content-wrapper">
            <div className="collapsible-content">
              <p className="field-desc">
                The current situation or environment at the start of the chat. Helps steer the context of the opening scenes.
              </p>
              <textarea
                id="char-scenario"
                placeholder="Set the scene — where are you both, what just happened?"
                value={characterForm.scenario}
                onChange={(e) => setCharacterForm(prev => ({ ...prev, scenario: e.target.value }))}
                className="collapsible-textarea textarea-scenario"
              />
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Section: Example Dialogue */}
      {activeOptionalFields.dialogue && (
        <div className={`collapsible-card ${expandedSections.dialogue ? 'expanded' : ''}`}>
          <button
            type="button"
            className="collapsible-header"
            onClick={() => toggleSection('dialogue')}
          >
            <div className="header-left">
              <MessageCircle size={16} className="header-icon" />
              <span className="header-title">Example Dialogue</span>
            </div>
            <div className="header-right">
              <span className="token-badge">{dialogueTokens} tokens</span>
              <RemoveFieldButton
                fieldKey="dialogue"
                onRemove={() => setCharacterForm(prev => ({ ...prev, example_dialogue: '' }))}
                setActiveOptionalFields={setActiveOptionalFields}
              />
              {expandedSections.dialogue ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <div className="collapsible-content-wrapper">
            <div className="collapsible-content">
              <p className="field-desc">
                Optional example dialogue to teach the model how the character talks. Format using chat patterns like &lt;START&gt;.
              </p>
              <textarea
                id="char-dialogue"
                placeholder="&lt;START&gt;&#10;&lt;User&gt;: Hello&#10;Seraphina: *looks up with lidded eyes* You came..."
                value={characterForm.example_dialogue}
                onChange={(e) => setCharacterForm(prev => ({ ...prev, example_dialogue: e.target.value }))}
                className="collapsible-textarea textarea-dialogue"
              />
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Section: Alternate Greetings */}
      {activeOptionalFields.alternate_greetings && (
        <div className={`collapsible-card ${expandedSections.alternate_greetings ? 'expanded' : ''}`}>
          <button
            type="button"
            className="collapsible-header"
            onClick={() => toggleSection('alternate_greetings')}
          >
            <div className="header-left">
              <MessageSquare size={16} className="header-icon" />
              <span className="header-title">Alternate Greetings</span>
            </div>
            <div className="header-right">
              <span className="token-badge">{alternateGreetingsTokens} tokens</span>
              <RemoveFieldButton
                fieldKey="alternate_greetings"
                onRemove={() => setCharacterForm(prev => ({ ...prev, alternate_greetings: [] }))}
                setActiveOptionalFields={setActiveOptionalFields}
              />
              {expandedSections.alternate_greetings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <div className="collapsible-content-wrapper">
            <div className="collapsible-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p className="field-desc">
                Additional opening messages for starting chats. The user can cycle/swipe through these options in the chat session.
              </p>
              {(characterForm.alternate_greetings || []).map((alt, idx) => (
                <div key={idx} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: idx > 0 ? '1px dashed var(--border)' : 'none', paddingTop: idx > 0 ? '12px' : '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-sec)', fontFamily: 'var(--font-code)', fontWeight: 'bold' }}>
                      Greeting #{idx + 1}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCharacterForm(prev => {
                          const updated = prev.alternate_greetings.filter((_, i) => i !== idx);
                          return { ...prev, alternate_greetings: updated };
                        });
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--pink)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <textarea
                    value={alt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCharacterForm(prev => {
                        const updated = [...prev.alternate_greetings];
                        updated[idx] = val;
                        return { ...prev, alternate_greetings: updated };
                      });
                    }}
                    placeholder="Write greeting option..."
                    className="collapsible-textarea textarea-greeting"
                  />
                </div>
              ))}
              <button
                type="button"
                className="add-field-pill-btn"
                onClick={() => {
                  setCharacterForm(prev => ({
                    ...prev,
                    alternate_greetings: [...(prev.alternate_greetings || []), '']
                  }));
                }}
                style={{ alignSelf: 'flex-start', marginTop: '4px' }}
              >
                <Plus size={12} />
                <span>Add Alternate Greeting</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Section: System Prompt Override */}
      {activeOptionalFields.system_prompt && (
        <div className={`collapsible-card ${expandedSections.system_prompt ? 'expanded' : ''}`}>
          <button
            type="button"
            className="collapsible-header"
            onClick={() => toggleSection('system_prompt')}
          >
            <div className="header-left">
              <Globe size={16} className="header-icon" />
              <span className="header-title">System Prompt Override</span>
            </div>
            <div className="header-right">
              <span className="token-badge">{systemPromptTokens} tokens</span>
              <RemoveFieldButton
                fieldKey="system_prompt"
                onRemove={() => setCharacterForm(prev => ({ ...prev, system_prompt: '' }))}
                setActiveOptionalFields={setActiveOptionalFields}
              />
              {expandedSections.system_prompt ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <div className="collapsible-content-wrapper">
            <div className="collapsible-content">
              <p className="field-desc">
                Overrides the global system prompt template when compiling prompts for this character.
              </p>
              <textarea
                id="char-system-prompt"
                placeholder="Describe how the AI should structure its system instructions for this character..."
                value={characterForm.system_prompt}
                onChange={(e) => setCharacterForm(prev => ({ ...prev, system_prompt: e.target.value }))}
                className="collapsible-textarea"
                style={{ minHeight: '120px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Section: Post-History Instructions */}
      {activeOptionalFields.post_history_instructions && (
        <div className={`collapsible-card ${expandedSections.post_history_instructions ? 'expanded' : ''}`}>
          <button
            type="button"
            className="collapsible-header"
            onClick={() => toggleSection('post_history_instructions')}
          >
            <div className="header-left">
              <Sparkles size={16} className="header-icon" />
              <span className="header-title">Post-History Instructions</span>
            </div>
            <div className="header-right">
              <span className="token-badge">{postHistoryTokens} tokens</span>
              <RemoveFieldButton
                fieldKey="post_history_instructions"
                onRemove={() => setCharacterForm(prev => ({ ...prev, post_history_instructions: '' }))}
                setActiveOptionalFields={setActiveOptionalFields}
              />
              {expandedSections.post_history_instructions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <div className="collapsible-content-wrapper">
            <div className="collapsible-content">
              <p className="field-desc">
                Directives or formatting rules injected at the absolute end of the prompt (after history) to enforce style or character guidelines.
              </p>
              <textarea
                id="char-post-history"
                placeholder="Rules to inject at the bottom of chat history (e.g. Write in third-person past tense only)..."
                value={characterForm.post_history_instructions}
                onChange={(e) => setCharacterForm(prev => ({ ...prev, post_history_instructions: e.target.value }))}
                className="collapsible-textarea"
                style={{ minHeight: '100px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Section: Creator Notes */}
      {activeOptionalFields.creator_notes && (
        <div className={`collapsible-card ${expandedSections.creator_notes ? 'expanded' : ''}`}>
          <button
            type="button"
            className="collapsible-header"
            onClick={() => toggleSection('creator_notes')}
          >
            <div className="header-left">
              <FolderOpen size={16} className="header-icon" />
              <span className="header-title">Creator Notes</span>
            </div>
            <div className="header-right">
              <span className="token-badge">{creatorNotesTokens} tokens</span>
              <RemoveFieldButton
                fieldKey="creator_notes"
                onRemove={() => setCharacterForm(prev => ({ ...prev, creator_notes: '' }))}
                setActiveOptionalFields={setActiveOptionalFields}
              />
              {expandedSections.creator_notes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <div className="collapsible-content-wrapper">
            <div className="collapsible-content">
              <p className="field-desc">
                Additional metadata notes or comments written by the author of this character card.
              </p>
              <textarea
                id="char-creator-notes"
                placeholder="Creator comments, instructions, or recommendations for running this card..."
                value={characterForm.creator_notes}
                onChange={(e) => setCharacterForm(prev => ({ ...prev, creator_notes: e.target.value }))}
                className="collapsible-textarea"
                style={{ minHeight: '100px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Section: Creator Details */}
      {activeOptionalFields.creator_details && (
        <div className={`collapsible-card ${expandedSections.creator_details ? 'expanded' : ''}`}>
          <button
            type="button"
            className="collapsible-header"
            onClick={() => toggleSection('creator_details')}
          >
            <div className="header-left">
              <User size={16} className="header-icon" />
              <span className="header-title">Creator Details</span>
            </div>
            <div className="header-right">
              <RemoveFieldButton
                fieldKey="creator_details"
                onRemove={() => setCharacterForm(prev => ({ ...prev, creator: '', character_version: '' }))}
                setActiveOptionalFields={setActiveOptionalFields}
              />
              {expandedSections.creator_details ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <div className="collapsible-content-wrapper">
            <div className="collapsible-content" style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-sec)', marginBottom: '4px', display: 'block', fontFamily: 'var(--font-code)', fontWeight: 'bold' }}>Creator Name</label>
                <input
                  type="text"
                  placeholder="e.g., Skeleton, Kaji..."
                  value={characterForm.creator}
                  onChange={(e) => setCharacterForm(prev => ({ ...prev, creator: e.target.value }))}
                  className="collapsible-input"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-sec)', marginBottom: '4px', display: 'block', fontFamily: 'var(--font-code)', fontWeight: 'bold' }}>Version</label>
                <input
                  type="text"
                  placeholder="e.g., 1.0.0, v2..."
                  value={characterForm.character_version}
                  onChange={(e) => setCharacterForm(prev => ({ ...prev, character_version: e.target.value }))}
                  className="collapsible-input"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Optional Fields Adder Box */}
      {(!activeOptionalFields.traits ||
        !activeOptionalFields.scenario ||
        !activeOptionalFields.dialogue ||
        !activeOptionalFields.alternate_greetings ||
        !activeOptionalFields.system_prompt ||
        !activeOptionalFields.post_history_instructions ||
        !activeOptionalFields.creator_notes ||
        !activeOptionalFields.creator_details) && (
          <div className="optional-fields-adder" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {!activeOptionalFields.traits && (
                <button
                  type="button"
                  className="add-field-pill-btn"
                  onClick={() => {
                    setActiveOptionalFields(prev => ({ ...prev, traits: true }));
                    setExpandedSections(prev => ({ ...prev, traits: true }));
                  }}
                >
                  <Plus size={12} />
                  <span>Personality</span>
                </button>
              )}
              {!activeOptionalFields.scenario && (
                <button
                  type="button"
                  className="add-field-pill-btn"
                  onClick={() => {
                    setActiveOptionalFields(prev => ({ ...prev, scenario: true }));
                    setExpandedSections(prev => ({ ...prev, scenario: true }));
                  }}
                >
                  <Plus size={12} />
                  <span>Scenario</span>
                </button>
              )}
              {!activeOptionalFields.dialogue && (
                <button
                  type="button"
                  className="add-field-pill-btn"
                  onClick={() => {
                    setActiveOptionalFields(prev => ({ ...prev, dialogue: true }));
                    setExpandedSections(prev => ({ ...prev, dialogue: true }));
                  }}
                >
                  <Plus size={12} />
                  <span>Example Dialogue</span>
                </button>
              )}
              {!activeOptionalFields.alternate_greetings && (
                <button
                  type="button"
                  className="add-field-pill-btn"
                  onClick={() => {
                    setActiveOptionalFields(prev => ({ ...prev, alternate_greetings: true }));
                    setExpandedSections(prev => ({ ...prev, alternate_greetings: true }));
                    setCharacterForm(prev => ({
                      ...prev,
                      alternate_greetings: prev.alternate_greetings?.length > 0 ? prev.alternate_greetings : ['']
                    }));
                  }}
                >
                  <Plus size={12} />
                  <span>Alternate Greetings</span>
                </button>
              )}
              {!activeOptionalFields.system_prompt && (
                <button
                  type="button"
                  className="add-field-pill-btn"
                  onClick={() => {
                    setActiveOptionalFields(prev => ({ ...prev, system_prompt: true }));
                    setExpandedSections(prev => ({ ...prev, system_prompt: true }));
                  }}
                >
                  <Plus size={12} />
                  <span>System Prompt Override</span>
                </button>
              )}
              {!activeOptionalFields.post_history_instructions && (
                <button
                  type="button"
                  className="add-field-pill-btn"
                  onClick={() => {
                    setActiveOptionalFields(prev => ({ ...prev, post_history_instructions: true }));
                    setExpandedSections(prev => ({ ...prev, post_history_instructions: true }));
                  }}
                >
                  <Plus size={12} />
                  <span>Post-History</span>
                </button>
              )}
              {!activeOptionalFields.creator_notes && (
                <button
                  type="button"
                  className="add-field-pill-btn"
                  onClick={() => {
                    setActiveOptionalFields(prev => ({ ...prev, creator_notes: true }));
                    setExpandedSections(prev => ({ ...prev, creator_notes: true }));
                  }}
                >
                  <Plus size={12} />
                  <span>Creator Notes</span>
                </button>
              )}
              {!activeOptionalFields.creator_details && (
                <button
                  type="button"
                  className="add-field-pill-btn"
                  onClick={() => {
                    setActiveOptionalFields(prev => ({ ...prev, creator_details: true }));
                    setExpandedSections(prev => ({ ...prev, creator_details: true }));
                  }}
                >
                  <Plus size={12} />
                  <span>Creator Details</span>
                </button>
              )}
            </div>
          </div>
        )}
    </>
  );
}
