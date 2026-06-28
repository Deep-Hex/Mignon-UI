import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, Check, Paintbrush, Image as ImageIcon, Droplet, Sliders } from 'lucide-react';
import { useUIContext } from '../../context/UIContext';
import { getWallpaperById } from '../../utils/chatWallpapers';
import { resizeAndCompressImage } from '../../utils/themeHelper';
import '../../styles/chatthemeeditor.css';

// Subcomponents
import DoodlesPanel from './ChatThemeModal/DoodlesPanel';
import BackgroundPanel from './ChatThemeModal/BackgroundPanel';
import LineColorPanel from './ChatThemeModal/LineColorPanel';
import SlidersPanel from './ChatThemeModal/SlidersPanel';
import ImageCropperWorkspace from './ChatThemeModal/ImageCropperWorkspace';

const TOOLBAR_ITEMS = [
  { id: 'doodles', icon: Paintbrush, label: 'Doodles' },
  { id: 'background', icon: ImageIcon, label: 'Background' },
  { id: 'line-color', icon: Droplet, label: 'Line Color' },
  { id: 'sliders', icon: Sliders, label: 'Sliders' }
];

export default function ChatThemeModal({ isOpen, onClose, themeConfig, onChange }) {
  const ui = useUIContext();
  const [activeOption, setActiveOption] = useState(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isBgSettingsOpen, setIsBgSettingsOpen] = useState(false);

  if (!isOpen) return null;

  const handleResetToDefault = () => {
    onChange({
      themeId: 'theme-default',
      bgColor: 'linear-gradient(135deg, #ff1493 0%, #00f0ff 100%)',
      strokeColor: 'linear-gradient(135deg, #ff1493 0%, #00f0ff 100%)',
      opacity: 10,
      vignette: 40,
      useCustomBgImage: false,
      bgImage: null,
      bgImageOriginal: null,
      bgImageOpacity: 100,
      bgImageFill: 'cover',
      useStaticColor: false
    });
  };

  const renderActiveOptionContent = () => {
    switch (activeOption) {
      case 'doodles':
        return <DoodlesPanel themeConfig={themeConfig} onChange={onChange} />;
      case 'background':
        return <BackgroundPanel themeConfig={themeConfig} onChange={onChange} />;
      case 'line-color':
        return <LineColorPanel themeConfig={themeConfig} onChange={onChange} />;
      case 'sliders':
        return (
          <SlidersPanel
            themeConfig={themeConfig}
            onChange={onChange}
            isBgSettingsOpen={isBgSettingsOpen}
            setIsBgSettingsOpen={setIsBgSettingsOpen}
            setIsCropModalOpen={setIsCropModalOpen}
          />
        );
      default:
        return null;
    }
  };

  const getPreviewBackgroundOverlayStyle = () => {
    const styles = {};

    // 1. Background Image
    if (themeConfig.useCustomBgImage && themeConfig.bgImage) {
      styles.backgroundImage = `url("${themeConfig.bgImage}")`;

      const opacityVal = themeConfig.bgImageOpacity !== undefined ? themeConfig.bgImageOpacity / 100 : 1;
      styles.opacity = opacityVal;

      const fill = themeConfig.bgImageFill || 'cover';
      if (fill === 'tile') {
        styles.backgroundSize = 'auto';
        styles.backgroundRepeat = 'repeat';
        styles.backgroundPosition = 'top left';
      } else if (fill === 'stretch') {
        styles.backgroundSize = '100% 100%';
        styles.backgroundRepeat = 'no-repeat';
        styles.backgroundPosition = 'center';
      } else if (fill === 'contain') {
        styles.backgroundSize = 'contain';
        styles.backgroundRepeat = 'no-repeat';
        styles.backgroundPosition = 'center';
      } else {
        styles.backgroundSize = 'cover';
        styles.backgroundRepeat = 'no-repeat';
        styles.backgroundPosition = 'center';
      }
    } else if (themeConfig.themeId === 'none') {
      styles.backgroundImage = 'none';
      styles.opacity = 1;
    } else if (themeConfig.themeId && themeConfig.themeId !== 'theme-default') {
      const selectedWallpaper = getWallpaperById(themeConfig.themeId);
      if (selectedWallpaper) {
        const strokeColor = themeConfig.strokeColor || selectedWallpaper.defaultColor;
        const strokeOpacity = (themeConfig.opacity !== undefined ? themeConfig.opacity : 10) / 100;
        const svgContent = selectedWallpaper.svg(strokeColor, strokeOpacity);
        styles.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svgContent)}")`;
        styles.backgroundRepeat = 'repeat';
        styles.backgroundSize = '160px 160px';
        styles.backgroundPosition = '0 0';
        styles.opacity = 1;
      }
    } else {
      // theme-default override using current UI theme Design Doodles
      const currentUiTheme = ui.themeDesign;
      const activeWallpaper = getWallpaperById(currentUiTheme);
      if (activeWallpaper) {
        const strokeColor = themeConfig.strokeColor || activeWallpaper.defaultColor;
        const strokeOpacity = (themeConfig.opacity !== undefined ? themeConfig.opacity : 10) / 100;
        const svgContent = activeWallpaper.svg(strokeColor, strokeOpacity);
        styles.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svgContent)}")`;
        styles.backgroundRepeat = 'repeat';
        styles.backgroundSize = '160px 160px';
        styles.backgroundPosition = '0 0';
        styles.opacity = 1;
      }
    }

    // 2. Vignette Box Shadow
    const vignetteStrength = themeConfig.vignette !== undefined ? themeConfig.vignette : 40;
    styles.boxShadow = `inset 0 0 ${vignetteStrength}px rgba(0, 0, 0, 0.45)`;

    return styles;
  };

  return createPortal(
    <div className="modal-backdrop active chat-theme-fullscreen-editor">
      {/* ── IMMERSIVE FULL-SCREEN 1:1 LIVE CHAT SCREEN SIMULATOR ── */}
      <div
        className="chat-preview-fullscreen scrollbar-custom"
        style={{
          background: themeConfig.useStaticColor && themeConfig.bgColor ? themeConfig.bgColor : 'var(--bg-window)'
        }}
      >
        {/* Isolated Background Image & Effect Layer */}
        <div className="chat-preview-background-overlay" style={getPreviewBackgroundOverlayStyle()} />

        {/* Simulator Message Bubbles Thread */}
        <div className="chat-preview-message-thread">
          {/* Bot Bubble Mockup */}
          <div className="chat-preview-bot-bubble-wrapper">
            <div className="chat-preview-avatar ai">AI</div>
            <div className="chat-preview-bubble">
              Welcome to the Interactive Studio! Try picking different theme doodles on the left toolbar, dragging the Line Opacity slider, or selecting a custom Solid Color override.
            </div>
          </div>

          {/* User Bubble Mockup */}
          <div className="chat-preview-user-bubble-wrapper">
            <div className="chat-preview-avatar me">ME</div>
            <div className="chat-preview-bubble">
              Wow, this fullscreen customizer workspace is spectacular! Having the preview as the entire screen makes it feel exactly like professional editing software. ✦
            </div>
          </div>

          {/* Bot Bubble 2 Mockup */}
          <div className="chat-preview-bot-bubble-wrapper">
            <div className="chat-preview-avatar ai">AI</div>
            <div className="chat-preview-bubble">
              Exactly! You can also upload custom landscape pictures under "Background Image Upload" and combine them with vignette shadows for the perfect sandbox depth!
            </div>
          </div>
        </div>

        {/* Immersive Editing Bottom Toolbar & Popover Tray */}
        <div className="chat-theme-bottom-toolbar">
          {/* Active Option Popover Tray */}
          {activeOption && (
            <div className="chat-theme-popover-tray">
              {renderActiveOptionContent()}
            </div>
          )}

          {/* Icon-Based Toolbar Buttons */}
          <div className="chat-theme-icon-toolbar">
            {TOOLBAR_ITEMS.map((item) => {
              const isActive = activeOption === item.id;
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveOption(isActive ? null : item.id)}
                  title={item.label}
                  className={`chat-theme-btn-round ${isActive ? 'active' : ''}`}
                >
                  <IconComponent size={18} />
                </button>
              );
            })}

            {/* Separator Line */}
            <div className="chat-theme-toolbar-separator" />

            {/* Reset Button */}
            <button
              type="button"
              onClick={handleResetToDefault}
              title="Reset Theme"
              className="chat-theme-btn-round reset"
            >
              <RotateCcw size={18} />
            </button>

            {/* Apply & Exit Button */}
            <button
              type="button"
              onClick={onClose}
              title="Apply & Exit"
              className="chat-theme-btn-round apply"
            >
              <Check size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Image Cropper Workspace Overlay */}
      <ImageCropperWorkspace
        key={isCropModalOpen}
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        imageSrc={themeConfig.bgImageOriginal || themeConfig.bgImage}
        onApply={async (croppedUrl) => {
          const compressed = await resizeAndCompressImage(croppedUrl);
          onChange({
            ...themeConfig,
            bgImage: compressed
          });
          setIsCropModalOpen(false);
        }}
        onReset={() => {
          if (themeConfig.bgImageOriginal) {
            onChange({
              ...themeConfig,
              bgImage: themeConfig.bgImageOriginal
            });
          }
        }}
      />
    </div>,
    document.body
  );
}
