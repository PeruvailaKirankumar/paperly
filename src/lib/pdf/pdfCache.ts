import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { GeneratedPaper, generatedPaperService } from '@/lib/firebase/firestore';

const DB_NAME = 'PaperlyPDFCache';
const DB_VERSION = 1;
const STORE_NAME = 'pdfs';

interface CachedPDF {
  id: string;
  blob: Blob;
  cachedAt: string;
  paperMetadata: {
    examTitle: string;
    examDate: string;
    subjectName: string;
  };
}

// IndexedDB utilities
class PDFCacheDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async savePDF(id: string, blob: Blob, metadata: CachedPDF['paperMetadata']): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const cachedPDF: CachedPDF = {
        id,
        blob,
        cachedAt: new Date().toISOString(),
        paperMetadata: metadata
      };

      const request = store.put(cachedPDF);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPDF(id: string): Promise<CachedPDF | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePDF(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCachedPDFs(): Promise<CachedPDF[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearCache(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

const pdfCache = new PDFCacheDB();

// PDF Storage and Management Service
export const pdfStorageService = {
  /**
   * Upload PDF to Firebase Storage
   */
  async uploadPDF(
    paperId: string,
    blob: Blob,
    metadata: { subjectCode: string; examType: string; examDate: string }
  ): Promise<{ storagePath: string; downloadURL: string }> {
    const filename = `${metadata.subjectCode}_${metadata.examType}_${new Date(metadata.examDate).toISOString().split('T')[0]}_${paperId}.pdf`;
    const storagePath = `question_papers/${metadata.subjectCode}/${filename}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, blob, {
      contentType: 'application/pdf',
      customMetadata: {
        paperId,
        uploadedAt: new Date().toISOString(),
        ...metadata
      }
    });

    const downloadURL = await getDownloadURL(storageRef);

    return { storagePath, downloadURL };
  },

  /**
   * Delete PDF from Firebase Storage
   */
  async deletePDF(storagePath: string): Promise<void> {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  },

  /**
   * Get or generate PDF for a paper
   * Priority: 1) Local cache, 2) Firebase Storage, 3) Regenerate
   */
  async getPDF(paper: GeneratedPaper): Promise<{ blob: Blob; source: 'cache' | 'storage' | 'regenerated' }> {
    if (!paper.id) {
      throw new Error('Paper must have an ID');
    }

    // 1. Check local cache first
    const cached = await pdfCache.getPDF(paper.id);
    if (cached) {
      console.log('PDF found in local cache');
      return { blob: cached.blob, source: 'cache' };
    }

    // 2. Check Firebase Storage
    if (paper.pdfUrl) {
      try {
        console.log('Downloading PDF from Firebase Storage');
        const response = await fetch(paper.pdfUrl);
        if (response.ok) {
          const blob = await response.blob();
          
          // Cache it locally for future use
          await pdfCache.savePDF(paper.id, blob, {
            examTitle: paper.examTitle,
            examDate: paper.examDate,
            subjectName: paper.subjectName
          });

          return { blob, source: 'storage' };
        }
      } catch (error) {
        console.error('Error downloading PDF from storage:', error);
      }
    }

    // 3. PDF not available - needs regeneration
    throw new Error('PDF_REGENERATION_REQUIRED');
  },

  /**
   * Save generated PDF (to both cache and storage)
   */
  async savePDF(
    paper: GeneratedPaper,
    blob: Blob
  ): Promise<{ storagePath: string; downloadURL: string }> {
    if (!paper.id) {
      throw new Error('Paper must have an ID');
    }

    // Save to local cache
    await pdfCache.savePDF(paper.id, blob, {
      examTitle: paper.examTitle,
      examDate: paper.examDate,
      subjectName: paper.subjectName
    });

    // Upload to Firebase Storage
    const { storagePath, downloadURL } = await this.uploadPDF(
      paper.id,
      blob,
      {
        subjectCode: paper.courseCode,
        examType: paper.examType,
        examDate: paper.examDate
      }
    );

    // Update Firestore record
    if (paper.id) {
      await generatedPaperService.update(paper.id, {
        pdfStoragePath: storagePath,
        pdfUrl: downloadURL,
        pdfGenerated: true,
        localCacheKey: paper.id
      });
    }

    return { storagePath, downloadURL };
  },

  /**
   * Delete PDF (from cache, storage, and Firestore)
   */
  async deletePaperCompletely(paper: GeneratedPaper): Promise<void> {
    if (!paper.id) {
      throw new Error('Paper must have an ID');
    }

    // Delete from local cache
    try {
      await pdfCache.deletePDF(paper.id);
    } catch (error) {
      console.error('Error deleting from cache:', error);
    }

    // Delete from Firebase Storage
    if (paper.pdfStoragePath) {
      try {
        await this.deletePDF(paper.pdfStoragePath);
      } catch (error) {
        console.error('Error deleting from storage:', error);
      }
    }

    // Delete from Firestore
    await generatedPaperService.delete(paper.id);
  },

  /**
   * Clear all cached PDFs (local only)
   */
  async clearLocalCache(): Promise<void> {
    await pdfCache.clearCache();
  },

  /**
   * Get all cached PDFs info
   */
  async getCachedPDFsInfo(): Promise<Array<{ id: string; metadata: CachedPDF['paperMetadata']; cachedAt: string }>> {
    const cached = await pdfCache.getAllCachedPDFs();
    return cached.map(c => ({
      id: c.id,
      metadata: c.paperMetadata,
      cachedAt: c.cachedAt
    }));
  },

  /**
   * Check if PDF is available locally
   */
  async isPDFCachedLocally(paperId: string): Promise<boolean> {
    const cached = await pdfCache.getPDF(paperId);
    return cached !== null;
  },

  /**
   * Download PDF to user's device
   */
  downloadPDFToDevice(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
