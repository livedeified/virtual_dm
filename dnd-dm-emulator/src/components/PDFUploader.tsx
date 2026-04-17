import React, { useState } from 'react';
import { Upload, FileText } from 'lucide-react';

interface PDFUploaderProps {
  onUpload: (base64: string) => void;
  isLoading: boolean;
}

export function PDFUploader({ onUpload, isLoading }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      if (base64) {
        onUpload(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-serif text-amber-500 mb-4 tracking-wider">Awaken Your Character</h1>
        <p className="text-zinc-400 max-w-md mx-auto">
          Upload your D&D character sheet PDF to breathe life into your hero. The arcane energies will analyze their stats, backstory, and personality.
        </p>
      </div>

      <div
        className={`w-full max-w-xl p-12 border-2 border-dashed rounded-2xl transition-all duration-300 flex flex-col items-center justify-center cursor-pointer
          ${isDragging ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 bg-zinc-900/50 hover:border-amber-500/50 hover:bg-zinc-800/50'}
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && document.getElementById('pdf-upload')?.click()}
      >
        <input
          id="pdf-upload"
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleChange}
          disabled={isLoading}
        />
        
        {isLoading ? (
          <div className="flex flex-col items-center animate-pulse">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-amber-500 font-medium">Summoning character spirit...</p>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-black/50">
              <Upload className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-xl font-medium text-zinc-200 mb-2">Upload Character Sheet</h3>
            <p className="text-zinc-500 text-sm text-center">
              Drag and drop your PDF here, or click to browse
            </p>
          </>
        )}
      </div>
    </div>
  );
}
