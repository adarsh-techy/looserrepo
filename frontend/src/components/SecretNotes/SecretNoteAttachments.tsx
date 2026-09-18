import React, { useState, useRef } from 'react';
import { NoteAttachment, SecretNotePayload } from '../../types';
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  File,
  Download,
  Eye,
  Trash2,
  Paperclip,
  UploadCloud,
  Lock,
  Shield,
  X,
  AlertCircle,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from 'lucide-react';

/**
 * Parses secret note content string safely.
 * Returns structured payload with text & attachments, or falls back to legacy string.
 */
export function parseSecretNotePayload(rawContent: string): SecretNotePayload {
  if (!rawContent) return { text: '', attachments: [] };
  try {
    const parsed = JSON.parse(rawContent);
    if (parsed && typeof parsed === 'object' && ('text' in parsed || 'attachments' in parsed)) {
      return {
        text: typeof parsed.text === 'string' ? parsed.text : '',
        attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
      };
    }
  } catch (e) {
    // Legacy plain string format
  }
  return { text: rawContent, attachments: [] };
}

/**
 * Format raw byte size into human readable string.
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Determine appropriate icon for file MIME type or filename.
 */
export function getFileCategoryIcon(type: string, name: string) {
  const lowerName = name.toLowerCase();
  const lowerType = type.toLowerCase();

  if (lowerType.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp|ico)$/.test(lowerName)) {
    return <ImageIcon className="w-5 h-5 text-indigo-500" />;
  }
  if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
    return <FileText className="w-5 h-5 text-rose-500" />;
  }
  if (
    lowerType.includes('sheet') ||
    lowerType.includes('excel') ||
    lowerType.includes('csv') ||
    /\.(xlsx?|csv|tsv)$/.test(lowerName)
  ) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
  }
  if (
    lowerType.includes('text') ||
    lowerType.includes('json') ||
    lowerType.includes('javascript') ||
    /\.(txt|json|md|ts|js|py|html|css|xml|yaml|yml)$/.test(lowerName)
  ) {
    return <FileCode className="w-5 h-5 text-blue-500" />;
  }
  return <File className="w-5 h-5 text-amber-500" />;
}

// ----------------------------------------------------------------------
// 1. ATTACHMENT UPLOADER COMPONENT (FOR CREATE MODAL)
// ----------------------------------------------------------------------
interface AttachmentUploaderProps {
  attachments: NoteAttachment[];
  onChange: (attachments: NoteAttachment[]) => void;
  maxFileSizeMb?: number;
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  attachments,
  onChange,
  maxFileSizeMb = 10,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const processFiles = (files: FileList | File[]) => {
    setUploadError(null);
    const newAttachments: NoteAttachment[] = [];
    const maxBytes = maxFileSizeMb * 1024 * 1024;

    Array.from(files).forEach((file) => {
      if (file.size > maxBytes) {
        setUploadError(`"${file.name}" exceeds the ${maxFileSizeMb}MB limit. Please attach smaller files.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const attachment: NoteAttachment = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl: result,
        };
        newAttachments.push(attachment);

        // When all valid files in batch are processed, update parent
        if (newAttachments.length > 0) {
          onChange([...attachments, ...newAttachments]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = ''; // Reset input to allow selecting same file again
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  const totalBytes = attachments.reduce((acc, a) => acc + (a.size || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
          <span>Confidential Image & Document Uploads</span>
        </label>
        {attachments.length > 0 && (
          <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
            {attachments.length} {attachments.length === 1 ? 'file' : 'files'} ({formatFileSize(totalBytes)})
          </span>
        )}
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/70 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip,.csv,.json,.md"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            <span className="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-300 underline-offset-2">
              Click to browse
            </span>{' '}
            or drag & drop images and documents here
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm">
            PNG, JPG, WEBP, PDF, Word, Excel, TXT, ZIP up to {maxFileSizeMb}MB each. 100% encrypted via AES-256 before storage.
          </p>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Uploaded Files Chips/Grid */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {attachments.map((att) => {
            const isImg = att.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(att.name);

            return (
              <div
                key={att.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2.5 shadow-sm group hover:border-indigo-300 dark:hover:border-indigo-700 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {isImg && att.dataUrl ? (
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                      <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                      {getFileCategoryIcon(att.type, att.name)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={att.name}>
                      {att.name}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {formatFileSize(att.size)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(att.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 2. ATTACHMENT VIEWER & PREVIEW LIGHTBOX COMPONENT (FOR DECRYPTED VIEW)
// ----------------------------------------------------------------------
interface AttachmentViewerProps {
  attachments: NoteAttachment[];
  isOwner: boolean; // Author = true (can download), Partner = false (view-only, download restricted)
  noteTitle?: string;
}

export const AttachmentViewer: React.FC<AttachmentViewerProps> = ({
  attachments,
  isOwner,
  noteTitle = 'Secret Note',
}) => {
  const [activePreview, setActivePreview] = useState<NoteAttachment | null>(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="space-y-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
      {/* Header & Permissions Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            Decrypted Attachments ({attachments.length})
          </span>
        </div>

        {/* Security / Download Status Badge */}
        {isOwner ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>Author Access (Download Enabled)</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            <Lock className="w-3 h-3" />
            <span>Partner View-Only (Download Restricted)</span>
          </span>
        )}
      </div>

      {/* Grid of Attached Files */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {attachments.map((att) => {
          const isImg = att.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(att.name);

          return (
            <div
              key={att.id}
              className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start gap-3">
                {isImg && att.dataUrl ? (
                  <div
                    onClick={() => setActivePreview(att)}
                    className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer group relative"
                  >
                    <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover transition group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                    {getFileCategoryIcon(att.type, att.name)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={att.name}>
                    {att.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>{formatFileSize(att.size)}</span>
                    <span>•</span>
                    <span className="uppercase">{att.name.split('.').pop() || 'FILE'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                {/* Preview / View Button (Available to both author & partner) */}
                <button
                  type="button"
                  onClick={() => setActivePreview(att)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border border-slate-200 dark:border-slate-700"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>

                {/* Download Button: Rendered ONLY if isOwner === true */}
                {isOwner ? (
                  <a
                    href={att.dataUrl}
                    download={att.name}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 transition active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                ) : (
                  <div
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-500 rounded-xl text-[11px] font-medium flex items-center gap-1 border border-slate-200 dark:border-slate-800 cursor-not-allowed select-none"
                    title="Download is restricted to note author. Partner has view-only permissions."
                  >
                    <Lock className="w-3 h-3" />
                    <span>Download Restricted</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Preview Lightbox Modal */}
      {activePreview && (
        <PreviewLightboxModal
          attachment={activePreview}
          isOwner={isOwner}
          noteTitle={noteTitle}
          onClose={() => setActivePreview(null)}
        />
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 3. FULLSCREEN PREVIEW LIGHTBOX MODAL
// ----------------------------------------------------------------------
interface PreviewLightboxModalProps {
  attachment: NoteAttachment;
  isOwner: boolean;
  noteTitle: string;
  onClose: () => void;
}

const PreviewLightboxModal: React.FC<PreviewLightboxModalProps> = ({
  attachment,
  isOwner,
  noteTitle,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const isImg = attachment.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(attachment.name);
  const isPdf = attachment.type.includes('pdf') || attachment.name.toLowerCase().endsWith('.pdf');
  const isText =
    attachment.type.includes('text') ||
    attachment.type.includes('json') ||
    /\.(txt|json|md|csv|tsv|ts|js|py)$/i.test(attachment.name);

  // Decode text content if it's a text file
  let textDecoded = '';
  if (isText && attachment.dataUrl) {
    try {
      const base64Part = attachment.dataUrl.split(',')[1];
      if (base64Part) {
        textDecoded = atob(base64Part);
      }
    } catch (e) {
      textDecoded = 'Error decoding text content';
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-3 sm:p-6 animate-fade-in select-none"
      onContextMenu={(e) => {
        // Prevent right-click save as for partner to enforce download restriction
        if (!isOwner) {
          e.preventDefault();
        }
      }}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Lightbox Topbar */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-slate-800 text-indigo-400 shrink-0">
              {getFileCategoryIcon(attachment.type, attachment.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-white truncate max-w-sm sm:max-w-md" title={attachment.name}>
                  {attachment.name}
                </h3>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {formatFileSize(attachment.size)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                From secret note: <span className="text-slate-300">"{noteTitle}"</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Download Button / Restricted Indicator */}
            {isOwner ? (
              <a
                href={attachment.dataUrl}
                download={attachment.name}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download File</span>
              </a>
            ) : (
              <div
                className="px-3 py-1.5 bg-amber-950/80 border border-amber-800 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                title="Download is disabled for partner (View Only Mode)"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">View Only Mode</span>
              </div>
            )}

            {/* Image Zoom & Rotate Controls */}
            {isImg && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono px-1 text-slate-400">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white border-l border-slate-700 ml-1"
                  title="Rotate"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lightbox Viewer Canvas */}
        <div className="flex-1 bg-slate-950 p-4 sm:p-6 overflow-auto flex items-center justify-center relative">
          {/* Partner Watermark Protection */}
          {!isOwner && (
            <div className="absolute top-4 right-4 pointer-events-none z-10 bg-slate-900/80 backdrop-blur border border-slate-800 px-3 py-1 rounded-full text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-indigo-400" />
              <span>Protected Secret View</span>
            </div>
          )}

          {isImg ? (
            <div className="max-w-full max-h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={attachment.dataUrl}
                alt={attachment.name}
                draggable={isOwner}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-out',
                }}
                className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl pointer-events-auto"
              />
            </div>
          ) : isPdf ? (
            <div className="w-full h-full flex flex-col rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
              <iframe
                src={attachment.dataUrl}
                title={attachment.name}
                className="w-full h-full border-none"
              />
            </div>
          ) : isText ? (
            <div className="w-full h-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 overflow-auto">
              <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
                {textDecoded}
              </pre>
            </div>
          ) : (
            <div className="text-center space-y-4 max-w-md p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-slate-800 text-indigo-400 flex items-center justify-center mx-auto">
                {getFileCategoryIcon(attachment.type, attachment.name)}
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base text-white">{attachment.name}</h4>
                <p className="text-xs text-slate-400 font-mono">
                  {formatFileSize(attachment.size)} • {attachment.type}
                </p>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300">
                {isOwner
                  ? 'Binary document decrypted. Click Download above to save to your local system.'
                  : '🔒 Confidential binary document. Partner preview is enabled; direct downloading is restricted to the note author.'}
              </div>
            </div>
          )}
        </div>

        {/* Lightbox Footer Note */}
        <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950/90 text-center text-[11px] text-slate-500 flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>AES-256 Decrypted in Browser Sandbox</span>
          </span>
          <span className="font-mono text-slate-400">{attachment.name}</span>
        </div>
      </div>
    </div>
  );
};
