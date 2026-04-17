import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { BookOpen, Upload, X, FileText, Loader2, Download, Eye } from 'lucide-react';
import { KnowledgeDocument } from '../services/gemini';
import * as pdfjsLib from 'pdfjs-dist';
import { DocumentViewerModal } from './DocumentViewerModal';

// Set up the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface KnowledgeBaseUploaderProps {
  documents: KnowledgeDocument[];
  onDocumentsChange: (docs: KnowledgeDocument[]) => void;
}

export function KnowledgeBaseUploader({ documents, onDocumentsChange }: KnowledgeBaseUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<KnowledgeDocument | null>(null);

// ... keeping extractTextFromPdf, onDrop, getRootProps, removeDocument, downloadDocument exactly the same ...
  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    try {
      const newDocs: KnowledgeDocument[] = [];
      
      for (const file of acceptedFiles) {
        if (file.type === 'application/pdf') {
          try {
            const text = await extractTextFromPdf(file);
            newDocs.push({
              name: file.name,
              text,
              mimeType: 'text/plain'
            });
          } catch (err) {
            console.error("Failed to extract text from PDF, falling back to base64", err);
            // Fallback to base64 if text extraction fails
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = error => reject(error);
            });
            newDocs.push({
              name: file.name,
              base64,
              mimeType: file.type
            });
          }
        } else {
          // For text files, just read as text
          const text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsText(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });
          newDocs.push({
            name: file.name,
            text,
            mimeType: file.type || 'text/plain'
          });
        }
      }
      
      onDocumentsChange([...documents, ...newDocs]);
    } catch (error) {
      console.error("Error processing documents:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [documents, onDocumentsChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    }
  });

  const removeDocument = (index: number) => {
    const newDocs = [...documents];
    newDocs.splice(index, 1);
    onDocumentsChange(newDocs);
  };

  const downloadDocument = (doc: KnowledgeDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    if (doc.text) {
      const blob = new Blob([doc.text], { type: doc.mimeType || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      a.click();
      URL.revokeObjectURL(url);
    } else if (doc.base64) {
      const a = document.createElement('a');
      a.href = doc.base64;
      a.download = doc.name;
      a.click();
    }
  };

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <BookOpen className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-zinc-100">Campaign Knowledge Base</h2>
            <p className="text-sm text-zinc-400">Upload rulebooks (PHB, DMG, MM) or campaign lore.</p>
          </div>
        </div>

        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragActive ? 'border-amber-500 bg-amber-500/5' : 'border-zinc-700 hover:border-amber-500/50 hover:bg-zinc-800/50'
          }`}
        >
          <input {...getInputProps()} />
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2 text-amber-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm font-medium">Processing documents...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-400">
              <Upload className="w-6 h-6 mb-1" />
              <p className="text-sm font-medium text-zinc-300">Drop PDFs or text files here</p>
              <p className="text-xs">or click to browse</p>
            </div>
          )}
        </div>

        {documents.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Attached Documents</h3>
            {documents.map((doc, idx) => {
              let displayTitle = doc.name;
              let icon = <FileText className="w-4 h-4 text-amber-500 shrink-0" />;
              
              if (doc.name === 'world_state.md') { displayTitle = '🌍 The Living World'; icon = null; }
              else if (doc.name === 'npc_ledger.md') { displayTitle = '👥 Characters & Factions'; icon = null; }
              else if (doc.name === 'session_log.md') { displayTitle = '📜 Campaign Journal'; icon = null; }
              else if (doc.name === 'combat_tracker.md') { displayTitle = '⚔️ Active Battlefield'; icon = null; }

              return (
                <div key={idx} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg p-3 group hover:border-amber-500/30 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {icon}
                    <span className="text-sm font-display tracking-wide font-bold text-zinc-300 truncate group-hover:text-amber-500 transition-colors">
                      {displayTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setViewingDoc(doc); }}
                    className="p-1 text-zinc-500 hover:text-emerald-400 transition-colors"
                    title="View document"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => downloadDocument(doc, e)}
                    className="p-1 text-zinc-500 hover:text-amber-400 transition-colors"
                    title="Download document"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeDocument(idx); }}
                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Remove document"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {viewingDoc && (
        <DocumentViewerModal 
          document={viewingDoc} 
          onClose={() => setViewingDoc(null)} 
        />
      )}
    </>
  );
}
