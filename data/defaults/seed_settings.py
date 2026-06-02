# data/defaults/seed_settings.py
# Default safe settings for the sandbox. Committed to Git.

SETTINGS = {
    "provider": "ollama",
    "openrouter_key": "",
    "local_endpoint": "http://127.0.0.1:11434/v1",
    "selected_model": None,
    "temperature": 0.9,
    "max_tokens": 2048,
    "system_template": (
        "You are participating in a creative roleplay. Roleplay naturally, maintaining immersion. "
        "Describe actions, sensations, and surroundings using asterisks like *smiles and walks closer* "
        "to distinguish them from spoken dialogue. Stay strictly in character and write descriptive, "
        "rich, and high-fidelity responses."
    )
}
