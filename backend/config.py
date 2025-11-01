"""Configuration for the Flask backend."""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration."""

    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

    # CORS settings
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')

    # Ollama settings
    OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://localhost:11435')
    OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'deepseek-r1:8b')

    # Session settings
    MAX_SESSIONS = int(os.getenv('MAX_SESSIONS', '100'))
    SESSION_TIMEOUT = int(os.getenv('SESSION_TIMEOUT', '3600'))  # 1 hour in seconds
