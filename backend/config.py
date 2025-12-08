import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # API Configuration
    api_title: str = "Paperly Question Generation API"
    api_version: str = "1.0.0"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Anthropic/GLM Configuration
    anthropic_api_key: str =   "60b19768f0334766a3e3259590b14460.QTFX9bVQYgALL0Mj"
    anthropic_base_url: str = "https://api.z.ai/api/anthropic"
    llm_model: str = "glm-4.5"
    embedding_model: str = "glm-4.5-air"
    max_tokens: int = 4096
    
    # Embedding Configuration
    sentence_transformer_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimension: int = 384  # all-MiniLM-L6-v2 dimension
    
    # Retrieval Configuration
    chunk_size: int = 2000
    chunk_overlap: int = 200
    retrieval_k: int = 5
    
    # Upload Configuration
    upload_dir: str = "uploads"
    max_file_size: int = 50 * 1024 * 1024  # 50MB
    
    # RAG Data Storage
    rag_data_dir: str = "rag_data"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

# Create directories if they don't exist
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.rag_data_dir, exist_ok=True)
