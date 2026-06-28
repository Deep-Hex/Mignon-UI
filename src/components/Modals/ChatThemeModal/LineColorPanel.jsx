import React from 'react';
import { X, Check } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { LOCAL_STORAGE_PREFIX } from '../../../config';
import { 
  STROKE_PRESETS, 
  parseGradient, 
  constructGradientString 
} from '../../../utils/themeHelper';

function PresetButton({ preset, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chat-theme-bg-preset-btn ${isActive ? 'active' : ''}`}
      style={{ background: preset.value }}
      title={preset.name}
    >
      {isActive && (
        <span className={`chat-theme-preset-check ${preset.value === '#ffffff' ? 'dark-check' : ''}`}>
          ✓
        </span>
      )}
    </button>
  );
}

export default function LineColorPanel({ themeConfig, onChange }) {
  const { toast } = useToast();
  
  const [customStrokePresets, setCustomStrokePresets] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_custom_stroke_presets`) || '[]');
    } catch {
      return [];
    }
  });

  const [draggedIndex, setDraggedIndex] = React.useState(null);

  const handleFieldChange = (key, value) => {
    onChange({
      ...themeConfig,
      [key]: value
    });
  };

  const handleSaveStrokePreset = () => {
    const activeColor = themeConfig.strokeColor || '#ff1493';
    if (customStrokePresets.includes(activeColor)) {
      const nextPresets = customStrokePresets.filter(p => p !== activeColor);
      setCustomStrokePresets(nextPresets);
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_custom_stroke_presets`, JSON.stringify(nextPresets));
      toast.success("Removed stroke preset.");
    } else {
      const nextPresets = [activeColor, ...customStrokePresets].slice(0, 14);
      setCustomStrokePresets(nextPresets);
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_custom_stroke_presets`, JSON.stringify(nextPresets));
      toast.success("Saved stroke preset!");
    }
  };

  const isGradient = themeConfig.strokeColor && (
    themeConfig.strokeColor.startsWith('linear-gradient') ||
    themeConfig.strokeColor.startsWith('radial-gradient') ||
    themeConfig.strokeColor.startsWith('conic-gradient')
  );
  const parsed = parseGradient(themeConfig.strokeColor);
  const colors = isGradient ? parsed.colors : [themeConfig.strokeColor || '#ff1493'];

  return (
    <div className="chat-theme-bg-color-presets-panel">
      {/* Presets Row */}
      <div className="chat-theme-color-presets-row scrollbar-custom">
        {/* Custom Saved Stroke Presets */}
        {customStrokePresets.map((presetValue, idx) => {
          const isActive = themeConfig.strokeColor === presetValue;
          return (
            <div key={`custom-stroke-${idx}`} className="chat-theme-bg-preset-btn-wrapper">
              <button
                type="button"
                onClick={() => handleFieldChange('strokeColor', presetValue)}
                className={`chat-theme-bg-preset-btn custom-preset ${isActive ? 'active' : ''}`}
                style={{ background: presetValue }}
                title="Custom Saved Stroke Preset"
              >
                {isActive && (
                  <span className={`chat-theme-preset-check ${presetValue === '#ffffff' ? 'dark-check' : ''}`}>
                    ✓
                  </span>
                )}
              </button>
              <button
                type="button"
                className="chat-theme-custom-preset-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextPresets = customStrokePresets.filter(p => p !== presetValue);
                  setCustomStrokePresets(nextPresets);
                  localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_custom_stroke_presets`, JSON.stringify(nextPresets));
                }}
                title="Delete Custom Preset"
              >
                ×
              </button>
            </div>
          );
        })}

        {/* Standard Curated Presets */}
        {STROKE_PRESETS.map((preset, idx) => (
          <PresetButton
            key={idx}
            preset={preset}
            isActive={themeConfig.strokeColor === preset.value}
            onClick={() => handleFieldChange('strokeColor', preset.value)}
          />
        ))}
      </div>

      {/* Custom Line Color / Gradient Designer Panel */}
      <div className="chat-theme-custom-color-builder">
        <div className="builder-controls-row">
          {colors.map((color, idx) => (
            <div
              key={idx}
              className={`builder-color-bubble-wrapper ${draggedIndex === idx ? 'dragging' : ''}`}
              title={isGradient ? `Drag to reorder - Color Stop ${idx + 1}` : `Color Stop ${idx + 1}`}
              draggable={isGradient}
              onDragStart={(e) => {
                setDraggedIndex(idx);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => {
                if (draggedIndex !== null && draggedIndex !== idx) {
                  const nextColors = [...colors];
                  const [removed] = nextColors.splice(draggedIndex, 1);
                  nextColors.splice(idx, 0, removed);

                  handleFieldChange('strokeColor', constructGradientString(parsed.type, parsed.angle, nextColors));
                  setDraggedIndex(idx);
                }
              }}
              onDragEnd={() => setDraggedIndex(null)}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  const nextColors = [...colors];
                  nextColors[idx] = e.target.value;

                  if (isGradient) {
                    handleFieldChange('strokeColor', constructGradientString(parsed.type, parsed.angle, nextColors));
                  } else {
                    handleFieldChange('strokeColor', e.target.value);
                  }
                }}
              />
              <div
                className="builder-color-bubble"
                style={{ background: color }}
              />

              {colors.length > 1 && (
                <button
                  type="button"
                  className="builder-color-delete-overlay"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const nextColors = colors.filter((_, i) => i !== idx);
                    if (nextColors.length === 1) {
                      handleFieldChange('strokeColor', nextColors[0]);
                    } else {
                      handleFieldChange('strokeColor', constructGradientString(parsed.type, parsed.angle, nextColors));
                    }
                  }}
                  title="Delete Color Stop"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}

          {colors.length < 5 && (
            <button
              type="button"
              className="builder-add-color-btn"
              onClick={() => {
                const defaultStopColors = ['#fbbf24', '#00ffcc', '#8a2387', '#fbbf24'];
                const newColor = defaultStopColors[colors.length - 1] || '#ffffff';
                const nextColors = [...colors, newColor];

                handleFieldChange('strokeColor', constructGradientString(parsed.type, parsed.angle, nextColors));
              }}
              title="Add Color Stop (Extend Gradient)"
            >
              <span>+</span>
            </button>
          )}
        </div>

        <div className="builder-options-group">
          {isGradient && (
            <div className="chat-theme-gradient-method-selector pop-in-animation">
              <div className="method-pill-group">
                {['linear', 'radial', 'conic'].map((m) => {
                  const active = parsed.type === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`method-pill-btn ${active ? 'active' : ''}`}
                      onClick={() => {
                        handleFieldChange('strokeColor', constructGradientString(m, parsed.angle, colors));
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isGradient && parsed.type !== 'radial' && (
            <div className="chat-theme-gradient-angle-slider pop-in-animation">
              <input
                type="range"
                min="0"
                max="360"
                value={parsed.angle}
                onChange={(e) => {
                  handleFieldChange('strokeColor', constructGradientString(parsed.type, parseInt(e.target.value), colors));
                }}
              />
              <span className="chat-theme-monospace-label">{parsed.angle}°</span>
            </div>
          )}

          <button
            type="button"
            className="builder-save-preset-btn"
            onClick={handleSaveStrokePreset}
            title="Save Custom Stroke Preset"
          >
            <Check size={14} className={customStrokePresets.includes(themeConfig.strokeColor || '#ff1493') ? 'saved' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
}
