import React, { useState } from 'react';
import { HealthRecord, HealthPerson, HealthAttachment } from '../../types';
import { HealthAttachmentSection } from './HealthAttachmentSection';
import {
  ArrowLeft,
  Calendar,
  Building2,
  Stethoscope,
  Phone,
  Copy,
  Check,
  Clock,
  Edit3,
  Save,
  Trash2,
  FileCheck2,
  Pill,
  HeartPulse,
} from 'lucide-react';

interface DoctorDetailPageProps {
  record: HealthRecord;
  person: HealthPerson;
  organName: string;
  departmentName: string;
  onBack: () => void;
  onUpdateRecord: (updatedRecord: HealthRecord) => void;
  onDeleteRecord?: (recordId: string) => void;
}

export const DoctorDetailPage: React.FC<DoctorDetailPageProps> = ({
  record,
  person,
  organName,
  departmentName,
  onBack,
  onUpdateRecord,
  onDeleteRecord,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [doctorName, setDoctorName] = useState(record.doctorName || '');
  const [doctorTitle, setDoctorTitle] = useState(record.doctorTitle || '');
  const [hospitalName, setHospitalName] = useState(record.hospitalName || '');
  const [contactPhone, setContactPhone] = useState(record.contactPhone || '');
  const [consultDate, setConsultDate] = useState(record.consultDate || '');
  const [followUpDate, setFollowUpDate] = useState(record.followUpDate || '');
  const [diagnosis, setDiagnosis] = useState(record.diagnosis || '');
  const [prescription, setPrescription] = useState(record.prescription || '');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Copy phone number to clipboard
  const handleCopyPhone = () => {
    if (!contactPhone) return;
    navigator.clipboard.writeText(contactPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Save changes
  const handleSaveChanges = async () => {
    setIsSaving(true);
    const updated: HealthRecord = {
      ...record,
      doctorName,
      doctorTitle,
      hospitalName,
      contactPhone,
      consultDate,
      followUpDate,
      diagnosis,
      prescription,
    };
    await onUpdateRecord(updated);
    setIsSaving(false);
    setIsEditing(false);
  };

  // Update attachments (prescription scans, discharge summaries)
  const handleUpdateAttachments = async (newAttachments: HealthAttachment[]) => {
    const updated: HealthRecord = {
      ...record,
      attachments: newAttachments,
    };
    await onUpdateRecord(updated);
  };

  const isUserSelf = person.name.toLowerCase().includes('adarsh');

  // Check follow-up urgency
  const getFollowUpStatus = () => {
    if (!record.followUpDate) return null;
    const target = new Date(record.followUpDate).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Past Due (${Math.abs(diffDays)}d ago)`, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800' };
    }
    if (diffDays === 0) {
      return { text: 'Scheduled for Today!', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800 animate-pulse' };
    }
    if (diffDays <= 7) {
      return { text: `Upcoming in ${diffDays} days`, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800' };
    }
    return { text: `Scheduled for ${record.followUpDate}`, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800' };
  };

  const followUpStatus = getFollowUpStatus();

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
            <span>Back to Doctors</span>
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-blue-600/30 cursor-pointer disabled:opacity-50"
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
              <span>Edit Doctor Profile</span>
            </button>
          )}

          {onDeleteRecord && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete consultation with "${record.doctorName || 'this doctor'}"?`)) {
                  onDeleteRecord(record.id);
                }
              }}
              className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
              title="Delete consultation record"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Hero Doctor Profile Banner */}
      <div className="relative p-6 sm:p-7 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-xl shadow-blue-500/25 shrink-0 font-black">
              <Stethoscope className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-black uppercase tracking-wider">
                  {departmentName} Specialist
                </span>

                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                  Patient: {person.name}
                </span>

                {isUserSelf && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-900 text-[10px] font-black">
                    AD
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={doctorName}
                    placeholder="Doctor Name (e.g. Dr. Rajesh Sharma)"
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full text-xl font-black bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1 text-slate-900 dark:text-white outline-none"
                  />
                  <input
                    type="text"
                    value={doctorTitle}
                    placeholder="Title / Degrees (e.g. MD, DM Cardiology, FACC)"
                    onChange={(e) => setDoctorTitle(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1 text-slate-700 dark:text-slate-300 outline-none"
                  />
                </div>
              ) : (
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {record.doctorName || 'Consulting Specialist'}
                  </h1>
                  {record.doctorTitle && (
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {record.doctorTitle}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span>{organName} Organ Category</span>
                <span>•</span>
                <span>{departmentName} Department</span>
              </p>
            </div>
          </div>

          {/* Quick Contact & Calling Card */}
          <div className="shrink-0 space-y-2">
            {record.contactPhone ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0 pr-2">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Direct Phone</div>
                  <a
                    href={`tel:${record.contactPhone}`}
                    className="text-xs font-bold text-slate-900 dark:text-white hover:text-emerald-600 transition"
                  >
                    {record.contactPhone}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
                  title="Copy Phone"
                >
                  {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : isEditing ? (
              <input
                type="text"
                placeholder="Phone (e.g. +91 98765 43210)"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none w-48"
              />
            ) : null}

            {followUpStatus && (
              <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-2 ${followUpStatus.color}`}>
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Follow-Up: {followUpStatus.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Metadata Badges Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Hospital / Clinic</div>
              {isEditing ? (
                <input
                  type="text"
                  placeholder="e.g. Fortis Healthcare"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="bg-transparent border-b border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none w-full"
                />
              ) : (
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {record.hospitalName || 'Clinic / Hospital'}
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Consult Date</div>
              {isEditing ? (
                <input
                  type="date"
                  value={consultDate}
                  onChange={(e) => setConsultDate(e.target.value)}
                  className="bg-transparent border-b border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none w-full"
                />
              ) : (
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {record.consultDate || 'Not Specified'}
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Follow-Up Target</div>
              {isEditing ? (
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="bg-transparent border-b border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none w-full"
                />
              ) : (
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {record.followUpDate || 'None Scheduled'}
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Medical Field</div>
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {departmentName}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Assessment & Diagnosis */}
      <div className="p-6 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-blue-500" />
            <span>Physician Clinical Assessment & Diagnosis</span>
          </h3>
          <span className="text-[11px] text-slate-400">Symptoms, clinical diagnosis & advice</span>
        </div>

        {isEditing ? (
          <textarea
            rows={4}
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="Enter clinical assessment, confirmed diagnosis, or doctor's dietary/lifestyle advice..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
          />
        ) : (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            {record.diagnosis ? (
              <p className="whitespace-pre-wrap">{record.diagnosis}</p>
            ) : (
              <p className="text-slate-400 italic">
                No clinical diagnosis logged for this visit. Click "Edit Doctor Profile" to enter details.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Prescriptions & Medication Schedule */}
      <div className="p-6 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Pill className="w-4 h-4 text-emerald-500" />
            <span>Prescriptions & Medication Schedule</span>
          </h3>
          <span className="text-[11px] text-slate-400">Active dosages, frequencies & timings</span>
        </div>

        {isEditing ? (
          <textarea
            rows={4}
            value={prescription}
            onChange={(e) => setPrescription(e.target.value)}
            placeholder="e.g. 1. Rosuvastatin 10mg - Once daily at night&#10;2. Aspirin 75mg - Once daily after breakfast..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono leading-relaxed"
          />
        ) : (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs leading-relaxed font-sans text-slate-800 dark:text-slate-200">
            {record.prescription ? (
              <div className="whitespace-pre-wrap font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900">
                {record.prescription}
              </div>
            ) : (
              <p className="text-slate-400 italic">
                No active medications or prescriptions recorded for this consultation.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Prescription Slips & Consultation Documents Upload Section */}
      <div className="p-6 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <HealthAttachmentSection
          attachments={record.attachments || []}
          title="Prescription Slips & Consultation Documents"
          subtitle="Upload handwritten prescription slips, hospital discharge summaries, or referral letters. View in-app or download at any time."
          onUpdateAttachments={handleUpdateAttachments}
        />
      </div>
    </div>
  );
};
