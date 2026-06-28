import { useRef, useState } from 'react';
import { X, Crop } from 'lucide-react';
import { cropImage } from '../../../utils/cropImage';

export default function ImageCropperWorkspace({ isOpen, onClose, imageSrc, onApply, onReset }) {
  const [cropState, setCropState] = useState({ x: 10, y: 10, w: 80, h: 80 });
  const [cropAspectRatio, setCropAspectRatio] = useState('free'); // 'free', '1:1', '16:9', '9:16'

  const cropContainerRef = useRef(null);
  const dragStartRef = useRef(null);

  if (!isOpen) return null;

  const handleCropMouseDown = (e, mode) => {
    e.preventDefault();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    dragStartRef.current = {
      mode,
      startX: clientX,
      startY: clientY,
      rect: { ...cropState }
    };

    const handleCropMouseMove = (moveEvent) => {
      if (!dragStartRef.current || !cropContainerRef.current) return;

      const currentX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0].clientX);
      const currentY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0].clientY);

      const container = cropContainerRef.current.getBoundingClientRect();
      const deltaX = ((currentX - dragStartRef.current.startX) / container.width) * 100;
      const deltaY = ((currentY - dragStartRef.current.startY) / container.height) * 100;

      const { mode: currentMode, rect } = dragStartRef.current;
      const nextRect = { ...rect };

      if (currentMode === 'drag') {
        nextRect.x = Math.max(0, Math.min(100 - rect.w, rect.x + deltaX));
        nextRect.y = Math.max(0, Math.min(100 - rect.h, rect.y + deltaY));
      } else {
        if (currentMode.includes('w')) {
          const newX = Math.max(0, Math.min(rect.x + rect.w - 5, rect.x + deltaX));
          nextRect.w = rect.x + rect.w - newX;
          nextRect.x = newX;
        }
        if (currentMode.includes('e')) {
          nextRect.w = Math.max(5, Math.min(100 - rect.x, rect.w + deltaX));
        }
        if (currentMode.includes('n')) {
          const newY = Math.max(0, Math.min(rect.y + rect.h - 5, rect.y + deltaY));
          nextRect.h = rect.y + rect.h - newY;
          nextRect.y = newY;
        }
        if (currentMode.includes('s')) {
          nextRect.h = Math.max(5, Math.min(100 - rect.y, rect.h + deltaY));
        }

        if (cropAspectRatio !== 'free') {
          const ratioVal = cropAspectRatio === '1:1' ? 1 : cropAspectRatio === '16:9' ? 16 / 9 : 9 / 16;
          const containerAspect = container.width / container.height;
          const targetPercentHeight = (nextRect.w * containerAspect) / ratioVal;

          if (currentMode.includes('n')) {
            nextRect.y = nextRect.y + nextRect.h - targetPercentHeight;
          }
          nextRect.h = targetPercentHeight;

          if (nextRect.y < 0) {
            nextRect.y = 0;
            nextRect.h = rect.y + rect.h;
            nextRect.w = (nextRect.h * ratioVal) / containerAspect;
            if (currentMode.includes('w')) nextRect.x = rect.x + rect.w - nextRect.w;
          }
          if (nextRect.y + nextRect.h > 100) {
            nextRect.h = 100 - nextRect.y;
            nextRect.w = (nextRect.h * ratioVal) / containerAspect;
            if (currentMode.includes('w')) nextRect.x = rect.x + rect.w - nextRect.w;
          }
        }
      }

      setCropState({
        x: Math.max(0, Math.min(100, nextRect.x)),
        y: Math.max(0, Math.min(100, nextRect.y)),
        w: Math.max(5, Math.min(100 - nextRect.x, nextRect.w)),
        h: Math.max(5, Math.min(100 - nextRect.y, nextRect.h))
      });
    };

    const handleCropMouseUp = () => {
      dragStartRef.current = null;
      document.removeEventListener('mousemove', handleCropMouseMove);
      document.removeEventListener('mouseup', handleCropMouseUp);
      document.removeEventListener('touchmove', handleCropMouseMove);
      document.removeEventListener('touchend', handleCropMouseUp);
    };

    document.addEventListener('mousemove', handleCropMouseMove);
    document.addEventListener('mouseup', handleCropMouseUp);
    document.addEventListener('touchmove', handleCropMouseMove, { passive: false });
    document.addEventListener('touchend', handleCropMouseUp);
  };

  const handleAspectRatioChange = (ratio) => {
    setCropAspectRatio(ratio);
    if (ratio === 'free') return;

    const container = cropContainerRef.current?.getBoundingClientRect();
    if (!container) return;

    const containerAspect = container.width / container.height;
    const ratioVal = ratio === '1:1' ? 1 : ratio === '16:9' ? 16 / 9 : 9 / 16;

    let targetW = 60;
    let targetH = (targetW * containerAspect) / ratioVal;

    if (targetH > 80) {
      targetH = 80;
      targetW = (targetH * ratioVal) / containerAspect;
    }

    setCropState({
      x: (100 - targetW) / 2,
      y: (100 - targetH) / 2,
      w: targetW,
      h: targetH
    });
  };

  const handleApply = async () => {
    try {
      const croppedUrl = await cropImage(imageSrc, cropState);
      onApply(croppedUrl);
    } catch (err) {
      console.error("Failed to crop image:", err);
    }
  };

  const handleReset = () => {
    setCropState({ x: 10, y: 10, w: 80, h: 80 });
    setCropAspectRatio('free');
    onReset();
  };

  return (
    <div className="crop-workspace-overlay">
      {/* Header */}
      <div className="crop-workspace-header">
        <div className="crop-workspace-header-title-container">
          <Crop size={20} />
          <h3>Crop Background Image</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="crop-workspace-close-btn"
        >
          <X size={20} />
        </button>
      </div>

      {/* Canvas / Crop workspace area */}
      <div className="crop-workspace-canvas-area">
        <div ref={cropContainerRef} className="crop-workspace-container">
          <img src={imageSrc} alt="Source Crop" className="crop-workspace-img" />
          <div className="crop-workspace-mask" />

          {/* Viewport Box */}
          <div
            className="crop-workspace-hole"
            style={{
              left: `${cropState.x}%`,
              top: `${cropState.y}%`,
              width: `${cropState.w}%`,
              height: `${cropState.h}%`
            }}
            onMouseDown={(e) => handleCropMouseDown(e, 'drag')}
            onTouchStart={(e) => handleCropMouseDown(e, 'drag')}
          >
            {/* Thirds Grid Lines */}
            <div className="crop-workspace-grid-line h-33" />
            <div className="crop-workspace-grid-line h-66" />
            <div className="crop-workspace-grid-line v-33" />
            <div className="crop-workspace-grid-line v-66" />

            {/* Corner Drag Handles */}
            <div className="crop-workspace-handle nw" onMouseDown={(e) => { e.stopPropagation(); handleCropMouseDown(e, 'nw'); }} onTouchStart={(e) => { e.stopPropagation(); handleCropMouseDown(e, 'nw'); }} />
            <div className="crop-workspace-handle ne" onMouseDown={(e) => { e.stopPropagation(); handleCropMouseDown(e, 'ne'); }} onTouchStart={(e) => { e.stopPropagation(); handleCropMouseDown(e, 'ne'); }} />
            <div className="crop-workspace-handle se" onMouseDown={(e) => { e.stopPropagation(); handleCropMouseDown(e, 'se'); }} onTouchStart={(e) => { e.stopPropagation(); handleCropMouseDown(e, 'se'); }} />
            <div className="crop-workspace-handle sw" onMouseDown={(e) => { e.stopPropagation(); handleCropMouseDown(e, 'sw'); }} onTouchStart={(e) => { e.stopPropagation(); handleCropMouseDown(e, 'sw'); }} />
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="crop-workspace-footer">
        <div className="crop-workspace-presets-group">
          <span>Aspect Ratio:</span>
          {['free', '1:1', '16:9', '9:16'].map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => handleAspectRatioChange(ratio)}
              className={`crop-workspace-ratio-btn ${cropAspectRatio === ratio ? 'active' : ''}`}
            >
              {ratio}
            </button>
          ))}
        </div>

        <div className="crop-workspace-actions-group">
          <button type="button" onClick={handleReset} className="crop-workspace-btn reset">
            Reset Crop
          </button>
          <button type="button" onClick={onClose} className="crop-workspace-btn">
            Cancel
          </button>
          <button type="button" onClick={handleApply} className="crop-workspace-btn apply">
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}
