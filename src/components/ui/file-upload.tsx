'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface FileUploadProps {
  onUpload?: (files: File[]) => void;
  onUploadComplete?: (result: any) => void;
  acceptedFileTypes?: string;
  maxFileSize?: number; // in MB
  multiple?: boolean;
  disabled?: boolean;
}

interface UploadedFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  id: string;
  error?: string;
}

export function FileUpload({ 
  onUpload, 
  acceptedFileTypes = '.pdf,.doc,.docx,.ppt,.pptx',
  maxFileSize = 10,
  multiple = true,
  disabled = false 
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      alert(`File ${file.name} is too large. Maximum size is ${maxFileSize}MB.`);
      return false;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptedTypes = acceptedFileTypes.split(',').map(type => type.trim());
    if (!acceptedTypes.includes(fileExtension)) {
      alert(`File type ${fileExtension} is not supported.`);
      return false;
    }

    return true;
  };

  const processFiles = async (files: FileList) => {
    const validFiles: File[] = [];
    const newUploadedFiles: UploadedFile[] = [];

    Array.from(files).forEach(file => {
      if (validateFile(file)) {
        validFiles.push(file);
        newUploadedFiles.push({
          file,
          progress: 0,
          status: 'uploading',
          id: Math.random().toString(36).substr(2, 9)
        });
      }
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
      onUpload?.(validFiles);

      // Upload files to backend
      for (const uploadedFile of newUploadedFiles) {
        await uploadFileToBackend(uploadedFile);
      }
    }
  };

  const uploadFileToBackend = async (uploadedFile: UploadedFile) => {
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadedFiles(prev =>
          prev.map(file =>
            file.id === uploadedFile.id && file.status === 'uploading'
              ? { ...file, progress: Math.min(file.progress + Math.random() * 20, 90) }
              : file
          )
        );
      }, 500);

      const result = await apiClient.uploadDocument(uploadedFile.file);

      clearInterval(progressInterval);

      if (result.error) {
        setUploadedFiles(prev =>
          prev.map(file =>
            file.id === uploadedFile.id
              ? { ...file, status: 'error', error: result.error }
              : file
          )
        );
      } else if (result.data) {
        setUploadedFiles(prev =>
          prev.map(file =>
            file.id === uploadedFile.id
              ? { ...file, progress: 100, status: 'completed' }
              : file
          )
        );
        onUploadComplete?.(result.data);
      }
    } catch (error) {
      setUploadedFiles(prev =>
        prev.map(file =>
          file.id === uploadedFile.id
            ? { ...file, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
            : file
        )
      );
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [disabled, onUpload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input
    e.target.value = '';
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !disabled && document.getElementById('file-input')?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Files</h3>
            <p className="text-gray-600 mb-4">
              Drag and drop files here, or click to select files
            </p>
            <p className="text-sm text-gray-500">
              Supported formats: {acceptedFileTypes.replace(/\./g, '').toUpperCase()}
            </p>
            <p className="text-sm text-gray-500">
              Maximum file size: {maxFileSize}MB
            </p>
            <input
              id="file-input"
              type="file"
              multiple={multiple}
              accept={acceptedFileTypes}
              onChange={handleFileInput}
              className="hidden"
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Uploaded Files</CardTitle>
            <CardDescription>Track your file upload progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadedFiles.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="flex items-center space-x-3 p-3 border rounded-lg"
              >
                <File className="h-8 w-8 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadedFile.file.name}
                    </p>
                    <div className="flex items-center space-x-2">
                      {uploadedFile.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {uploadedFile.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadedFile.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress value={uploadedFile.progress} className="flex-1" />
                    <span className="text-xs text-gray-500">
                      {Math.round(uploadedFile.progress)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>
                  {uploadedFile.status === 'error' && uploadedFile.error && (
                    <p className="text-xs text-red-500 mt-1">
                      {uploadedFile.error}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}