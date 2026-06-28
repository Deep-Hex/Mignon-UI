import React from 'react';
import { ChevronDown, Crop, Check } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { LOCAL_STORAGE_PREFIX } from '../../../config';

export default function SlidersPanel({
  themeConfig,
  onChange,
  isBgSettingsOpen,
  setIsBgSettingsOpen,
  setIsCropModalOpen
}) {
  const { toast } = useToast();

  const [customBgPresets, setCustomBgPresets] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_custom_bg_presets`) || '[]');
    } catch {
      return [];
    }
  });

  const handleFieldChange = (key, value) => {
    onChange({
      ...themeConfig,
      [key]: value
    });
  };

  const handleSaveBgImagePreset = () => {
    if (!themeConfig.useCustomBgImage || !themeConfig.bgImage) return;

    const currentPreset = {
      bgImage: themeConfig.bgImage,
      bgImageOriginal: themeConfig.bgImageOriginal,
      bgImageOpacity: themeConfig.bgImageOpacity !== undefined ? themeConfig.bgImageOpacity : 100,
      bgImageFill: themeConfig.bgImageFill || 'cover'
    };

    const isSaved = customBgPresets.some(p => typeof p === 'object' && p !== null && p.bgImage === themeConfig.bgImage);

    let nextPresets;
    if (isSaved) {
      nextPresets = customBgPresets.filter(p => typeof p !== 'object' || p === null || p.bgImage !== themeConfig.bgImage);
      toast.success("Removed background image preset.");
    } else {
      nextPresets = [currentPreset, ...customBgPresets].slice(0, 14);
      toast.success("Saved background image preset!");
    }

    setCustomBgPresets(nextPresets);
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_custom_bg_presets`, JSON.stringify(nextPresets));
  };

  const isBgImagePresetSaved = () => {
    if (!themeConfig.useCustomBgImage || !themeConfig.bgImage) return false;
    return customBgPresets.some(p => typeof p === 'object' && p !== null && p.bgImage === themeConfig.bgImage);
  };

  return (
    <div className="chat-theme-sliders-column-wrapper">
      <div className="chat-theme-sliders-row">
        {themeConfig.themeId !== 'none' && !themeConfig.useCustomBgImage && (
          <div className="chat-theme-slider-container opacity">
            <span>Line Opacity</span>
            <input
              type="range"
              min="1"
              max="100"
              value={themeConfig.opacity !== undefined ? themeConfig.opacity : 10}
              onChange={(e) => handleFieldChange('opacity', parseInt(e.target.value))}
            />
            <span className="chat-theme-monospace-label">{themeConfig.opacity !== undefined ? themeConfig.opacity : 10}%</span>
          </div>
        )}

        <div className="chat-theme-slider-container vignette">
          <span>Vignette Depth</span>
          <input
            type="range"
            min="0"
            max="200"
            value={themeConfig.vignette !== undefined ? themeConfig.vignette : 40}
            onChange={(e) => handleFieldChange('vignette', parseInt(e.target.value))}
          />
          <span className="chat-theme-monospace-label">{themeConfig.vignette !== undefined ? themeConfig.vignette : 40}px</span>
        </div>
      </div>

      {themeConfig.useCustomBgImage && themeConfig.bgImage && (
        <div className="chat-theme-sliders-dropdown-section">
          <button
            type="button"
            className="chat-theme-sliders-dropdown-toggle"
            onClick={() => setIsBgSettingsOpen(!isBgSettingsOpen)}
          >
            <span>Custom Background Settings</span>
            <ChevronDown className={`chevron-icon ${isBgSettingsOpen ? 'open' : ''}`} size={16} />
          </button>

          {isBgSettingsOpen && (
            <div className="chat-theme-sliders-dropdown-content horizontal">
              {/* Opacity Control */}
              <div className="chat-theme-slider-container opacity bg-opacity-adjust">
                <span>Image Opacity</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={themeConfig.bgImageOpacity !== undefined ? themeConfig.bgImageOpacity : 100}
                  onChange={(e) => handleFieldChange('bgImageOpacity', parseInt(e.target.value))}
                />
                <span className="chat-theme-monospace-label">
                  {themeConfig.bgImageOpacity !== undefined ? themeConfig.bgImageOpacity : 100}%
                </span>
              </div>

              {/* Fill Method Dropdown */}
              <div className="chat-theme-fill-dropdown-wrapper">
                <span>Fill Method</span>
                <select
                  value={themeConfig.bgImageFill || 'cover'}
                  onChange={(e) => handleFieldChange('bgImageFill', e.target.value)}
                  className="chat-theme-fill-select"
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="stretch">Stretch</option>
                  <option value="tile">Tile</option>
                </select>
              </div>

              {/* Crop Trigger Button */}
              <button
                type="button"
                onClick={() => setIsCropModalOpen(true)}
                className="chat-theme-bg-crop-icon-btn"
                title="Crop Background Image"
              >
                <Crop size={16} />
              </button>

              {/* Save Custom Background Image Preset */}
              <button
                type="button"
                onClick={handleSaveBgImagePreset}
                className="chat-theme-bg-crop-icon-btn"
                title="Save Custom Background Image Preset"
              >
                <Check size={16} className={isBgImagePresetSaved() ? 'saved' : ''} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
