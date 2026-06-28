/* eslint-disable react-hooks/set-state-in-effect */
import React from 'react';
import { useUIContext } from '../../context/UIContext';
import { useCharacterContext } from '../../context/CharacterContext';
import { useLoreBookContext } from '../../context/LoreBookContext';
import { useToast } from '../../context/ToastContext';
import {
  Plus, Edit3, X, Download,
  BookHeart, Copy, Skull, ChevronDown, ChevronUp,
  User, MessageSquare
} from 'lucide-react';
import { createTavernPngCard } from '../../utils/pngExporter';

// Subcomponents
import TagInput from '../UI/TagInput';
import CharacterAvatarUpload from './CharacterModal/CharacterAvatarUpload';
import CharacterOptionalFields from './CharacterModal/CharacterOptionalFields';
import TokenEstimatorBar from './CharacterModal/TokenEstimatorBar';

const estimateTokens = (text) => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

// Utilities
import { downloadFile } from '../../utils/fileHelper';

export default function CharacterModal({ isOpen }) {
  const ui = useUIContext();
  const chars = useCharacterContext();
  const lw = useLoreBookContext();
  const { toast, showConfirm } = useToast();

  const [tags, setTags] = React.useState([]);
  const [personalityTraits, setPersonalityTraits] = React.useState('');
  const [tagInputValue, setTagInputValue] = React.useState('');
  const [showWorldDropdown, setShowWorldDropdown] = React.useState(false);
  const [showExportDropdown, setShowExportDropdown] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState({
    description: true,
    greeting: false,
    traits: false,
    scenario: false,
    dialogue: false,
    system_prompt: false,
    post_history_instructions: false,
    creator_notes: false,
    creator_details: false,
    alternate_greetings: false
  });
  const [activeOptionalFields, setActiveOptionalFields] = React.useState({
    traits: false,
    scenario: false,
    dialogue: false,
    system_prompt: false,
    post_history_instructions: false,
    creator_notes: false,
    creator_details: false,
    alternate_greetings: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const dropdownRef = React.useRef(null);
  const exportDropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowWorldDropdown(false);
      }
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Helper to extract tags and personality traits from personality text
  const parseMetadataFromPersonality = (personalityText) => {
    if (!personalityText) return { tags: [], traits: "", cleanPersonality: "" };

    let currentText = personalityText;
    let tagsList = [];
    let traitsStr = "";

    // 1. Extract Tags
    const tagsMatch = currentText.match(/\[Tags:\s*([^\]]*)\]/);
    if (tagsMatch) {
      const tagsStr = tagsMatch[1];
      tagsList = tagsStr.split(',').map(t => t.trim()).filter(t => t);
      currentText = currentText.replace(/\[Tags:\s*[^\]]*\]\n?/, '').trim();
    }

    // 2. Extract Personality Traits
    const traitsMatch = currentText.match(/\[Personality:\s*([^\]]*)\]/);
    if (traitsMatch) {
      traitsStr = traitsMatch[1].trim();
      currentText = currentText.replace(/\[Personality:\s*[^\]]*\]\n?/, '').trim();
    } else {
      const alternateMatch = currentText.match(/\[Traits:\s*([^\]]*)\]/);
      if (alternateMatch) {
        traitsStr = alternateMatch[1].trim();
        currentText = currentText.replace(/\[Traits:\s*[^\]]*\]\n?/, '').trim();
      }
    }

    return { tags: tagsList, traits: traitsStr, cleanPersonality: currentText };
  };

  // Helper to serialize tags and personality traits back into personality text
  const serializeMetadataIntoPersonality = (personalityText, tagsArray, traitsStr) => {
    const cleanText = personalityText ? personalityText
      .replace(/\[Tags:\s*[^\]]*\]\n?/, '')
      .replace(/\[Personality:\s*[^\]]*\]\n?/, '')
      .replace(/\[Traits:\s*[^\]]*\]\n?/, '')
      .trim() : '';

    const prefixBlocks = [];
    if (tagsArray.length > 0) {
      prefixBlocks.push(`[Tags: ${tagsArray.join(', ')}]`);
    }
    if (traitsStr && traitsStr.trim()) {
      prefixBlocks.push(`[Personality: ${traitsStr.trim()}]`);
    }

    if (prefixBlocks.length === 0) return cleanText;
    return `${prefixBlocks.join('\n')}\n\n${cleanText}`.trim();
  };

  // Sync tags/traits and strip them from the displayed personality input when card data loads
  React.useEffect(() => {
    if (isOpen) {
      const { tags: parsedTags, traits: parsedTraits, cleanPersonality } = parseMetadataFromPersonality(chars.characterForm.personality);
      setTags(parsedTags);
      setPersonalityTraits(parsedTraits);

      // Initialize active state based on whether fields have existing data
      setActiveOptionalFields({
        traits: !!parsedTraits.trim(),
        scenario: !!chars.characterForm.scenario?.trim(),
        dialogue: !!chars.characterForm.example_dialogue?.trim(),
        system_prompt: !!chars.characterForm.system_prompt?.trim(),
        post_history_instructions: !!chars.characterForm.post_history_instructions?.trim(),
        creator_notes: !!chars.characterForm.creator_notes?.trim(),
        creator_details: !!(chars.characterForm.creator?.trim() || chars.characterForm.character_version?.trim()),
        alternate_greetings: !!(chars.characterForm.alternate_greetings && chars.characterForm.alternate_greetings.length > 0)
      });

      if (chars.characterForm.personality !== cleanPersonality) {
        chars.setCharacterForm(prev => ({
          ...prev,
          personality: cleanPersonality
        }));
      }
    } else {
      setTags([]);
      setPersonalityTraits('');
      setTagInputValue('');
      setActiveOptionalFields({
        traits: false,
        scenario: false,
        dialogue: false,
        system_prompt: false,
        post_history_instructions: false,
        creator_notes: false,
        creator_details: false,
        alternate_greetings: false
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, chars.characterForm.id]);

  if (!isOpen) return null;

  // Handles client-side Tavern Card export (JSON or PNG)
  const handleExportCard = async (e, type = 'json') => {
    e.preventDefault();
    setShowExportDropdown(false);

    if (!chars.characterForm.name) {
      toast.error("Please enter a character name before exporting.");
      return;
    }

    if (type === 'png' && !chars.characterForm.avatar) {
      toast.error("You must upload an avatar image to export a Tavern PNG Card.");
      return;
    }

    // Embed tags & personality traits inside personality for export
    const finalPersonality = serializeMetadataIntoPersonality(chars.characterForm.personality, tags, personalityTraits);
    const exportForm = {
      ...chars.characterForm,
      personality: finalPersonality
    };

    const jsonStr = JSON.stringify(exportForm, null, 2);
    const fileName = `${chars.characterForm.name.toLowerCase()}_tavern_card.${type}`;

    let exportData;
    if (type === 'png') {
      try {
        exportData = await createTavernPngCard(chars.characterForm.avatar, exportForm);
      } catch (err) {
        console.error("Failed to generate PNG card:", err);
        toast.error("Failed to generate PNG card.");
        return;
      }
    } else {
      exportData = jsonStr;
    }

    await downloadFile({
      data: exportData,
      fileName,
      type,
      onSuccess: () => toast.success(`${chars.characterForm.name} card exported!`),
      onError: (err) => {
        if (err.name !== 'AbortError') {
          toast.error(`Export failed: ${err.message || String(err)}`);
        }
      }
    });
  };

  // Handles cloning character card
  const handleCloneCharacter = async (e) => {
    e.preventDefault();
    try {
      const finalPersonality = serializeMetadataIntoPersonality(chars.characterForm.personality, tags, personalityTraits);
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
      toast.error(`Clone failed: ${err.message || String(err)}`);
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
      toast.error(`Delete failed: ${err.message || String(err)}`);
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

              const finalPersonality = serializeMetadataIntoPersonality(chars.characterForm.personality, finalTags, personalityTraits);
              const submissionForm = {
                ...chars.characterForm,
                personality: finalPersonality
              };
              await chars.handleCharacterSubmit(submissionForm);
              ui.setActiveModal(null);
            } catch (err) {
              toast.error(`Save failed: ${err.message || String(err)}`);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
          <div className="modal-body scrollbar-custom" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', padding: 0 }}>
            <div className="form-split-layout" style={{ display: 'flex', flex: 1, minHeight: 0, height: '100%' }}>
              
              {/* Left Column: Identity, Tags & Actions */}
              <div className="form-column form-column-left" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', gap: '16px' }}>

                <div className="identity-card" style={{ flexShrink: 0 }}>
                  
                  {/* Left Side: Avatar Upload Container */}
                  <CharacterAvatarUpload
                    avatar={chars.characterForm.avatar}
                    onFileChange={chars.handleAvatarFileChange}
                    onRemove={() => chars.setCharacterForm(prev => ({ ...prev, avatar: null }))}
                  />

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
                      
                      {/* World Config with Dropdown */}
                      <div className="world-dropdown-container" ref={dropdownRef} style={{ position: 'relative', display: 'flex', flex: 1, minWidth: 0 }}>
                        <button
                          type="button"
                          className="mini-silly-btn enabled"
                          title="Link Lore Book"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowWorldDropdown(!showWorldDropdown);
                          }}
                          style={{ color: chars.characterForm.world_id ? 'var(--pink)' : 'var(--text)', width: '100%' }}
                        >
                          <BookHeart size={16} />
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
                              LINK LORE BOOK
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                chars.setCharacterForm(prev => ({ ...prev, world_id: null }));
                                setShowWorldDropdown(false);
                                toast.success("Set as Standalone Character (No Lore Book).");
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
                              <span>Standalone (No Lore Book)</span>
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
                                    toast.success(`Linked to lore book: ${w.name}`);
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

                      {/* Download (Export Dropdown) */}
                      <div className="world-dropdown-container" ref={exportDropdownRef} style={{ position: 'relative', display: 'flex', flex: 1, minWidth: 0 }}>
                        <button
                          type="button"
                          className="mini-silly-btn"
                          title="Export Character"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowExportDropdown(!showExportDropdown);
                          }}
                          style={{ width: '100%', color: showExportDropdown ? 'var(--pink)' : 'var(--text)' }}
                        >
                          <Download size={16} />
                        </button>

                        {showExportDropdown && (
                          <div className="world-select-popover scrollbar-custom" style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginTop: '6px',
                            background: 'var(--bg-window)',
                            border: 'var(--border-width) solid var(--border)',
                            borderRadius: 'var(--r-sm)',
                            boxShadow: 'var(--shadow-sm)',
                            padding: '8px',
                            zIndex: 1000,
                            minWidth: '130px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}>
                            <button
                              type="button"
                              onClick={(e) => handleExportCard(e, 'json')}
                              style={{
                                background: 'none',
                                color: 'var(--text)',
                                border: 'none',
                                padding: '6px 8px',
                                borderRadius: 'var(--r-xs)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.78rem'
                              }}
                            >
                              Export as JSON
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleExportCard(e, 'png')}
                              style={{
                                background: 'none',
                                color: 'var(--text)',
                                border: 'none',
                                padding: '6px 8px',
                                borderRadius: 'var(--r-xs)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.78rem'
                              }}
                            >
                              Export as PNG Card
                            </button>
                          </div>
                        )}
                      </div>

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
                    <TokenEstimatorBar
                      name={chars.characterForm.name}
                      greeting={chars.characterForm.greeting}
                      personality={chars.characterForm.personality}
                      scenario={chars.characterForm.scenario}
                      exampleDialogue={chars.characterForm.example_dialogue}
                      systemPrompt={chars.characterForm.system_prompt}
                      postHistoryInstructions={chars.characterForm.post_history_instructions}
                      alternateGreetings={chars.characterForm.alternate_greetings}
                      tags={tags}
                      personalityTraits={personalityTraits}
                      serializeMetadataIntoPersonality={serializeMetadataIntoPersonality}
                    />

                  </div>
                </div>

                {/* Scrollable Content Wrapper */}
                <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px', minHeight: 0 }}>
                  
                  {/* Character Tags Management (SillyTavern Style) */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ margin: 0 }}>Character Tags</label>
                      <button
                        type="button"
                        className="text-btn"
                        style={{
                          fontSize: '0.76rem',
                          color: 'var(--pink)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px 6px',
                          borderRadius: 'var(--r-xs)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontFamily: 'var(--font-code)',
                          fontWeight: 'bold',
                          transition: 'opacity 0.2s',
                        }}
                        onClick={async () => {
                          const name = chars.characterForm.name;
                          const personality = chars.characterForm.personality;
                          const scenario = chars.characterForm.scenario;
                          if (!name && !personality) {
                            toast.error("Please provide at least a name or personality description before generating tags.");
                            return;
                          }
                          toast.info("Analyzing character and generating tags...");
                          try {
                            const generated = await chars.handleGenerateTags(name, personality, scenario);
                            const newTags = [...tags];
                            let addedAny = false;
                            generated.forEach(t => {
                              const clean = t.trim().toLowerCase();
                              if (clean && !newTags.includes(clean)) {
                                newTags.push(clean);
                                addedAny = true;
                              }
                            });
                            if (addedAny) {
                              setTags(newTags);
                              toast.success("Successfully generated tags!");
                            } else {
                              toast.info("Generated tags are already present.");
                            }
                          } catch (err) {
                            toast.error(`Failed to generate tags: ${err.message}`);
                          }
                        }}
                      >
                        ✦ Auto-Generate
                      </button>
                    </div>

                    <TagInput
                      tags={tags}
                      tagInputValue={tagInputValue}
                      setTagInputValue={setTagInputValue}
                      onAddTag={handleAddTag}
                      onRemoveTag={handleRemoveTag}
                      inputId="char-tag-input"
                      placeholder="Search or add tags..."
                      helperText="Type multiple tags separated by commas. Press enter or click (+) to add."
                    />
                  </div>
                </div>

                {/* Form Actions (Save) */}
                <div className="form-actions-left" style={{ marginTop: '16px', flexShrink: 0 }}>
                  <button
                    type="submit"
                    className="primary-btn"
                    style={{ width: '100%', padding: '10px 24px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                  >
                    Save Character
                  </button>
                </div>
              </div>

              {/* Right Column: Persona & Behavior */}
              <div className="form-column form-column-right scrollbar-custom" style={{ padding: 0, gap: 0 }}>
                <div className="card-definition-container">
                  {/* Collapsible Section: Character Description */}
                  <div className={`collapsible-card ${expandedSections.description ? 'expanded' : ''}`}>
                    <button
                      type="button"
                      className="collapsible-header"
                      onClick={() => toggleSection('description')}
                    >
                      <div className="header-left">
                        <User size={16} className="header-icon" />
                        <span className="header-title">Character Description</span>
                      </div>
                      <div className="header-right">
                        <span className="token-badge">{estimateTokens(chars.characterForm.personality)} tokens</span>
                        {expandedSections.description ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    <div className="collapsible-content-wrapper">
                      <div className="collapsible-content">
                        <p className="field-desc">
                          The core definition of who this character is. This includes personality traits, background, appearance, and behavior patterns. The AI uses this as the primary reference to understand and roleplay the character consistently.
                        </p>
                        <textarea
                          id="char-personality"
                          placeholder="Describe their history, body, desires, quirks, voice, and hidden depths..."
                          value={chars.characterForm.personality}
                          onChange={(e) => chars.setCharacterForm(prev => ({ ...prev, personality: e.target.value }))}
                          className="collapsible-textarea textarea-desc"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Section: First Message */}
                  <div className={`collapsible-card ${expandedSections.greeting ? 'expanded' : ''}`}>
                    <button
                      type="button"
                      className="collapsible-header"
                      onClick={() => toggleSection('greeting')}
                    >
                      <div className="header-left">
                        <MessageSquare size={16} className="header-icon" />
                        <span className="header-title">First Message</span>
                      </div>
                      <div className="header-right">
                        <span className="token-badge">{estimateTokens(chars.characterForm.greeting)} tokens</span>
                        {expandedSections.greeting ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    <div className="collapsible-content-wrapper">
                      <div className="collapsible-content">
                        <p className="field-desc">
                          The first message or greeting this character sends when beginning a new chat session. Sets the tone, formatting, and initial scenario.
                        </p>
                        <textarea
                          id="char-greeting"
                          placeholder="The first thing they say when the scene begins..."
                          value={chars.characterForm.greeting}
                          onChange={(e) => chars.setCharacterForm(prev => ({ ...prev, greeting: e.target.value }))}
                          className="collapsible-textarea textarea-greeting"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Optional/Collapsible Sections */}
                  <CharacterOptionalFields
                    characterForm={chars.characterForm}
                    setCharacterForm={chars.setCharacterForm}
                    activeOptionalFields={activeOptionalFields}
                    setActiveOptionalFields={setActiveOptionalFields}
                    personalityTraits={personalityTraits}
                    setPersonalityTraits={setPersonalityTraits}
                    expandedSections={expandedSections}
                    setExpandedSections={setExpandedSections}
                    toggleSection={toggleSection}
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
