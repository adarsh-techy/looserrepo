import React, { useState } from 'react';
import { HealthRecord, HealthPerson, HealthAttachment } from '../../types';
import { HealthAttachmentSection } from './HealthAttachmentSection';
import {
  ArrowLeft,
  Calendar,
  Building2,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit3,
  Save,
  Trash2,
  ShieldCheck,
} from 'lucide-react';

interface MedicalReportDetailPageProps {
  record: HealthRecord;
  person: HealthPerson;
  organName: string;
  departmentName: string;
  onBack: () => void;
  onUpdateRecord: (updatedRecord: HealthRecord) => void;
  onDeleteRecord?: (recordId: string) => void;
}

export const MedicalReportDetailPage: React.FC<MedicalReportDetailPageProps> = ({
  record,
  person,
  organName,
  departmentName,
  onBack,
  onUpdateRecord,
  onDeleteRecord,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [testName, setTestName] = useState(record.testName || '');
  const [testDate, setTestDate] = useState(record.testDate || '');
  const [labName, setLabName] = useState(record.labName || '');
  const [resultsSummary, setResultsSummary] = useState(record.resultsSummary || '');
  const [status, setStatus] = useState<'NORMAL' | 'ATTENTION' | 'PENDING'>(
    record.status || 'NORMAL'
  );
  const [isSaving, setIsSaving] = useState(false);

  // Status badge helper
  const getStatusBadge = (st: 'NORMAL' | 'ATTENTION' | 'PENDING') => {
    switch (st) {
      case 'NORMAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Normal / Biological Reference Met</span>
          </span>
        );
      case 'ATTENTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Requires Attention / Clinical Follow-up</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold shadow-sm">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Pending Pathologist Review</span>
          </span>
        );
    }
  };

  // Category Icon & Name Helper
  const getCategoryDetails = (cat?: string) => {
    switch (cat) {
      case 'X_RAY':
        return { iconText: '🩻', label: 'Radiography / X-Ray' };
      case 'BLOOD_TEST':
        return { iconText: '🩸', label: 'Hematology / Blood Test' };
      case 'MRI_CT':
        return { iconText: '🧲', label: 'MRI / CT Cross-Sectional Scan' };
      case 'ULTRASOUND':
        return { iconText: '🔊', label: 'Ultrasound / Sonography (USG)' };
      case 'ECG_ECHO':
        return { iconText: '📈', label: 'ECG / Echocardiography' };
      case 'PATHOLOGY':
        return { iconText: '🧪', label: 'Biopsy & Histopathology' };
      default:
        return { iconText: '📄', label: 'Diagnostic Laboratory Report' };
    }
  };

  const catInfo = getCategoryDetails(record.testCategory);

  // Save changes
  const handleSaveChanges = async () => {
    setIsSaving(true);
    const updated = {
      ...record,
      testName,
      testDate,
      labName,
      resultsSummary,
      status,
    };
    await onUpdateRecord(updated);
    setIsSaving(false);
    setIsEditing(false);
  };

  // Sync attachments with backend & parent
  const handleUpdateAttachments = async (newAttachments: HealthAttachment[]) => {
    const updated = {
      ...record,
      attachments: newAttachments,
    };
    await onUpdateRecord(updated);
  };

  const isUserSelf = person.name.toLowerCase().includes('adarsh');

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/90 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto justify-center px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Test Reports</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span>{person.name}</span>
            <span>/</span>
            <span>{organName}</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200 font-semibold">{departmentName}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {isEditing ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveChanges}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
          )}

          {onDeleteRecord && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete "${record.testName || 'this report'}"?`)) {
                  onDeleteRecord(record.id);
                }
              }}
              className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
              title="Delete this medical report"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Hero Overview Card */}
      <div className="relative p-6 sm:p-7 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center text-3xl shadow-xl shadow-emerald-500/25 shrink-0">
              {catInfo.iconText}
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-black uppercase tracking-wider">
                  {catInfo.label}
                </span>

                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                  {person.name}
                </span>

                {isUserSelf && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-900 text-[10px] font-black">
                    AD
                  </span>
                )}

                {person.bloodGroup && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-900 text-[11px] font-black">
                    🩸 {person.bloodGroup}
                  </span>
                )}
              </div>

              {isEditing ? (
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full text-xl sm:text-2xl font-black bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              ) : (
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {record.testName || 'Diagnostic Test Report'}
                </h1>
              )}

              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span>{organName} Organ Group</span>
                <span>•</span>
                <span>{departmentName} Specialty</span>
              </p>
            </div>
          </div>

          {/* Status Display / Switcher */}
          <div className="shrink-0 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Diagnostic Review Status
            </div>

            {isEditing ? (
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
              >
                <option value="NORMAL">Normal / Clear</option>
                <option value="ATTENTION">Requires Attention / Follow-up</option>
                <option value="PENDING">Pending Final Review</option>
              </select>
            ) : (
              <div>{getStatusBadge(record.status || 'NORMAL')}</div>
            )}
          </div>
        </div>

        {/* Metadata Badges Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Test Date</div>
              {isEditing ? (
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="bg-transparent border-b border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none w-full"
                />
              ) : (
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {record.testDate || 'Not Specified'}
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Diagnostic Center</div>
              {isEditing ? (
                <input
                  type="text"
                  placeholder="e.g. Apollo Diagnostics"
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  className="bg-transparent border-b border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none w-full"
                />
              ) : (
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {record.labName || 'Diagnostic Laboratory'}
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Target Organ</div>
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {organName}
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Security Vault</div>
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                Encrypted & Verified
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Findings & Results Section */}
      <div className="p-6 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>Clinical Findings & Pathology Summary</span>
          </h3>
          <span className="text-[11px] text-slate-400">Key physiological measurements & observations</span>
        </div>

        {isEditing ? (
          <textarea
            rows={4}
            value={resultsSummary}
            onChange={(e) => setResultsSummary(e.target.value)}
            placeholder="Document key clinical findings, reference ranges, and doctor observations..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
          />
        ) : (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            {record.resultsSummary ? (
              <p className="whitespace-pre-wrap">{record.resultsSummary}</p>
            ) : (
              <p className="text-slate-400 italic">
                No summary or findings documented for this report yet. Click "Edit Details" to add observations.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Image & Document File Upload Section (With In-App Viewer & Download) */}
      <div className="p-6 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <HealthAttachmentSection
          attachments={record.attachments || []}
          title="Diagnostic Scans & Medical Report Attachments"
          subtitle="Upload radiographic scans (X-Ray, MRI, CT), ultrasound snapshots, or laboratory PDF files. You can preview them in-app or download directly."
          onUpdateAttachments={handleUpdateAttachments}
        />
      </div>
    </div>
  );
};
