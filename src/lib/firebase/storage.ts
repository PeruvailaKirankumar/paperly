// Firebase Storage Service
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll,
  getMetadata
} from 'firebase/storage';
import { storage, auth } from './config';

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export const storageService = {
  // Upload file to Firebase Storage
  async uploadFile(
    file: File,
    path: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const fullPath = `${path}/${fileName}`;
      const storageRef = ref(storage, fullPath);
      
      await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: auth.currentUser?.uid || 'unknown',
          ...metadata
        }
      });
      
      const downloadURL = await getDownloadURL(storageRef);
      
      return { 
        success: true, 
        url: downloadURL,
        path: fullPath
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  },

  // Upload material for a subject
  async uploadMaterial(file: File, subjectId: string): Promise<UploadResult> {
    return this.uploadFile(file, `materials/${subjectId}`, {
      subjectId,
      fileType: 'material'
    });
  },

  // Upload question paper PDF
  async uploadQuestionPaper(file: File, examId: string): Promise<UploadResult> {
    return this.uploadFile(file, `question_papers/${examId}`, {
      examId,
      fileType: 'question_paper'
    });
  },

  // Get download URL
  async getDownloadURL(path: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const storageRef = ref(storage, path);
      const url = await getDownloadURL(storageRef);
      return { success: true, url };
    } catch (error) {
      console.error('Error getting download URL:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  // Delete file
  async deleteFile(path: string): Promise<{ success: boolean; error?: string }> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  // List files in a directory
  async listFiles(path: string): Promise<{ success: boolean; files?: string[]; error?: string }> {
    try {
      const storageRef = ref(storage, path);
      const result = await listAll(storageRef);
      const files = result.items.map(item => item.fullPath);
      return { success: true, files };
    } catch (error) {
      console.error('Error listing files:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  // Get file metadata
  async getMetadata(path: string): Promise<{ success: boolean; metadata?: any; error?: string }> {
    try {
      const storageRef = ref(storage, path);
      const metadata = await getMetadata(storageRef);
      return { success: true, metadata };
    } catch (error) {
      console.error('Error getting metadata:', error);
      return { success: false, error: (error as Error).message };
    }
  }
};
