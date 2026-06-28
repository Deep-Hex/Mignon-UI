import { X, Plus } from 'lucide-react';

/**
 * Reusable Tag Input Component.
 * Used for adding/removing tag badges with an input field and helper text.
 * 
 * @param {Object} props
 * @param {string[]} props.tags - List of active tags.
 * @param {string} props.tagInputValue - Controlled input value.
 * @param {Function} props.setTagInputValue - Setter for input value.
 * @param {Function} props.onAddTag - Callback when a tag is added.
 * @param {Function} props.onRemoveTag - Callback when a tag is removed.
 * @param {string} [props.inputId] - Optional unique ID for input.
 * @param {string} [props.placeholder] - Placeholder for input field.
 * @param {string} [props.helperText] - Help text displayed on the side/below.
 */
export default function TagInput({
  tags = [],
  tagInputValue,
  setTagInputValue,
  onAddTag,
  onRemoveTag,
  inputId = 'tag-input',
  placeholder = 'Add tags (comma-separated)...',
  helperText = 'Type multiple tags separated by commas. Press enter or click (+) to add.'
}) {
  return (
    <>
      {/* Active tag badges */}
      {tags.length > 0 && (
        <div
          className="tag-badges-container no-scrollbar"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '8px',
            maxHeight: '120px',
            overflowY: 'auto',
            paddingRight: '4px',
            alignContent: 'flex-start'
          }}
        >
          {tags.map((t, idx) => (
            <span key={idx} className="silly-tag-badge">
              {t}
              <button
                type="button"
                className="remove-tag-btn"
                title={`Remove tag: ${t}`}
                onClick={() => onRemoveTag(t)}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Tag Input Field & Help Text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <input
            type="text"
            id={inputId}
            placeholder={placeholder}
            value={tagInputValue}
            onChange={(e) => setTagInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddTag();
              }
            }}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="primary-btn"
            onClick={onAddTag}
            style={{
              width: '46px',
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              flexShrink: 0
            }}
            title="Add Tag"
          >
            <Plus size={20} />
          </button>
        </div>
        {helperText && (
          <small className="help-text" style={{ marginTop: '2px', fontSize: '0.74rem', lineHeight: '1.4', color: 'var(--text-muted)' }}>
            {helperText}
          </small>
        )}
      </div>
    </>
  );
}
