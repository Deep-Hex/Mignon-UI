import base64
import hashlib
import os
import struct
import uuid


def _chacha20_quarter_round(x: list[int], a: int, b: int, c: int, d: int) -> None:
    x[a] = (x[a] + x[b]) & 0xffffffff
    x[d] = x[d] ^ x[a]
    x[d] = ((x[d] << 16) | (x[d] >> 16)) & 0xffffffff
    x[c] = (x[c] + x[d]) & 0xffffffff
    x[b] = x[b] ^ x[c]
    x[b] = ((x[b] << 12) | (x[b] >> 20)) & 0xffffffff
    x[a] = (x[a] + x[b]) & 0xffffffff
    x[d] = x[d] ^ x[a]
    x[d] = ((x[d] << 8) | (x[d] >> 24)) & 0xffffffff
    x[c] = (x[c] + x[d]) & 0xffffffff
    x[b] = x[b] ^ x[c]
    x[b] = ((x[b] << 7) | (x[b] >> 25)) & 0xffffffff

def _chacha20_block(key: bytes, counter: int, nonce: bytes) -> bytes:
    state = [
        0x61736369, 0x33206279, 0x7465206b, 0x65792065, # "expand 32-byte k" constants
        *struct.unpack("<8I", key),
        counter,
        *struct.unpack("<3I", nonce)
    ]
    initial_state = list(state)
    for _ in range(10): # 20 rounds
        # Column rounds
        _chacha20_quarter_round(state, 0, 4, 8, 12)
        _chacha20_quarter_round(state, 1, 5, 9, 13)
        _chacha20_quarter_round(state, 2, 6, 10, 14)
        _chacha20_quarter_round(state, 3, 7, 11, 15)
        # Diagonal rounds
        _chacha20_quarter_round(state, 0, 5, 10, 15)
        _chacha20_quarter_round(state, 1, 6, 11, 12)
        _chacha20_quarter_round(state, 2, 7, 8, 13)
        _chacha20_quarter_round(state, 3, 4, 9, 14)

    out = [(x + y) & 0xffffffff for x, y in zip(state, initial_state, strict=False)]
    return struct.pack("<16I", *out)

def _chacha20_crypt(data: bytes, key: bytes, nonce: bytes) -> bytes:
    out = bytearray()
    counter = 1
    for i in range(0, len(data), 64):
        block = _chacha20_block(key, counter, nonce)
        chunk = data[i:i+64]
        for b, c in zip(block, chunk, strict=False):
            out.append(b ^ c)
        counter += 1
    return bytes(out)

def _rc4_crypt(data: bytes, key: bytes) -> bytes:
    """Legacy RC4 stream cipher algorithm in pure Python."""
    S = list(range(256))
    j = 0
    out = bytearray()

    # Key-scheduling algorithm (KSA)
    for i in range(256):
        j = (j + S[i] + key[i % len(key)]) % 256
        S[i], S[j] = S[j], S[i]

    # Pseudo-random generation algorithm (PRGA)
    i = j = 0
    for char in data:
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        out.append(char ^ S[(S[i] + S[j]) % 256])

    return bytes(out)

def _get_encryption_key() -> bytes:
    """Derive a 256-bit symmetric key based on a machine-specific unique hardware ID and salt."""
    hardware_id = str(uuid.getnode())
    salt = "DarfDarkFantasySandboxSecretSalt"
    return hashlib.sha256((hardware_id + salt).encode("utf-8")).digest()

def encrypt_key(plaintext: str) -> str:
    """Encrypt a plaintext key using secure ChaCha20 symmetric encryption and return a base64 encoded string with 'enc::cc20::' prefix."""
    if not plaintext:
        return ""
    try:
        key = _get_encryption_key()
        nonce = os.urandom(12)
        encrypted_bytes = _chacha20_crypt(plaintext.encode("utf-8"), key, nonce)
        combined = nonce + encrypted_bytes
        return "enc::cc20::" + base64.b64encode(combined).decode("utf-8")
    except Exception as e:
        print(f"[Security] Failed to encrypt API key: {e}")
        return plaintext

def decrypt_key(encrypted_str: str) -> str:
    """Decrypt a key prefixed with 'enc::cc20::' or legacy 'enc::' back to plaintext. Returns raw key if not encrypted."""
    if not encrypted_str:
        return ""
    if not encrypted_str.startswith("enc::"):
        return encrypted_str
    try:
        key = _get_encryption_key()
        if encrypted_str.startswith("enc::cc20::"):
            combined = base64.b64decode(encrypted_str[11:])
            if len(combined) < 12:
                raise ValueError("Invalid encrypted data length")
            nonce = combined[:12]
            encrypted_bytes = combined[12:]
            decrypted_bytes = _chacha20_crypt(encrypted_bytes, key, nonce)
            return decrypted_bytes.decode("utf-8")
        else:
            # Fallback decryption for legacy RC4 format
            encrypted_bytes = base64.b64decode(encrypted_str[5:])
            decrypted_bytes = _rc4_crypt(encrypted_bytes, key)
            return decrypted_bytes.decode("utf-8")
    except Exception as e:
        print(f"[Security] Failed to decrypt API key (possibly copied from another system): {e}")
        return ""
