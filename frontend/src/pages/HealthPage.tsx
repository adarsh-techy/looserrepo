import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { showToast } from '../store/slices/uiSlice';
import { api } from '../services/api';
import { HealthPerson, HealthRecord, HealthAttachment } from '../types';
import { MedicalReportDetailPage } from '../components/Health/MedicalReportDetailPage';
import { DoctorDetailPage } from '../components/Health/DoctorDetailPage';
import { HealthAttachmentSection } from '../components/Health/HealthAttachmentSection';
import {
  HeartPulse,
  User,
  Users,
  Plus,
  ArrowLeft,
  ChevronRight,
  Search,
  FileText,
  Stethoscope,
  Calendar,
  Phone,
  Building2,
  Paperclip,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';

// Navigation Drill-Down Levels
type HealthViewLevel =
  | 'PERSON' // Level 1: Person Selection
  | 'ORGAN' // Level 2: Organ Selection
  | 'DEPARTMENT' // Level 3: Department Selection
  | 'DEPT_SECTIONS' // Level 4: 2 Sections Hub (Test Reports vs Doctor Cards)
  | 'TEST_REPORTS' // Level 5A: Test Reports (X-Ray, Blood Test, etc.)
  | 'DOCTOR_CARDS' // Level 5B: Doctor Cards
  | 'REPORT_DETAIL' // Level 6A: Medical Report Detail Page
  | 'DOCTOR_DETAIL'; // Level 6B: Doctor Consultation Detail Page

// Standard Organs List with Icons and Colors
interface OrganConfig {
  name: string;
  label: string;
  subtitle: string;
  iconText: string;
  badgeColor: string;
  defaultDepartments: string[];
}

const ORGANS_LIST: OrganConfig[] = [
  {
    name: 'Heart',
    label: 'Heart & Cardiovascular',
    subtitle: 'Circulatory, Blood Pressure, Arterial & Cardiac Health',
    iconText: '🫀',
    badgeColor: 'from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400',
    defaultDepartments: ['Cardiology', 'Cardiothoracic Surgery', 'Cardiac Rehabilitation'],
  },
  {
    name: 'Brain',
    label: 'Brain & Nervous System',
    subtitle: 'Neurology, Cognitive, Spine & Psychological Health',
    iconText: '🧠',
    badgeColor: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400',
    defaultDepartments: ['Neurology', 'Neurosurgery', 'Neuro-Psychiatry'],
  },
  {
    name: 'Lungs',
    label: 'Lungs & Respiratory',
    subtitle: 'Pulmonary, Breathing Capacity, Airway & Allergies',
    iconText: '🫁',
    badgeColor: 'from-sky-500/20 to-blue-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400',
    defaultDepartments: ['Pulmonology', 'Respiratory Medicine', 'Allergy & Sleep Care'],
  },
  {
    name: 'Liver',
    label: 'Liver & Digestive System',
    subtitle: 'Gastrointestinal, Hepatic, Stomach & Metabolic Gut',
    iconText: '🥩',
    badgeColor: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
    defaultDepartments: ['Gastroenterology', 'Hepatology', 'Surgical Gastroenterology'],
  },
  {
    name: 'Kidneys',
    label: 'Kidneys & Renal System',
    subtitle: 'Nephrology, Urinary Tract, Filtration & Electrolytes',
    iconText: '🫘',
    badgeColor: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    defaultDepartments: ['Nephrology', 'Urology', 'Renal Transplant Care'],
  },
  {
    name: 'Bones',
    label: 'Bones, Joints & Orthopedic',
    subtitle: 'Skeleton, Spine, Cartilage, Ligaments & Muscular',
    iconText: '🦴',
    badgeColor: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
    defaultDepartments: ['Orthopedics', 'Rheumatology', 'Sports Medicine & Physio'],
  },
  {
    name: 'Eyes',
    label: 'Eyes, ENT & Dental',
    subtitle: 'Vision, Ear Nose Throat & Oral Maxillofacial',
    iconText: '👁️',
    badgeColor: 'from-teal-500/20 to-emerald-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400',
    defaultDepartments: ['Ophthalmology', 'Otolaryngology (ENT)', 'Dental & Maxillofacial'],
  },
  {
    name: 'Blood',
    label: 'Blood, Endocrine & Thyroid',
    subtitle: 'Hematology, Diabetes, Hormonal & Metabolic Panel',
    iconText: '🩸',
    badgeColor: 'from-red-500/20 to-rose-500/10 border-red-500/30 text-red-600 dark:text-red-400',
    defaultDepartments: ['General Medicine', 'Endocrinology & Diabetology', 'Hematology'],
  },
  {
    name: 'General',
    label: 'General Wellness & Preventive',
    subtitle: 'Full Body Health Checkups, Executive Screenings & Vitals',
    iconText: '🩺',
    badgeColor: 'from-indigo-500/20 to-blue-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400',
    defaultDepartments: ['General Medicine', 'Preventive Health', 'Family Medicine'],
  },
];

// Test Categories for Section 1 (Test Reports)
interface TestCategoryConfig {
  key: string;
  name: string;
  iconText: string;
  desc: string;
}

const TEST_CATEGORIES: TestCategoryConfig[] = [
  { key: 'ALL', name: 'All Reports', iconText: '📋', desc: 'Complete chronological history of all diagnostics' },
  { key: 'X_RAY', name: 'X-Ray Reports', iconText: '🩻', desc: 'Digital Radiography, Chest, Spine & Limb Scans' },
  { key: 'BLOOD_TEST', name: 'Blood Tests', iconText: '🩸', desc: 'CBC, Lipid Profile, LFT, KFT, HbA1c & Biomarkers' },
  { key: 'MRI_CT', name: 'MRI & CT Scans', iconText: '🔬', desc: 'High-Resolution MRI, CT Contrast & Angiography' },
  { key: 'ULTRASOUND', name: 'Ultrasound (USG)', iconText: '🔊', desc: 'Abdominal, Pelvic, Doppler & Organ Echography' },
  { key: 'ECG_ECHO', name: 'ECG & Echo', iconText: '📈', desc: '12-Lead Electrocardiogram, 2D Echo & Stress Tests' },
  { key: 'PATHOLOGY', name: 'Biopsy & Pathology', iconText: '🧪', desc: 'Histopathology, Cytology, Cultures & Lab Reports' },
  { key: 'OTHER', name: 'Other Reports', iconText: '📄', desc: 'Discharge Summaries, Endoscopy & Special Tests' },
];

export const HealthPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Data States
  const [persons, setPersons] = useState<HealthPerson[]>([]);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Drill-Down Navigation States
  const [viewLevel, setViewLevel] = useState<HealthViewLevel>('PERSON');
  const [selectedPerson, setSelectedPerson] = useState<HealthPerson | null>(null);
  const [selectedOrgan, setSelectedOrgan] = useState<OrganConfig | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedTestCategory, setSelectedTestCategory] = useState<string>('ALL');

  // Modals & Detail States
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState(false);
  const [isAddReportModalOpen, setIsAddReportModalOpen] = useState(false);
  const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);
  const [inspectRecord, setInspectRecord] = useState<HealthRecord | null>(null);
  const [newReportAttachments, setNewReportAttachments] = useState<HealthAttachment[]>([]);
  const [newDoctorAttachments, setNewDoctorAttachments] = useState<HealthAttachment[]>([]);

  // New Person Form
  const [personName, setPersonName] = useState('');
  const [personRelationship, setPersonRelationship] = useState('Self');
  const [personGender, setPersonGender] = useState('Male');
  const [personDob, setPersonDob] = useState('');
  const [personBloodGroup, setPersonBloodGroup] = useState('O+');
  const [personNotes, setPersonNotes] = useState('');

  // New Test Report Form
  const [testName, setTestName] = useState('');
  const [testCategory, setTestCategory] = useState('BLOOD_TEST');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [labName, setLabName] = useState('');
  const [resultsSummary, setResultsSummary] = useState('');
  const [testStatus, setTestStatus] = useState<'NORMAL' | 'ATTENTION' | 'PENDING'>('NORMAL');
  const [testAttachmentName, setTestAttachmentName] = useState('');

  // New Doctor Consultation Form
  const [doctorName, setDoctorName] = useState('');
  const [doctorTitle, setDoctorTitle] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [consultDate, setConsultDate] = useState(new Date().toISOString().split('T')[0]);
  const [followUpDate, setFollowUpDate] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');

  // 1. Initial Load: Fetch Persons
  const fetchPersons = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<HealthPerson[]>('/health/persons');
      setPersons(Array.isArray(data) ? data : []);
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to load health profiles', type: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPersons();
  }, []);

  // 2. Fetch Records when a Person is selected
  const fetchRecordsForPerson = async (personId: string) => {
    try {
      const data = await api.get<HealthRecord[]>(`/health/records/${personId}`);
      setRecords(Array.isArray(data) ? data : []);
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to load health records', type: 'error' }));
    }
  };

  // Step 1: Select Person
  const handleSelectPerson = (person: HealthPerson) => {
    setSelectedPerson(person);
    fetchRecordsForPerson(person.id);
    setViewLevel('ORGAN');
    setSearchQuery('');
  };

  // Step 2: Select Organ
  const handleSelectOrgan = (organ: OrganConfig) => {
    setSelectedOrgan(organ);
    setViewLevel('DEPARTMENT');
    setSearchQuery('');
  };

  // Step 3: Select Department -> Enters Level 4 (2 Sections Hub: Test Reports vs Doctors)
  const handleSelectDepartment = (dept: string) => {
    setSelectedDepartment(dept);
    setViewLevel('DEPT_SECTIONS');
    setSearchQuery('');
  };

  // Step 4A: Choose Section 1 (Test Reports)
  const handleOpenTestReports = () => {
    setViewLevel('TEST_REPORTS');
    setSelectedTestCategory('ALL');
    setSearchQuery('');
  };

  // Step 4B: Choose Section 2 (Doctor Cards)
  const handleOpenDoctorCards = () => {
    setViewLevel('DOCTOR_CARDS');
    setSearchQuery('');
  };

  // Handle Back Navigation
  const handleBack = () => {
    if (viewLevel === 'REPORT_DETAIL') {
      setViewLevel('TEST_REPORTS');
    } else if (viewLevel === 'DOCTOR_DETAIL') {
      setViewLevel('DOCTOR_CARDS');
    } else if (viewLevel === 'TEST_REPORTS' || viewLevel === 'DOCTOR_CARDS') {
      setViewLevel('DEPT_SECTIONS');
    } else if (viewLevel === 'DEPT_SECTIONS') {
      setViewLevel('DEPARTMENT');
    } else if (viewLevel === 'DEPARTMENT') {
      setViewLevel('ORGAN');
    } else if (viewLevel === 'ORGAN') {
      setViewLevel('PERSON');
      setSelectedPerson(null);
    }
  };

  // Update Medical Record
  const handleUpdateRecord = async (updated: HealthRecord) => {
    try {
      const res = await api.patch<HealthRecord>(`/health/records/${updated.id}`, updated);
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? res : r)));
      setSelectedRecord(res);
      dispatch(showToast({ message: 'Medical record updated successfully', type: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to update record', type: 'error' }));
    }
  };

  // Delete Medical Record
  const handleDeleteRecord = async (recordId: string) => {
    try {
      await api.delete(`/health/records/${recordId}`);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      if (selectedRecord?.id === recordId) {
        setSelectedRecord(null);
        if (viewLevel === 'REPORT_DETAIL') setViewLevel('TEST_REPORTS');
        if (viewLevel === 'DOCTOR_DETAIL') setViewLevel('DOCTOR_CARDS');
      }
      dispatch(showToast({ message: 'Record deleted successfully', type: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to delete record', type: 'error' }));
    }
  };

  // Add Person Submission
  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) return;
    try {
      const newP = await api.post<HealthPerson>('/health/persons', {
        name: personName.trim(),
        relationship: personRelationship,
        gender: personGender,
        dob: personDob,
        bloodGroup: personBloodGroup,
        notes: personNotes,
      });
      setPersons((prev) => [...prev, newP]);
      setIsAddPersonModalOpen(false);
      setPersonName('');
      setPersonNotes('');
      dispatch(showToast({ message: `Health profile created for ${newP.name}`, type: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to add person profile', type: 'error' }));
    }
  };

  // Add Test Report Submission
  const handleCreateTestReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !selectedOrgan || !selectedDepartment || !testName.trim()) return;

    try {
      const attachments = [
        ...newReportAttachments,
        ...(testAttachmentName.trim()
          ? [{ name: testAttachmentName.trim(), size: '1.2 MB', type: 'application/pdf' }]
          : []),
      ];

      const newRec = await api.post<HealthRecord>('/health/records', {
        personId: selectedPerson.id,
        organName: selectedOrgan.name,
        departmentName: selectedDepartment,
        recordType: 'TEST_REPORT',
        testCategory,
        testName: testName.trim(),
        testDate,
        labName: labName.trim(),
        resultsSummary: resultsSummary.trim(),
        status: testStatus,
        attachments,
      });

      setRecords((prev) => [newRec, ...prev]);
      setIsAddReportModalOpen(false);
      setTestName('');
      setLabName('');
      setResultsSummary('');
      setTestAttachmentName('');
      setNewReportAttachments([]);
      dispatch(showToast({ message: 'Diagnostic test report saved', type: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to save test report', type: 'error' }));
    }
  };

  // Add Doctor Consultation Submission
  const handleCreateDoctorConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !selectedOrgan || !selectedDepartment || !doctorName.trim()) return;

    try {
      const newRec = await api.post<HealthRecord>('/health/records', {
        personId: selectedPerson.id,
        organName: selectedOrgan.name,
        departmentName: selectedDepartment,
        recordType: 'DOCTOR_CONSULTATION',
        doctorName: doctorName.trim(),
        doctorTitle: doctorTitle.trim(),
        hospitalName: hospitalName.trim(),
        contactPhone: contactPhone.trim(),
        consultDate,
        followUpDate: followUpDate || null,
        diagnosis: diagnosis.trim(),
        prescription: prescription.trim(),
        attachments: newDoctorAttachments,
      });

      setRecords((prev) => [newRec, ...prev]);
      setIsAddDoctorModalOpen(false);
      setDoctorName('');
      setDoctorTitle('');
      setHospitalName('');
      setContactPhone('');
      setDiagnosis('');
      setPrescription('');
      setNewDoctorAttachments([]);
      dispatch(showToast({ message: 'Doctor consultation & prescription saved', type: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to save doctor details', type: 'error' }));
    }
  };

  // Filtered Records for Current Department
  const deptRecords = useMemo(() => {
    if (!selectedOrgan || !selectedDepartment) return [];
    return records.filter(
      (r) =>
        r.organName.toLowerCase() === selectedOrgan.name.toLowerCase() &&
        r.departmentName.toLowerCase() === selectedDepartment.toLowerCase()
    );
  }, [records, selectedOrgan, selectedDepartment]);

  const testReports = useMemo(() => {
    let list = deptRecords.filter((r) => r.recordType === 'TEST_REPORT');
    if (selectedTestCategory !== 'ALL') {
      list = list.filter((r) => r.testCategory === selectedTestCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.testName?.toLowerCase().includes(q) ||
          r.labName?.toLowerCase().includes(q) ||
          r.resultsSummary?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [deptRecords, selectedTestCategory, searchQuery]);

  const doctorConsultations = useMemo(() => {
    let list = deptRecords.filter((r) => r.recordType === 'DOCTOR_CONSULTATION');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.doctorName?.toLowerCase().includes(q) ||
          r.hospitalName?.toLowerCase().includes(q) ||
          r.diagnosis?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [deptRecords, searchQuery]);

  return (
    <div className="space-y-5 flex flex-col min-h-[calc(100vh-120px)] pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <HeartPulse className="w-6 h-6 text-rose-500 animate-pulse" />
            <span>Health & Medical Records</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Hierarchical clinical records: Persons ➔ Organs ➔ Departments ➔ Test Reports & Doctor Consultations.
          </p>
        </div>

        {/* Global Action on Level 1 */}
        {viewLevel === 'PERSON' && (
          <button
            onClick={() => setIsAddPersonModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-rose-600/30 flex items-center gap-2 self-start sm:self-auto cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Family / Person Profile</span>
          </button>
        )}
      </div>

      {/* Interactive Breadcrumb Bar with Back Button */}
      <div className="flex items-center gap-2 p-2.5 px-3.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs shadow-xs overflow-x-auto">
        {viewLevel !== 'PERSON' && (
          <button
            onClick={handleBack}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 font-semibold shrink-0 cursor-pointer mr-1"
            title="Go to previous step"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-[11px]">Back</span>
          </button>
        )}

        <button
          onClick={() => {
            setViewLevel('PERSON');
            setSelectedPerson(null);
          }}
          className={`font-semibold hover:text-rose-500 transition shrink-0 ${
            viewLevel === 'PERSON' ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500'
          }`}
        >
          Health Profiles
        </button>

        {selectedPerson && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <button
              onClick={() => setViewLevel('ORGAN')}
              className={`font-semibold hover:text-rose-500 transition shrink-0 ${
                viewLevel === 'ORGAN' ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500'
              }`}
            >
              👤 {selectedPerson.name}
            </button>
          </>
        )}

        {selectedOrgan && viewLevel !== 'PERSON' && viewLevel !== 'ORGAN' && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <button
              onClick={() => setViewLevel('DEPARTMENT')}
              className={`font-semibold hover:text-rose-500 transition shrink-0 ${
                viewLevel === 'DEPARTMENT' ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500'
              }`}
            >
              {selectedOrgan.iconText} {selectedOrgan.name}
            </button>
          </>
        )}

        {selectedDepartment &&
          viewLevel !== 'PERSON' &&
          viewLevel !== 'ORGAN' &&
          viewLevel !== 'DEPARTMENT' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <button
                onClick={() => setViewLevel('DEPT_SECTIONS')}
                className={`font-semibold hover:text-rose-500 transition shrink-0 ${
                  viewLevel === 'DEPT_SECTIONS' ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500'
                }`}
              >
                🏥 {selectedDepartment}
              </button>
            </>
          )}

        {viewLevel === 'TEST_REPORTS' && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
              📋 Diagnostic Test Reports
            </span>
          </>
        )}

        {viewLevel === 'REPORT_DETAIL' && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <button
              onClick={() => setViewLevel('TEST_REPORTS')}
              className="font-semibold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition shrink-0"
            >
              📋 Diagnostic Test Reports
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0 truncate max-w-xs">
              📄 {selectedRecord?.testName || 'Report Detail'}
            </span>
          </>
        )}

        {viewLevel === 'DOCTOR_CARDS' && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">
              👨‍⚕️ Consulting Doctors & Prescriptions
            </span>
          </>
        )}

        {viewLevel === 'DOCTOR_DETAIL' && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <button
              onClick={() => setViewLevel('DOCTOR_CARDS')}
              className="font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition shrink-0"
            >
              👨‍⚕️ Consulting Doctors & Prescriptions
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0 truncate max-w-xs">
              🩺 {selectedRecord?.doctorName || 'Doctor Profile'}
            </span>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* LEVEL 1: PERSON SELECTION CARDS */}
      {/* ========================================================================= */}
      {viewLevel === 'PERSON' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-500" />
              <span>Select Individual / Partner Profile</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">Click on a person to inspect medical records</span>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-6 text-rose-500 gap-2">
              <HeartPulse className="w-5 h-5 animate-pulse" />
              <span className="text-xs font-semibold text-slate-500">Loading medical records...</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {persons.map((person) => {
              const isUserSelf = person.name.toLowerCase().includes('adarsh');
              const isPartner = person.name.toLowerCase().includes('vishnu');
              return (
                <div
                  key={person.id}
                  onClick={() => handleSelectPerson(person)}
                  className="group relative p-5 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/10 transition" />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-rose-500/30 shrink-0">
                        {person.name[0]?.toUpperCase() || 'P'}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition">
                          {person.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            {person.relationship}
                          </span>
                          {isUserSelf && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-[10px] font-black">
                              AD
                            </span>
                          )}
                          {isPartner && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900 text-[10px] font-black">
                              NS
                            </span>
                          )}
                          {person.bloodGroup && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-900 text-[10px] font-black">
                              🩸 {person.bloodGroup}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-400 group-hover:text-rose-500 transition">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  {person.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                      {person.notes}
                    </p>
                  )}

                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-500" />
                      <span>{person.totalTests || 0} Test Reports</span>
                    </span>
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
                      <span>{person.totalDoctors || 0} Doctors</span>
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Quick Add Person Card */}
            <div
              onClick={() => setIsAddPersonModalOpen(true)}
              className="p-5 border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 rounded-3xl flex flex-col items-center justify-center text-center space-y-2 cursor-pointer transition hover:bg-rose-50/20 dark:hover:bg-rose-950/10 min-h-[160px]"
            >
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <Plus className="w-5 h-5" />
              </div>
              <strong className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Add New Individual / Family Profile
              </strong>
              <p className="text-[11px] text-slate-500">Track tests, consultations & prescriptions</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 2: ORGAN SELECTION CARDS */}
      {/* ========================================================================= */}
      {viewLevel === 'ORGAN' && selectedPerson && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Select Organ / Anatomical System for</span>
                <span className="px-2.5 py-0.5 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold">
                  {selectedPerson.name}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Organ-specific categorization for reports, specialists and clinical diagnoses.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ORGANS_LIST.map((organ) => {
              const countForOrgan = records.filter(
                (r) => r.organName.toLowerCase() === organ.name.toLowerCase()
              ).length;
              return (
                <div
                  key={organ.name}
                  onClick={() => handleSelectOrgan(organ)}
                  className="group relative p-5 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl shrink-0 select-none">{organ.iconText}</span>
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition">
                          {organ.label}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {organ.defaultDepartments.length} Medical Departments
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${organ.badgeColor}`}
                    >
                      {countForOrgan} {countForOrgan === 1 ? 'Record' : 'Records'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {organ.subtitle}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[200px]">
                      Depts: {organ.defaultDepartments.join(', ')}
                    </span>
                    <span className="font-bold text-rose-500 group-hover:translate-x-1 transition flex items-center gap-0.5 shrink-0">
                      <span>Explore</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 3: DEPARTMENT SELECTION CARDS */}
      {/* ========================================================================= */}
      {viewLevel === 'DEPARTMENT' && selectedPerson && selectedOrgan && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{selectedOrgan.iconText}</span>
              <span>{selectedOrgan.label} Care Departments</span>
              <span className="text-xs text-slate-400 font-normal">({selectedPerson.name})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select medical department to view diagnostics, tests & consulting specialists.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedOrgan.defaultDepartments.map((dept) => {
              const deptRecordsCount = records.filter(
                (r) =>
                  r.organName.toLowerCase() === selectedOrgan.name.toLowerCase() &&
                  r.departmentName.toLowerCase() === dept.toLowerCase()
              );
              const testCount = deptRecordsCount.filter((r) => r.recordType === 'TEST_REPORT').length;
              const docCount = deptRecordsCount.filter((r) => r.recordType === 'DOCTOR_CONSULTATION').length;

              return (
                <div
                  key={dept}
                  onClick={() => handleSelectDepartment(dept)}
                  className="group p-5 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 shadow-xs">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                          {dept}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {selectedOrgan.name} Specialized Division
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Tests</span>
                      <span className="font-bold text-teal-600 dark:text-teal-400">{testCount} Reports</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Doctors</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{docCount} Consults</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 4: 2 SECTIONS HUB (Test Reports vs Doctor Cards) */}
      {/* ========================================================================= */}
      {viewLevel === 'DEPT_SECTIONS' && selectedPerson && selectedOrgan && selectedDepartment && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 text-xs font-bold">
                {selectedDepartment}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {selectedOrgan.name} • {selectedPerson.name}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              Select Medical Section
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose between viewing diagnostic test reports or consulting doctor profiles.
            </p>
          </div>

          {/* 2 Primary Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* SECTION 1: Test Reports Card */}
            <div
              onClick={handleOpenTestReports}
              className="group p-6 sm:p-7 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white dark:to-slate-900 rounded-3xl border-2 border-emerald-500/30 hover:border-emerald-500 transition-all duration-300 shadow-md hover:shadow-2xl hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <FileText className="w-7 h-7" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-black uppercase tracking-wider">
                    Section 1
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                    📋 Test Reports & Diagnostics
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                    X-Rays, Blood Tests, MRI Scans, CT Scans, Ultrasound & Lab Pathology records with findings and attached reports.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-emerald-500/20 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {deptRecords.filter((r) => r.recordType === 'TEST_REPORT').length} Reports Available
                </span>
                <button
                  type="button"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  <span>Open Test Reports</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SECTION 2: Doctor Consultations Card */}
            <div
              onClick={handleOpenDoctorCards}
              className="group p-6 sm:p-7 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-white dark:to-slate-900 rounded-3xl border-2 border-blue-500/30 hover:border-blue-500 transition-all duration-300 shadow-md hover:shadow-2xl hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Stethoscope className="w-7 h-7" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 text-xs font-black uppercase tracking-wider">
                    Section 2
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    👨‍⚕️ Consulting Doctors & Prescriptions
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                    Consulting physician profiles, clinic visits, contact details, diagnoses, follow-up alerts, and medication prescriptions.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-blue-500/20 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                  {deptRecords.filter((r) => r.recordType === 'DOCTOR_CONSULTATION').length} Doctors on File
                </span>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  <span>Open Doctor Cards</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 5A: TEST REPORTS VIEW (X-Ray, Blood Test, MRI/CT, USG, etc.) */}
      {/* ========================================================================= */}
      {viewLevel === 'TEST_REPORTS' && selectedPerson && selectedOrgan && selectedDepartment && (
        <div className="space-y-5 animate-fade-in">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/90 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-black uppercase">
                  Section 1 • Diagnostics
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {selectedDepartment} • {selectedPerson.name}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Diagnostic Reports & Scans
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none w-44"
                />
              </div>

              <button
                onClick={() => setIsAddReportModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Test Report</span>
              </button>
            </div>
          </div>

          {/* Test Category Filter Pills (X-Ray, Blood Test, MRI, etc.) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {TEST_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedTestCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  selectedTestCategory === cat.key
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                <span>{cat.iconText}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Test Reports List */}
          {testReports.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No Diagnostic Reports Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No {selectedTestCategory === 'ALL' ? '' : selectedTestCategory} reports logged for {selectedDepartment} yet.
              </p>
              <button
                onClick={() => setIsAddReportModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
              >
                + Add First Report
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => {
                    setSelectedRecord(report);
                    setViewLevel('REPORT_DETAIL');
                  }}
                  className="p-5 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 transition shadow-sm hover:shadow-md cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {report.testCategory || 'DIAGNOSTIC'}
                      </span>
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-1.5">
                        {report.testName}
                      </h4>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400 shrink-0 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{report.testDate}</span>
                    </span>
                  </div>

                  {report.labName && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{report.labName}</span>
                    </div>
                  )}

                  {report.resultsSummary && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 leading-relaxed font-mono">
                      {report.resultsSummary}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                        report.status === 'NORMAL'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{report.status || 'NORMAL'}</span>
                    </span>

                    {report.attachments && report.attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{report.attachments.length} Attachment</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 5B: DOCTOR CARDS VIEW (Dr. Name, Consultations, Prescriptions) */}
      {/* ========================================================================= */}
      {viewLevel === 'DOCTOR_CARDS' && selectedPerson && selectedOrgan && selectedDepartment && (
        <div className="space-y-5 animate-fade-in">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/90 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 text-[11px] font-black uppercase">
                  Section 2 • Specialists
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {selectedDepartment} • {selectedPerson.name}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Consulting Doctors & Prescriptions
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search doctors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none w-44"
                />
              </div>

              <button
                onClick={() => setIsAddDoctorModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Doctor Consultation</span>
              </button>
            </div>
          </div>

          {/* Doctor Cards List */}
          {doctorConsultations.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Stethoscope className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No Doctor Consultations Recorded
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No specialist doctor profiles or prescriptions logged for {selectedDepartment} yet.
              </p>
              <button
                onClick={() => setIsAddDoctorModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
              >
                + Add Doctor Profile
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctorConsultations.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedRecord(doc);
                    setViewLevel('DOCTOR_DETAIL');
                  }}
                  className="p-5 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition shadow-sm hover:shadow-md cursor-pointer space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20 shrink-0">
                        <Stethoscope className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-slate-900 dark:text-white">
                          {doc.doctorName}
                        </h4>
                        {doc.doctorTitle && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold block">
                            {doc.doctorTitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400 shrink-0 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{doc.consultDate}</span>
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    {doc.hospitalName && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{doc.hospitalName}</span>
                      </div>
                    )}
                    {doc.contactPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="font-mono text-slate-700 dark:text-slate-300">{doc.contactPhone}</span>
                      </div>
                    )}
                  </div>

                  {doc.diagnosis && (
                    <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Diagnosis:
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 font-medium line-clamp-2 leading-relaxed">
                        {doc.diagnosis}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    {doc.followUpDate ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Follow-up: {doc.followUpDate}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Regular checkup</span>
                    )}

                    <span className="font-bold text-blue-600 dark:text-blue-400 text-[11px] flex items-center gap-0.5">
                      <span>View Prescription</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 6A: MEDICAL REPORT DETAIL PAGE */}
      {/* ========================================================================= */}
      {viewLevel === 'REPORT_DETAIL' && selectedRecord && selectedPerson && selectedOrgan && selectedDepartment && (
        <MedicalReportDetailPage
          record={selectedRecord}
          person={selectedPerson}
          organName={selectedOrgan.name}
          departmentName={selectedDepartment}
          onBack={() => setViewLevel('TEST_REPORTS')}
          onUpdateRecord={handleUpdateRecord}
          onDeleteRecord={handleDeleteRecord}
        />
      )}

      {/* ========================================================================= */}
      {/* LEVEL 6B: DOCTOR CONSULTATION DETAIL PAGE */}
      {/* ========================================================================= */}
      {viewLevel === 'DOCTOR_DETAIL' && selectedRecord && selectedPerson && selectedOrgan && selectedDepartment && (
        <DoctorDetailPage
          record={selectedRecord}
          person={selectedPerson}
          organName={selectedOrgan.name}
          departmentName={selectedDepartment}
          onBack={() => setViewLevel('DOCTOR_CARDS')}
          onUpdateRecord={handleUpdateRecord}
          onDeleteRecord={handleDeleteRecord}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD PERSON MODAL */}
      {/* ========================================================================= */}
      {isAddPersonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-rose-500" />
                <span>Add Individual / Family Profile</span>
              </h3>
              <button
                onClick={() => setIsAddPersonModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePerson} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adarsh, Vishnu, Sarah..."
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Relationship
                  </label>
                  <select
                    value={personRelationship}
                    onChange={(e) => setPersonRelationship(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Self">Self</option>
                    <option value="Partner">Partner</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Family">Family Member</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={personBloodGroup}
                    onChange={(e) => setPersonBloodGroup(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={personGender}
                    onChange={(e) => setPersonGender(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={personDob}
                    onChange={(e) => setPersonDob(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Health Notes & Allergies
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Known drug allergies, chronic conditions, lifestyle remarks..."
                  value={personNotes}
                  onChange={(e) => setPersonNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPersonModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-md shadow-rose-600/30 transition"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD TEST REPORT MODAL */}
      {/* ========================================================================= */}
      {isAddReportModalOpen && selectedOrgan && selectedDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>Add Diagnostic Test Report</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  {selectedDepartment} • {selectedOrgan.name} ({selectedPerson?.name})
                </span>
              </div>
              <button
                onClick={() => setIsAddReportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTestReport} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Test / Investigation Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chest X-Ray PA View, Lipid Profile, 2D Echo..."
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Test Category
                  </label>
                  <select
                    value={testCategory}
                    onChange={(e) => setTestCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="X_RAY">X-Ray Reports</option>
                    <option value="BLOOD_TEST">Blood Tests</option>
                    <option value="MRI_CT">MRI & CT Scans</option>
                    <option value="ULTRASOUND">Ultrasound (USG)</option>
                    <option value="ECG_ECHO">ECG & Echo</option>
                    <option value="PATHOLOGY">Biopsy & Pathology</option>
                    <option value="OTHER">Other Diagnostic Test</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date Conducted
                  </label>
                  <input
                    type="date"
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Diagnostic Lab / Hospital
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apollo Diagnostics, Metropolis..."
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Clinical Status
                  </label>
                  <select
                    value={testStatus}
                    onChange={(e) => setTestStatus(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="NORMAL">Normal / Clear</option>
                    <option value="ATTENTION">Requires Attention / Elevated</option>
                    <option value="PENDING">Pending Final Review</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Key Findings & Result Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Normal sinus rhythm, Cholesterol 170 mg/dL, No fracture observed..."
                  value={resultsSummary}
                  onChange={(e) => setResultsSummary(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-1">
                <HealthAttachmentSection
                  attachments={newReportAttachments}
                  title="Upload Diagnostic Scans / Documents (Optional)"
                  subtitle="Attach medical scans, X-rays, or laboratory PDF files right now."
                  onUpdateAttachments={setNewReportAttachments}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddReportModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30 transition"
                >
                  Save Test Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD DOCTOR CONSULTATION MODAL */}
      {/* ========================================================================= */}
      {isAddDoctorModalOpen && selectedOrgan && selectedDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-blue-500" />
                  <span>Add Doctor Consultation & Prescription</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  {selectedDepartment} • {selectedOrgan.name} ({selectedPerson?.name})
                </span>
              </div>
              <button
                onClick={() => setIsAddDoctorModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDoctorConsultation} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Doctor's Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Qualification & Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MD, DM (Cardiology), FACC"
                    value={doctorTitle}
                    onChange={(e) => setDoctorTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hospital / Clinic Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apollo Hospital, Manipal..."
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98450 12345"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Consultation Date
                  </label>
                  <input
                    type="date"
                    value={consultDate}
                    onChange={(e) => setConsultDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Next Follow-up Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Diagnosis
                </label>
                <input
                  type="text"
                  placeholder="e.g. Routine Cardiac Clearance, Mild Muscular Strain..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Prescription & Advice
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. 1. Tab Multivitamin with Zinc OD for 30 days&#10;2. Continue 45 mins brisk cardio exercise daily..."
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-1">
                <HealthAttachmentSection
                  attachments={newDoctorAttachments}
                  title="Attach Prescriptions / Slips (Optional)"
                  subtitle="Attach doctor prescription slips, clinical notes or discharge summaries."
                  onUpdateAttachments={setNewDoctorAttachments}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDoctorModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md shadow-blue-600/30 transition"
                >
                  Save Doctor Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RECORD INSPECTION MODAL */}
      {/* ========================================================================= */}
      {inspectRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl text-white ${
                    inspectRecord.recordType === 'TEST_REPORT' ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}
                >
                  {inspectRecord.recordType === 'TEST_REPORT' ? (
                    <FileText className="w-5 h-5" />
                  ) : (
                    <Stethoscope className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {inspectRecord.testName || inspectRecord.doctorName}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {inspectRecord.organName} • {inspectRecord.departmentName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInspectRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {inspectRecord.recordType === 'TEST_REPORT' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Date</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        {inspectRecord.testDate}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Status</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {inspectRecord.status || 'NORMAL'}
                      </span>
                    </div>
                  </div>

                  {inspectRecord.labName && (
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                        Laboratory / Hospital
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                        {inspectRecord.labName}
                      </span>
                    </div>
                  )}

                  {inspectRecord.resultsSummary && (
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                        Test Findings & Values
                      </span>
                      <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100 text-xs leading-relaxed border border-slate-200 dark:border-slate-800">
                        {inspectRecord.resultsSummary}
                      </div>
                    </div>
                  )}

                  {inspectRecord.attachments && inspectRecord.attachments.length > 0 && (
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1.5">
                        Attached Diagnostic Documents
                      </span>
                      <div className="space-y-1.5">
                        {inspectRecord.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Paperclip className="w-4 h-4 text-blue-500" />
                              <span className="font-medium text-blue-900 dark:text-blue-200">{att.name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">{att.size || '1.5 MB'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Consult Date</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        {inspectRecord.consultDate}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Next Follow-Up</span>
                      <strong className="text-amber-600 dark:text-amber-400 font-mono">
                        {inspectRecord.followUpDate || 'None Scheduled'}
                      </strong>
                    </div>
                  </div>

                  {inspectRecord.hospitalName && (
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                        Hospital / Clinic Center
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                        {inspectRecord.hospitalName}
                      </span>
                    </div>
                  )}

                  {inspectRecord.contactPhone && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Contact:</span>
                      <a
                        href={`tel:${inspectRecord.contactPhone}`}
                        className="font-mono text-blue-600 dark:text-blue-400 font-bold hover:underline"
                      >
                        {inspectRecord.contactPhone}
                      </a>
                    </div>
                  )}

                  {inspectRecord.diagnosis && (
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                        Physician's Diagnosis
                      </span>
                      <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs leading-relaxed border border-slate-200 dark:border-slate-800 font-medium">
                        {inspectRecord.diagnosis}
                      </div>
                    </div>
                  )}

                  {inspectRecord.prescription && (
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                        Prescribed Medication & Advice
                      </span>
                      <pre className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 font-mono text-emerald-900 dark:text-emerald-300 text-xs leading-relaxed border border-emerald-200 dark:border-emerald-900/60 whitespace-pre-wrap">
                        {inspectRecord.prescription}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
