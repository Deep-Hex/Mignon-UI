import { Image as ImageIcon } from 'lucide-react';

export default function CharacterAvatarUpload({ avatar, onFileChange, onRemove }) {
  return (
    <div className="avatar-upload-wrapper">
      <div
        className="avatar-upload-box"
        id="char-avatar-container"
        onClick={() => document.getElementById("char-avatar-input").click()}
        title="Upload Avatar"
        style={{ cursor: 'pointer' }}
      >
        {avatar ? (
          <img id="char-avatar-preview" src={avatar} alt="Preview" style={{ display: 'block' }} />
        ) : (
          <ImageIcon className="placeholder-icon" size={24} />
        )}
        <input
          type="file"
          id="char-avatar-input"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
      </div>
      {avatar && (
        <button
          type="button"
          className="remove-avatar-btn"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          Remove Image
        </button>
      )}
    </div>
  );
}
