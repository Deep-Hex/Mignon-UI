import React from 'react';
import { 
  ChevronLeft, X, Upload, Palette, Trash2, Check 
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { LOCAL_STORAGE_PREFIX } from '../../../config';
import { 
  BG_COLOR_PRESETS, 
  parseGradient, 
  constructGradientString, 
  resizeAndCompressImage 
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

export default function BackgroundPanel({ themeConfig, onChange }) {
  const { toast } = useToast();
  const fileInputRef = React.useRef(null);
  
  const [customBgPresets, setCustomBgPresets] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_custom_bg_presets`) || '[]');
    } catch {
      return [];
    }
  });

  const [uploadedBgs, setUploadedBgs] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_uploaded_bg_images`) || '[]');
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

  const handleSaveBgPreset = () => {
    const activeColor = themeConfig.bgColor || '#ff1493';
    if (customBgPresets.includes(activeColor)) {
      const nextPresets = customBgPresets.filter(p => p !== activeColor);
      setCustomBgPresets(nextPresets);
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_custom_bg_presets`, JSON.stringify(nextPresets));
      toast.success("Removed preset color.");
    } else {
      const nextPresets = [activeColor, ...customBgPresets].slice(0, 14);
      setCustomBgPresets(nextPresets);
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_custom_bg_presets`, JSON.stringify(nextPresets));
      toast.success("Saved color preset!");
    }
  };

  const isGradient = themeConfig.bgColor && (
    themeConfig.bgColor.startsWith('linear-gradient') ||
    themeConfig.bgColor.startsWith('radial-gradient') ||
    themeConfig.bgColor.startsWith('conic-gradient')
  );
  const parsed = parseGradient(themeConfig.bgColor);
  const colors = isGradient ? parsed.colors : [themeConfig.bgColor || '#ff1493'];

  return (
    <div className="chat-theme-bg-controls-wrapper">
      {themeConfig.useStaticColor ? (
        <div className="chat-theme-bg-color-presets-panel">
          <div className="chat-theme-bg-color-presets-header">
            <button
              type="button"
              className="chat-theme-back-to-selection-btn"
              onClick={() => {
                onChange({
                  ...themeConfig,
                  useStaticColor: false
                });
              }}
              title="Go Back"
            >
              <ChevronLeft size={14} />
              <span>Go Back</span>
            </button>
            <span>Color & Gradient Presets</span>
          </div>

          <div className="chat-theme-color-presets-row scrollbar-custom">
            {/* Custom Saved Background Presets */}
            {customBgPresets.map((presetValue, idx) => {
              const isObject = typeof presetValue === 'object' && presetValue !== null;
              const isActive = isObject
                ? (themeConfig.useCustomBgImage && themeConfig.bgImage === presetValue.bgImage)
                : (themeConfig.useStaticColor && themeConfig.bgColor === presetValue);
              const btnStyle = isObject
                ? {
                    backgroundImage: `url("${presetValue.bgImage}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }
                : { background: presetValue };

              return (
                <div key={`custom-bg-${idx}`} className="chat-theme-bg-preset-btn-wrapper">
                  <button
                    type="button"
                    onClick={() => {
                      if (isObject) {
                        onChange({
                          ...themeConfig,
                          useCustomBgImage: true,
                          useStaticColor: false,
                          bgImage: presetValue.bgImage,
                          bgImageOriginal: presetValue.bgImageOriginal,
                          bgImageOpacity: presetValue.bgImageOpacity !== undefined ? presetValue.bgImageOpacity : 100,
                          bgImageFill: presetValue.bgImageFill || 'cover'
                        });
                      } else {
                        onChange({
                          ...themeConfig,
                          useStaticColor: true,
                          useCustomBgImage: false,
                          bgColor: presetValue
                        });
                      }
                    }}
                    className={`chat-theme-bg-preset-btn custom-preset ${isActive ? 'active' : ''}`}
                    style={btnStyle}
                    title={isObject ? "Custom Saved Background Image Preset" : "Custom Saved Background Preset"}
                  >
                    {isActive && (
                      <span className={`chat-theme-preset-check ${(!isObject && presetValue === '#ffffff') ? 'dark-check' : ''}`}>
                        ✓
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="chat-theme-custom-preset-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextPresets = customBgPresets.filter(p => {
                        if (isObject) {
                          return typeof p !== 'object' || p === null || p.bgImage !== presetValue.bgImage;
                        } else {
                          return p !== presetValue;
                        }
                      });
                      setCustomBgPresets(nextPresets);
                      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_custom_bg_presets`, JSON.stringify(nextPresets));
                    }}
                    title="Delete Custom Preset"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            {/* Standard Curated Presets */}
            {BG_COLOR_PRESETS.map((preset, idx) => (
              <PresetButton
                key={idx}
                preset={preset}
                isActive={themeConfig.bgColor === preset.value}
                onClick={() => handleFieldChange('bgColor', preset.value)}
              />
            ))}
          </div>

          {/* Custom Color Designer Panel */}
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

                      handleFieldChange('bgColor', constructGradientString(parsed.type, parsed.angle, nextColors));
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
                        handleFieldChange('bgColor', constructGradientString(parsed.type, parsed.angle, nextColors));
                      } else {
                        handleFieldChange('bgColor', e.target.value);
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
                          handleFieldChange('bgColor', nextColors[0]);
                        } else {
                          handleFieldChange('bgColor', constructGradientString(parsed.type, parsed.angle, nextColors));
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

                    handleFieldChange('bgColor', constructGradientString(parsed.type, parsed.angle, nextColors));
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
                            handleFieldChange('bgColor', constructGradientString(m, parsed.angle, colors));
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
                      handleFieldChange('bgColor', constructGradientString(parsed.type, parseInt(e.target.value), colors));
                    }}
                  />
                  <span className="chat-theme-monospace-label">{parsed.angle}°</span>
                </div>
              )}

              <button
                type="button"
                className="builder-save-preset-btn"
                onClick={handleSaveBgPreset}
                title="Save Custom Background Preset"
              >
                <Check size={14} className={customBgPresets.includes(themeConfig.bgColor || '#ff1493') ? 'saved' : ''} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="chat-theme-bg-selection-group scrollbar-custom">
          {/* Choose Image */}
          <div
            className="character-select-card chat-theme-card-upload add-new-card"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
              }
            }}
          >
            <Upload size={20} />
            <span>Choose Image</span>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = async () => {
                    const compressed = await resizeAndCompressImage(reader.result);
                    const newBg = {
                      id: Date.now(),
                      bgImage: compressed,
                      bgImageOriginal: compressed,
                      bgImageOpacity: 100,
                      bgImageFill: 'cover'
                    };
                    const nextBgs = [newBg, ...uploadedBgs].slice(0, 8);
                    setUploadedBgs(nextBgs);
                    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_uploaded_bg_images`, JSON.stringify(nextBgs));

                    onChange({
                      ...themeConfig,
                      bgImage: compressed,
                      bgImageOriginal: compressed,
                      useCustomBgImage: true,
                      useStaticColor: false,
                      bgImageOpacity: 100,
                      bgImageFill: 'cover'
                    });
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="chat-theme-hidden-input"
            />

            <div className="chat-theme-label-overlay">
              Upload New
            </div>
          </div>

          {/* Uploaded Background Cards */}
          {uploadedBgs.map((bg) => {
            const isActive = themeConfig.useCustomBgImage && themeConfig.bgImage === bg.bgImage;
            return (
              <div
                key={bg.id}
                className={`character-select-card chat-theme-card-upload uploaded-bg-card ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onChange({
                    ...themeConfig,
                    bgImage: bg.bgImage,
                    bgImageOriginal: bg.bgImageOriginal,
                    bgImageOpacity: bg.bgImageOpacity !== undefined ? bg.bgImageOpacity : 100,
                    bgImageFill: bg.bgImageFill || 'cover',
                    useCustomBgImage: true,
                    useStaticColor: false
                  });
                }}
                style={{
                  backgroundImage: `url(${bg.bgImage})`
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const isCurrentlyActive = themeConfig.useCustomBgImage && themeConfig.bgImage === bg.bgImage;
                    const nextBgs = uploadedBgs.filter(item => item.id !== bg.id);
                    setUploadedBgs(nextBgs);
                    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_uploaded_bg_images`, JSON.stringify(nextBgs));

                    if (isCurrentlyActive) {
                      onChange({
                        ...themeConfig,
                        bgImage: null,
                        bgImageOriginal: null,
                        useCustomBgImage: false
                      });
                    }
                  }}
                  className="chat-theme-remove-image-btn"
                  title="Remove Image"
                >
                  <Trash2 size={12} />
                </button>

                {isActive && (
                  <div className="chat-theme-check-badge">✓</div>
                )}

                <div className="chat-theme-label-overlay">
                  Custom Bg
                </div>
              </div>
            );
          })}

          {/* Solid Color Option */}
          <div
            className={`character-select-card chat-theme-card-solid ${themeConfig.useStaticColor ? 'active' : ''}`}
            onClick={() => {
              onChange({
                ...themeConfig,
                useStaticColor: true,
                useCustomBgImage: false
              });
            }}
            style={{
              background: themeConfig.useStaticColor && themeConfig.bgColor ? themeConfig.bgColor : 'var(--bg-window)'
            }}
          >
            <div className="chat-theme-color-wheel">
              <Palette size={16} />
            </div>

            <div className="chat-theme-label-overlay">
              {themeConfig.useStaticColor && themeConfig.bgColor ? (themeConfig.bgColor.startsWith('linear') ? 'Gradient Bg' : themeConfig.bgColor) : 'Solid/Gradient'}
            </div>
            {themeConfig.useStaticColor && (
              <div className="chat-theme-check-badge">✓</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
