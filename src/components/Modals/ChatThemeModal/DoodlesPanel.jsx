import { wallpapers, getWallpaperById } from '../../../utils/chatWallpapers';

export default function DoodlesPanel({ themeConfig, onChange }) {
  const strokeColor = themeConfig.strokeColor || '#ff1493';

  const getDefaultWallpaperBg = () => {
    const w = getWallpaperById('theme-default');
    if (!w) return 'none';
    const svgContent = w.svg(strokeColor, 0.22);
    return `url("data:image/svg+xml,${encodeURIComponent(svgContent)}")`;
  };

  const getWallpaperBg = (w) => {
    const svgContent = w.svg(strokeColor, 0.22);
    return `url("data:image/svg+xml,${encodeURIComponent(svgContent)}")`;
  };

  return (
    <div className="chat-theme-doodles-row scrollbar-custom">
      {/* None / Solid option */}
      <div
        className={`character-select-card chat-theme-card-doodle none-option ${(!themeConfig.useCustomBgImage && !themeConfig.useStaticColor && themeConfig.themeId === 'none') ? 'active' : ''}`}
        onClick={() => {
          onChange({
            ...themeConfig,
            themeId: 'none',
            useCustomBgImage: false,
            useStaticColor: false
          });
        }}
      >
        <div className="diagonal-lines" />
        <div className="chat-theme-label-overlay">
          No Doodles
        </div>
        {!themeConfig.useCustomBgImage && !themeConfig.useStaticColor && themeConfig.themeId === 'none' && (
          <div className="chat-theme-check-badge">✓</div>
        )}
      </div>

      {/* Default option */}
      <div
        className={`character-select-card chat-theme-card-doodle ${(!themeConfig.useCustomBgImage && !themeConfig.useStaticColor && themeConfig.themeId === 'theme-default') ? 'active' : ''}`}
        onClick={() => {
          onChange({
            ...themeConfig,
            themeId: 'theme-default',
            useCustomBgImage: false,
            useStaticColor: false
          });
        }}
        style={{
          backgroundImage: getDefaultWallpaperBg()
        }}
      >
        <div className="chat-theme-label-overlay">
          Default Theme
        </div>
        {!themeConfig.useCustomBgImage && !themeConfig.useStaticColor && themeConfig.themeId === 'theme-default' && (
          <div className="chat-theme-check-badge">✓</div>
        )}
      </div>

      {/* Wallpaper options */}
      {wallpapers.map(w => {
        const isActive = !themeConfig.useCustomBgImage && !themeConfig.useStaticColor && themeConfig.themeId === w.id;
        return (
          <div
            key={w.id}
            className={`character-select-card chat-theme-card-doodle ${isActive ? 'active' : ''}`}
            onClick={() => {
              onChange({
                ...themeConfig,
                themeId: w.id,
                useCustomBgImage: false,
                useStaticColor: false
              });
            }}
            style={{
              backgroundImage: getWallpaperBg(w)
            }}
          >
            <div className="chat-theme-label-overlay">
              {w.name}
            </div>
            {isActive && (
              <div className="chat-theme-check-badge">✓</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
