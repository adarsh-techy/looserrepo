import React, { useState, useRef } from 'react';
import { HealthAttachment } from '../../types';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  File,
  Download,
  Eye,
  Trash2,
  Paperclip,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

interface HealthAttachmentSectionProps {
  attachments: HealthAttachment[];
  title?: string;
  subtitle?: string;
  onUpdateAttachments?: (newAttachments: HealthAttachment[]) => void;
  isReadOnly?: boolean;
}

export function formatHealthFileSize(size?: number | string): string {
  if (!size) return '0 B';
  const numBytes = typeof size === 'number' ? size : parseInt(size, 10);
  if (isNaN(numBytes) || numBytes <= 0) {
    if (typeof size === 'string' && (size.includes('KB') || size.includes('MB') || size.includes('B'))) {
      return size;
    }
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));
  return `${parseFloat((numBytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getHealthFileIcon(type?: string, name?: string) {
  const lowerName = (name || '').toLowerCase();
  const lowerType = (type || '').toLowerCase();

  if (lowerType.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp)$/.test(lowerName)) {
    return <ImageIcon className="w-5 h-5 text-indigo-500" />;
  }
  if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
    return <FileText className="w-5 h-5 text-rose-500" />;
  }
  if (
    lowerType.includes('sheet') ||
    lowerType.includes('excel') ||
    lowerType.includes('csv') ||
    /\.(xlsx?|csv)$/.test(lowerName)
  ) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
  }
  if (
    lowerType.includes('text') ||
    lowerType.includes('json') ||
    /\.(txt|json|md|doc|docx)$/.test(lowerName)
  ) {
    return <FileCode className="w-5 h-5 text-blue-500" />;
  }
  return <File className="w-5 h-5 text-amber-500" />;
}

export const HealthAttachmentSection: React.FC<HealthAttachmentSectionProps> = ({
  attachments = [],
  title = 'Medical Documents & Scan Uploads',
  subtitle = 'Upload X-ray scans, MRI/CT DICOM reports, lab PDF slips, or physician prescriptions.',
  onUpdateAttachments,
  isReadOnly = false,
}) => {
  const [activePreview, setActivePreview] = useState<HealthAttachment | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Processing to Base64
  const processFiles = async (files: FileList | File[]) => {
    setUploadError(null);
    setIsProcessing(true);

    const maxFileSizeMb = 25;
    const newAttachments: HealthAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > maxFileSizeMb * 1024 * 1024) {
        setUploadError(`"${file.name}" exceeds the ${maxFileSizeMb}MB limit. Please upload a smaller scan or PDF.`);
        continue;
      }

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          uploadedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('File read error:', err);
      }
    }

    setIsProcessing(false);

    if (newAttachments.length > 0 && onUpdateAttachments) {
      onUpdateAttachments([...attachments, ...newAttachments]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isReadOnly) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    if (!onUpdateAttachments) return;
    const updated = attachments.filter((_, idx) => idx !== indexToRemove);
    onUpdateAttachments(updated);
  };

  const handleOpenPreview = (att: HealthAttachment) => {
    setActivePreview(att);
    setZoomLevel(1);
    setRotation(0);
  };

  const handleClosePreview = () => {
    setActivePreview(null);
    setZoomLevel(1);
    setRotation(0);
  };

  const isImageFile = (att: HealthAttachment) => {
    const lowerName = att.name.toLowerCase();
    const lowerType = (att.type || '').toLowerCase();
    return lowerType.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(lowerName);
  };

  const isPdfFile = (att: HealthAttachment) => {
    const lowerName = att.name.toLowerCase();
    const lowerType = (att.type || '').toLowerCase();
    return lowerType.includes('pdf') || lowerName.endsWith('.pdf');
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-rose-500" />
            <span>{title}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
              {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
            </span>
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {!isReadOnly && onUpdateAttachments && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-rose-600/30 self-start sm:self-auto cursor-pointer active:scale-95"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Scan / Doc</span>
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Drag & Drop Zone (if not read-only) */}
      {!isReadOnly && onUpdateAttachments && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-5 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 bg-slate-50/50 dark:bg-slate-900/40'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-sm">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Drag & drop medical scans, X-rays, or PDF test reports here
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Supports JPG, PNG, WEBP, DICOM scans, PDF, and DOCX files up to 25MB
            </p>
          </div>
          {isProcessing && (
            <div className="text-[11px] font-bold text-rose-500 animate-pulse">
              Reading and preparing file attachments...
            </div>
          )}
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-300 flex items-center justify-between">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="p-1 text-red-500 hover:text-red-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachments Grid */}
      {attachments.length === 0 ? (
        <div className="p-6 text-center rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No diagnostic images or document files attached to this record yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {attachments.map((att, idx) => {
            const isImg = isImageFile(att);
            const isPdf = isPdfFile(att);

            return (
              <div
                key={att.id || `att_${idx}`}
                className="group relative bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition hover:border-rose-400/50 dark:hover:border-rose-600/50"
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail or File Category Icon */}
                  {isImg && att.dataUrl ? (
                    <div
                      onClick={() => handleOpenPreview(att)}
                      className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer relative group/thumb"
                    >
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center text-white">
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                      {getHealthFileIcon(att.type, att.name)}
                    </div>
                  )}

                  {/* File Metadata */}
                  <div className="min-w-0 flex-1">
                    <h4
                      className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-rose-500 transition"
                      title={att.name}
                      onClick={() => handleOpenPreview(att)}
                    >
                      {att.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                      <span>{formatHealthFileSize(att.size)}</span>
                      <span>•</span>
                      <span className="uppercase font-mono">
                        {att.name.split('.').pop() || (isImg ? 'IMAGE' : isPdf ? 'PDF' : 'DOC')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions: Preview, Download, Delete */}
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    {/* View / Preview button */}
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(att)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95"
                      title="View full scan / preview"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </button>

                    {/* Download button */}
                    {att.dataUrl ? (
                      <a
                        href={att.dataUrl}
                        download={att.name}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm shadow-rose-600/20 active:scale-95 cursor-pointer"
                        title={`Download ${att.name}`}
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No Data</span>
                    )}
                  </div>

                  {/* Remove Button */}
                  {!isReadOnly && onUpdateAttachments && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                      title="Delete attachment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* IN-APP PREVIEW & LIGHTBOX MODAL */}
      {/* ===================================================================== */}
      {activePreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {getHealthFileIcon(activePreview.type, activePreview.name)}
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-white truncate">
                    {activePreview.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {formatHealthFileSize(activePreview.size)} • {activePreview.type || 'Document'}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Image controls */}
                {isImageFile(activePreview) && (
                  <div className="flex items-center bg-slate-800/80 rounded-xl p-1 gap-1 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setZoomLevel(1);
                        setRotation(0);
                      }}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
                      title="Reset Zoom & Rotation"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Download in Preview */}
                {activePreview.dataUrl && (
                  <a
                    href={activePreview.dataUrl}
                    download={activePreview.name}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-600/30 active:scale-95"
                    title="Download original file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                )}

                {/* Close modal */}
                <button
                  type="button"
                  onClick={handleClosePreview}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[360px] bg-slate-950/90 relative">
              {/* Image Preview */}
              {isImageFile(activePreview) && activePreview.dataUrl && (
                <div className="flex items-center justify-center w-full h-full min-h-[400px] overflow-auto">
                  <img
                    src={activePreview.dataUrl}
                    alt={activePreview.name}
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease-out',
                      maxHeight: '75vh',
                    }}
                    className="max-w-full object-contain rounded-lg shadow-2xl select-none"
                  />
                </div>
              )}

              {/* PDF Preview */}
              {isPdfFile(activePreview) && activePreview.dataUrl && (
                <div className="w-full h-[75vh] flex flex-col rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                  <iframe
                    src={activePreview.dataUrl}
                    title={activePreview.name}
                    className="w-full flex-1 border-0"
                  />
                  <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>PDF Document Loaded</span>
                    </span>
                    <a
                      href={activePreview.dataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
                    >
                      <span>Open in New Tab</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Other Documents */}
              {!isImageFile(activePreview) && !isPdfFile(activePreview) && (
                <div className="text-center p-8 space-y-4 max-w-md">
                  <div className="w-16 h-16 rounded-3xl bg-slate-800 mx-auto flex items-center justify-center text-slate-300">
                    {getHealthFileIcon(activePreview.type, activePreview.name)}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">
                      {activePreview.name}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      This document type does not support in-browser live rendering. You can download the file directly to view it in your local application.
                    </p>
                  </div>
                  {activePreview.dataUrl && (
                    <a
                      href={activePreview.dataUrl}
                      download={activePreview.name}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download File ({formatHealthFileSize(activePreview.size)})</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
