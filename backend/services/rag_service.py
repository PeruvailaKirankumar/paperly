from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from typing import List, Optional, Dict, Any
import os
import pickle
from config import settings


class RAGService:
    """Service for Retrieval Augmented Generation."""
    
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(
            model_name=settings.sentence_transformer_model
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            length_function=len,
        )
        self.vector_store: Optional[FAISS] = None
        self.documents: List[Document] = []
        
    def add_documents(self, texts: List[str], metadatas: List[Dict[str, Any]] = None):
        """
        Add documents to the vector store.
        
        Args:
            texts: List of text content
            metadatas: Optional list of metadata dicts for each text
        """
        if metadatas is None:
            metadatas = [{"source": f"doc_{i}"} for i in range(len(texts))]
        
        # Create Document objects
        documents = [
            Document(page_content=text, metadata=metadata)
            for text, metadata in zip(texts, metadatas)
        ]
        
        # Split documents into chunks
        chunks = self.text_splitter.split_documents(documents)
        self.documents.extend(chunks)
        
        # Create or update vector store
        if self.vector_store is None:
            self.vector_store = FAISS.from_documents(chunks, self.embeddings)
        else:
            # Add new documents to existing vector store
            new_db = FAISS.from_documents(chunks, self.embeddings)
            self.vector_store.merge_from(new_db)
        
        return len(chunks)
    
    # def retrieve_context(
    #     self, 
    #     query: str, 
    #     k: int = None,
    #     filter_dict: Dict[str, Any] = None
    # ) -> List[Document]:
    #     """
    #     Retrieve relevant documents for a query.
        
    #     Args:
    #         query: The search query
    #         k: Number of documents to retrieve
    #         filter_dict: Optional metadata filter
            
    #     Returns:
    #         List of relevant documents
    #     """
    #     if self.vector_store is None:
    #         return []
        
    #     k = k or settings.retrieval_k
        
    #     if filter_dict:
    #         retriever = self.vector_store.as_retriever(
    #             search_type="similarity",
    #             search_kwargs={"k": k, "filter": filter_dict}
    #         )
    #     else:
    #         retriever = self.vector_store.as_retriever(
    #             search_type="similarity",
    #             search_kwargs={"k": k}
    #         )
        
    #     documents = retriever.get_relevant_documents(query)
    #     return documents
    
    def retrieve_context(
    self, 
    query: str, 
    k: int = None,
    filter_dict: Dict[str, Any] = None
) -> List[Document]:
        """Retrieve relevant documents for a query."""
        if self.vector_store is None:
            return []

        k = k or settings.retrieval_k

        if filter_dict:
            retriever = self.vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={"k": k, "filter": filter_dict}
            )
        else:
            retriever = self.vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={"k": k}
            )

        # 🟢 Updated for new API
        documents = retriever.invoke(query)
        return documents


    def get_all_documents(self) -> List[Document]:
        """Get all stored documents."""
        return self.documents
    
    def clear_documents(self):
        """Clear all documents from the vector store."""
        self.vector_store = None
        self.documents = []
    
    def save_vector_store(self, path: str):
        """Save vector store to disk."""
        if self.vector_store is not None:
            os.makedirs(path, exist_ok=True)
            self.vector_store.save_local(path)
            # Save documents separately
            with open(os.path.join(path, "documents.pkl"), "wb") as f:
                pickle.dump(self.documents, f)
            return True
        return False
    
    def load_vector_store(self, path: str):
        """Load vector store from disk."""
        if os.path.exists(path):
            try:
                self.vector_store = FAISS.load_local(
                    path, 
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
                # Load documents
                doc_path = os.path.join(path, "documents.pkl")
                if os.path.exists(doc_path):
                    with open(doc_path, "rb") as f:
                        self.documents = pickle.load(f)
                return True
            except Exception as e:
                print(f"Error loading vector store: {e}")
                return False
        return False
    
    def has_data(self) -> bool:
        """Check if RAG service has data loaded."""
        return self.vector_store is not None and len(self.documents) > 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector store."""
        return {
            "num_documents": len(self.documents),
            "has_vector_store": self.vector_store is not None,
        }
