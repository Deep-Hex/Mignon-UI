# 🖼️ Snapping Decals Canvas Overlay

Darf UI features a customizable, gamified user interface layer: the **Interactive Decals Canvas**. This allows players to upload custom transparent PNG assets, place them as stickers anywhere over the application interface, scale them, rotate them, adjust their transparency, and snap them to specific sidebars or dialogue panels.

---

## 🎨 Viewport Overlay Architecture

The decals canvas operates as an absolute-positioned React viewport overlay managed inside [UIStickerCanvas.jsx](../src/components/UIStickers/UIStickerCanvas.jsx).

```mermaid
graph LR
    %% Flow
    User[User Drag / Touch Gesture] -->|Pointer Coordinates| Canvas[React Sticker Canvas]
    Canvas -->|Compute Matrices| Transform[2D CSS Transform Matrix]
    Transform -->|30px Proximity Snapping| Target[DOM Anchor Targets]
    Transform -->|REST HTTP POST| API[FastAPI /api/stickers]
    API -->|ORM Commit| SQLite[(SQLite: ui_stickers)]
```

---

## ⚙️ Physics & Transformation Matrices

Each decal operates on a hardware-accelerated CSS 2D transformation matrix computed in React state and applied to the sticker wrapper element:

$$\text{transform} = \text{translate}(x, y) \times \text{scale}(s) \times \text{rotate}(\theta\text{ deg})$$

### CSS Representation:
```css
.sticker-element {
    position: absolute;
    transform: translate(var(--x), var(--y)) scale(var(--s)) rotate(var(--theta));
    opacity: var(--alpha);
    pointer-events: auto;
}
```

### Decal Parameter Ceiling Bounds:

#### 1. Pointer Coordinates ($x, y$)
* **Tracking**: Tracked as viewport percentage floats or raw pixel offsets relative to the main workspace container.
* **Events**: Listens to custom mouse `mousemove` and touch `touchmove` pointer events to map drags seamlessly.

#### 2. Pinch-Scaling factors ($s$)
* **Bounds**: $0.2 \times$ (miniature icons) up to $4.0 \times$ (fullscreen visual effects).
* **Control**: Modifiable via standard mouse-wheel scroll inputs or two-finger touch pinch gestures.

#### 3. Rotational Angles ($\theta$)
* **Bounds**: $0^{\circ} - 360^{\circ}$ degree circles.
* **Control**: Rotatable in real-time via custom bounding corner rotation handles.

#### 4. Transparency Coefficients ($\alpha$)
* **Bounds**: $0.1$ (faded watermark borders) up to $1.0$ (completely solid details).
* **Purpose**: Prevents placed decals from obstructing readable dialogues or action buttons.

---

## 🧲 Snapping Anchor Engine

To integrate stickers cleanly with dynamic application layouts rather than floating loosely, Darf UI implements a client-side **Target Element Snapping Engine**:

1. **Selector Array Assignment**: Each decal can store a comma-separated list of CSS selector anchors (e.g. `.chat-sidebar, .message-bubble-bot, .avatar-frame`).
2. **Proximity Calculation**: During a drag, the engine queries matching elements in the DOM and fetches their layout boundaries via `getBoundingClientRect()`.
3. **30px Snapping Threshold**: If the decal coordinate falls within a **30px radius** of a matching element's border coordinates, the physics engine overrides the pointer position to snap perfectly to the target border.
4. **Layout Preservation**: Snapped stickers maintain their relative positions when the sidebar is toggled or when the viewport shifts size.

---

## 📁 Synchronization API Endpoints

All sticker coordinates are persisted instantly to the database:

### 1. `GET /api/stickers`
* **Purpose**: Fetches all active stickers on platform boot.
* **Response Schema**:
  ```json
  [
    {
      "id": "decal_uuid_string",
      "image_data": "data:image/png;base64,...",
      "x": 250.5,
      "y": 120.0,
      "scale": 1.2,
      "rotation": 45,
      "opacity": 0.85,
      "target_selectors": ".chat-sidebar"
    }
  ]
  ```

### 2. `POST /api/stickers`
* **Purpose**: Creates a new sticker, or updates the coordinates, transformations, and anchors of an existing sticker.
* **Request Schema**: Matches the model schema fields above.
* **Database Action**: Executes an upsert (inserts or updates based on the sticker's ID).

### 3. `DELETE /api/stickers/{id}`
* **Purpose**: Instantly wipes the decal off the canvas and deletes its record from the database.
