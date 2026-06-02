# rag_store.py
# LanceDB vector store singleton using dynamic API offloading (Ollama / Kobold.cpp).
# Zero local CPU/PyTorch execution overhead. Slashes app size by 1.2GB.

import os

import numpy as np

# ── Config ────────────────────────────────────────────────────────────────────
LANCE_DIR       = "./lancedb"
TABLE_NAME      = "ar_lore"

# ── Singleton state ───────────────────────────────────────────────────────────
_db        = None
_table     = None
_embed_dim = None  # Dynamically resolved on startup
_local_transformer = None


def _get_database_settings():
    """Retrieve active API endpoints and models from the settings database."""
    from app.core.database import SessionLocal, Settings

    api_url = None
    model_name = None
    selected_model = None

    db = None
    try:
        db = SessionLocal()
        settings = db.query(Settings).filter(Settings.id == 1).first()
        if settings:
            selected_model = settings.selected_model
            if settings.provider == "openrouter":
                api_url = "https://openrouter.ai/api/v1"
                model_name = "openai/text-embedding-3-small"
            else:
                api_url = settings.local_endpoint or "http://127.0.0.1:11434/v1"
                # Default to active selected chat model
                model_name = settings.selected_model or "default"
    except Exception as err:
        print(f"[RAG] Settings lookup warning: {err}")
    finally:
        if db is not None:
            db.close()

    # Standard fallback values
    if not api_url:
        api_url = os.environ.get("EMBEDDING_API_URL") or "http://127.0.0.1:11434/v1"
    if not model_name:
        model_name = selected_model or "default"

    return api_url, model_name


def _embed_via_api(texts: list[str], api_url: str, model_name: str) -> np.ndarray:
    """Query an external HTTP API (Ollama / Kobold.cpp) for embeddings."""
    import httpx

    url = api_url.rstrip("/")
    if "/v1" not in url and "11434" in url:
        endpoint = f"{url}/v1/embeddings"
    else:
        endpoint = f"{url}/embeddings" if not url.endswith("/embeddings") else url

    payload = {
        "model": model_name,
        "input": texts
    }

    try:
        res = httpx.post(endpoint, json=payload, timeout=15.0)
        res.raise_for_status()
        data = res.json()

        # Parse OpenAI-compliant response format
        embeddings_list = [item["embedding"] for item in data["data"]]
        return np.array(embeddings_list, dtype=np.float32)
    except Exception as exc:
        print(f"[RAG] Embedding query failed for model '{model_name}': {exc}")
        raise exc


def _get_local_embeddings(texts: list[str]) -> np.ndarray:
    """Compute embeddings locally inside the Python process using SentenceTransformer."""
    global _local_transformer
    if _local_transformer is None:
        from sentence_transformers import SentenceTransformer
        print("[RAG] Initializing local SentenceTransformer 'jinaai/jina-embeddings-v2-small-en' (8k Context)...")
        _local_transformer = SentenceTransformer("jinaai/jina-embeddings-v2-small-en", trust_remote_code=True)
    return _local_transformer.encode(texts, convert_to_numpy=True)


def embed(texts: list[str]) -> np.ndarray:
    """
    Embed a list of strings dynamically.
    Returns float32 array (N, dim).
    """
    from app.core.database import SessionLocal, Settings

    is_cloud = False
    api_url = None

    db = None
    try:
        db = SessionLocal()
        settings = db.query(Settings).filter(Settings.id == 1).first()
        if settings:
            is_cloud = (settings.provider == "openrouter")
            api_url = settings.local_endpoint or "http://127.0.0.1:11434/v1"
    except Exception as err:
        print(f"[RAG] Settings lookup warning: {err}")
    finally:
        if db is not None:
            db.close()

    # 1. Cloud OpenRouter path (default to text-embedding-3-small)
    if is_cloud:
        cloud_url = "https://openrouter.ai/api/v1"
        cloud_model = "openai/text-embedding-3-small"
        return _embed_via_api(texts, cloud_url, cloud_model)

    # 2. Default Plug-and-Play local sentence-transformers path (runs 100% locally inside app process)
    try:
        return _get_local_embeddings(texts)
    except Exception as e:
        print(f"[RAG] Local SentenceTransformers failed ({e}), falling back to external API endpoint...")
        # Emergency fallback to active LLM chat model via Ollama
        api_url, fallback_model = _get_database_settings()
        return _embed_via_api(texts, api_url, fallback_model)


def _get_table():
    """Open (or create) the LanceDB table; called once at startup."""
    global _db, _table, _embed_dim
    if _table is not None:
        return _table

    import lancedb
    os.makedirs(LANCE_DIR, exist_ok=True)
    _db = lancedb.connect(LANCE_DIR)

    # 1. Resolve embedding dimension dynamically by compiling a test string
    if _embed_dim is None:
        try:
            test_vec = embed(["test"])[0]
            _embed_dim = len(test_vec)
            print(f"[RAG] Dynamically detected embedding dimension: {_embed_dim}")
        except Exception as e:
            print(f"[RAG] Warning: Failed to detect embedding dimension ({e}). Defaulting to 384.")
            _embed_dim = 384

    # 2. Open or create the table safely
    if TABLE_NAME in _db.table_names():
        table = _db.open_table(TABLE_NAME)
        schema = table.schema
        try:
            vector_field = schema.field("vector")
            list_size = getattr(vector_field.type, "list_size", None)
            # If the dimension has changed, dynamically drop and rebuild the table (prevents crashes)
            if list_size is not None and list_size != _embed_dim:
                print(f"[RAG] Dimension mismatch detected (table: {list_size}, model: {_embed_dim}).")
                print(f"[RAG] Automatically rebuilding LanceDB table '{TABLE_NAME}' for schema compatibility...")
                _db.drop_table(TABLE_NAME)
            else:
                _table = table
                return _table
        except Exception as e:
            print(f"[RAG] Schema inspection warning: {e}")
            _table = table
            return _table

    # Schema defined via dynamic dimensions
    import pyarrow as pa
    schema = pa.schema([
        pa.field("id",           pa.utf8()),          # unique stable ID (hash)
        pa.field("type",         pa.utf8()),           # "lore" | "character"
        pa.field("source_id",    pa.utf8()),           # lore entry id or character id
        pa.field("title",        pa.utf8()),
        pa.field("text",         pa.utf8()),           # the text that was embedded
        pa.field("vector",       pa.list_(pa.float32(), _embed_dim)),
    ])
    _table = _db.create_table(TABLE_NAME, schema=schema)
    print(f"[RAG] Created LanceDB table '{TABLE_NAME}' with {_embed_dim} dimensions.")

    return _table


def get_table():
    """Public accessor — ensures table exists."""
    return _get_table()


def retrieve(query: str, top_k: int = 5, filter_sql: str | None = None) -> list[dict]:
    """
    Semantic search over the lore table.
    """
    table = _get_table()
    q_vec = embed([query])[0].tolist()

    search = table.search(q_vec).limit(top_k)
    if filter_sql:
        search = search.where(filter_sql, prefilter=True)

    results = search.to_list()
    return results
