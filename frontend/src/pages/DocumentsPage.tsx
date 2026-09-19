import React, { useState, useEffect } from 'react';
import {
  Landmark,
  CreditCard,
  ShieldCheck,
  HeartHandshake,
  Search,
  Plus,
  ArrowLeft,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  X,
  FileText,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem, DocumentCategory, DocumentSubType, DocumentAttachment } from '../types/document';
import { RealisticCardView } from '../components/Documents/RealisticCardView';
import { DocumentCardModal } from '../components/Documents/DocumentCardModal';

export const DocumentsPage: React.FC = () => {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // View state: 'ALL' (shows 4 hero cards) or specific category
  const [activeCategory, setActiveCategory] = useState<DocumentCategory | 'ALL'>('ALL');
  const [activeDocSubType, setActiveDocSubType] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DocumentItem | null>(null);
  const [modalDefaultCategory, setModalDefaultCategory] = useState<DocumentCategory>('BANK');
  const [modalDefaultSubType, setModalDefaultSubType] = useState<DocumentSubType | undefined>(undefined);

  // In-app attachment viewer lightbox
  const [viewerAttachment, setViewerAttachment] = useState<{ attachment: DocumentAttachment; title: string } | null>(null);
  const [viewerZoom, setViewerZoom] = useState(1);
  const [viewerRotation, setViewerRotation] = useState(0);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch document items from backend
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await api.get<DocumentItem[]>('/documents');
      setItems(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch documents:', err);
      setError('Could not load documents. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Filtered items
  const filteredItems = items.filter((item) => {
    // Category match
    if (activeCategory !== 'ALL' && item.category !== activeCategory) return false;

    // Document sub-type match (when inside DOCUMENTS view)
    if (activeCategory === 'DOCUMENTS' && activeDocSubType !== 'ALL') {
      if (activeDocSubType === 'CUSTOM') {
        const standardTypes = ['DRIVING_LICENSE', 'AADHAAR', 'PAN', 'PASSPORT', 'VOTER_ID'];
        if (standardTypes.includes(item.subType || '')) return false;
      } else if (item.subType !== activeDocSubType) {
        return false;
      }
    }

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.holderName && item.holderName.toLowerCase().includes(q)) ||
        (item.bankName && item.bankName.toLowerCase().includes(q)) ||
        (item.accountNumber && item.accountNumber.toLowerCase().includes(q)) ||
        (item.ifscCode && item.ifscCode.toLowerCase().includes(q)) ||
        (item.cardNumber && item.cardNumber.toLowerCase().includes(q)) ||
        (item.docNumber && item.docNumber.toLowerCase().includes(q)) ||
        (item.policyNumber && item.policyNumber.toLowerCase().includes(q)) ||
        (item.insurerName && item.insurerName.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    }

    return true;
  });

  // Category counts
  const bankCount = items.filter((i) => i.category === 'BANK').length;
  const atmCount = items.filter((i) => i.category === 'ATM').length;
  const docsCount = items.filter((i) => i.category === 'DOCUMENTS').length;
  const insuranceCount = items.filter((i) => i.category === 'INSURANCE').length;

  // Handle Save (Create or Update)
  const handleSaveItem = async (data: Partial<DocumentItem>) => {
    if (editingItem) {
      const updated = await api.put<DocumentItem>(`/documents/${editingItem.id}`, data);
      setItems((prev) => prev.map((i) => (i.id === editingItem.id ? updated : i)));
      showToast(`Updated "${updated.title}" successfully`);
    } else {
      const created = await api.post<DocumentItem>('/documents', data);
      setItems((prev) => [created, ...prev]);
      showToast(`Added "${created.title}" to Vault`);
    }
  };

  // Handle Delete
  const handleDeleteItem = async (id: string, itemTitle: string) => {
    if (!window.confirm(`Move "${itemTitle}" to the Recycle Bin?`)) return;

    try {
      await api.delete(`/documents/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast(`Moved "${itemTitle}" to Recycle Bin`);
    } catch (err: any) {
      alert('Failed to delete item: ' + (err?.data?.error || err.message));
    }
  };

  // Open modal for new card with specific category/subType
  const handleOpenAddModal = (category: DocumentCategory, subType?: DocumentSubType) => {
    setEditingItem(null);
    setModalDefaultCategory(category);
    setModalDefaultSubType(subType);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (item: DocumentItem) => {
    setEditingItem(item);
    setModalDefaultCategory(item.category);
    setModalDefaultSubType(item.subType as DocumentSubType);
    setIsModalOpen(true);
  };

  // Open attachment viewer
  const handleViewAttachment = (attachment: DocumentAttachment, title: string) => {
    setViewerAttachment({ attachment, title });
    setViewerZoom(1);
    setViewerRotation(0);
  };

  // Unified back handler for all views in Documents & Cards Vault
  const handleBack = () => {
    if (searchQuery.trim()) {
      setSearchQuery('');
      return;
    }
    if (activeDocSubType !== 'ALL') {
      setActiveDocSubType('ALL');
      return;
    }
    if (activeCategory !== 'ALL') {
      setActiveCategory('ALL');
      setActiveDocSubType('ALL');
      return;
    }
  };

  const isDrilledDown = activeCategory !== 'ALL' || activeDocSubType !== 'ALL' || searchQuery.trim() !== '';

  const backButtonLabel = searchQuery.trim()
    ? 'Clear Search'
    : activeDocSubType !== 'ALL'
    ? 'Back to All Identity Docs'
    : 'Back to Categories';

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 dark:border-slate-300 text-xs font-bold flex items-center gap-2 animate-bounce-short">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {isDrilledDown ? (
              <button
                onClick={() => {
                  setActiveCategory('ALL');
                  setActiveDocSubType('ALL');
                  setSearchQuery('');
                }}
                className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition cursor-pointer font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Categories</span>
              </button>
            ) : (
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span>Security & Vault Enclave</span>
              </span>
            )}
            {activeCategory !== 'ALL' && (
              <>
                <span>/</span>
                <button
                  onClick={() => {
                    setActiveDocSubType('ALL');
                    setSearchQuery('');
                  }}
                  className={`transition ${
                    activeDocSubType === 'ALL'
                      ? 'text-slate-900 dark:text-white font-bold cursor-default'
                      : 'hover:text-blue-600 dark:hover:text-blue-400 font-semibold cursor-pointer'
                  }`}
                >
                  {activeCategory === 'BANK' && '1. Bank Accounts'}
                  {activeCategory === 'ATM' && '2. ATM & Payment Cards'}
                  {activeCategory === 'DOCUMENTS' && '3. Identity Documents'}
                  {activeCategory === 'INSURANCE' && '4. Health Insurance'}
                </button>
              </>
            )}
            {activeCategory === 'DOCUMENTS' && activeDocSubType !== 'ALL' && (
              <>
                <span>/</span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {activeDocSubType === 'DRIVING_LICENSE' && 'Driving License'}
                  {activeDocSubType === 'AADHAAR' && 'Aadhaar Card'}
                  {activeDocSubType === 'PAN' && 'PAN Card'}
                  {activeDocSubType === 'PASSPORT' && 'Passport'}
                  {activeDocSubType === 'VOTER_ID' && 'Voter ID'}
                  {activeDocSubType === 'CUSTOM' && 'Custom Cards'}
                </span>
              </>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            Documents & Cards Vault
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono font-bold border border-blue-500/20">
              Adarsh Enclave
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Secure bank accounts, ATM debit/credit cards, government ID scans, and health insurance policies.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => handleOpenAddModal(activeCategory === 'ALL' ? 'BANK' : activeCategory)}
            className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>
              {activeCategory === 'BANK'
                ? '+ Add Bank Account'
                : activeCategory === 'ATM'
                ? '+ Add ATM Card'
                : activeCategory === 'DOCUMENTS'
                ? '+ Add Document Card'
                : activeCategory === 'INSURANCE'
                ? '+ Add Health Insurance'
                : '+ Add New Card'}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDocuments}
            className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {isDrilledDown ? (
          <button
            onClick={handleBack}
            className="w-full sm:w-auto justify-center px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-2 transition shadow-xs cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{backButtonLabel}</span>
          </button>
        ) : (
          <div />
        )}

        {/* Search Box */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search account, card, IFSC, PAN..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 4 PRIMARY HERO CARDS (When viewing 'ALL' and no active search)    */}
      {/* ----------------------------------------------------------------- */}
      {activeCategory === 'ALL' && !searchQuery && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Vault Categories — Click to Explore
            </h2>
            <span className="text-xs text-slate-400 font-medium">{items.length} records total</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. BANK CARD */}
            <div
              onClick={() => setActiveCategory('BANK')}
              className="group cursor-pointer rounded-3xl p-6 bg-gradient-to-br from-emerald-900/20 via-slate-900 to-teal-950/30 border border-emerald-500/20 hover:border-emerald-500/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                    <Landmark className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {bankCount} {bankCount === 1 ? 'Account' : 'Accounts'}
                  </span>
                </div>

                <h3 className="text-xl font-black text-white mt-4 group-hover:text-emerald-400 transition">
                  1. Bank Accounts
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Account numbers, IFSC codes, branch locations, account holder details, and passbook scans.
                </p>

                {/* Quick Chips preview */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10">
                    Account Number & Verification
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10">
                    IFSC & Branch Code
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10">
                    UPI & NetBanking
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-emerald-400">
                <span>View Bank Accounts →</span>
                <span className="text-slate-400 font-normal text-[11px]">1-click copy ready</span>
              </div>
            </div>

            {/* 2. ATM CARD */}
            <div
              onClick={() => setActiveCategory('ATM')}
              className="group cursor-pointer rounded-3xl p-6 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-cyan-950/30 border border-cyan-500/20 hover:border-cyan-500/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 group-hover:scale-110 transition-transform">
                    <CreditCard className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {atmCount} {atmCount === 1 ? 'Card' : 'Cards'}
                  </span>
                </div>

                <h3 className="text-xl font-black text-white mt-4 group-hover:text-cyan-400 transition">
                  2. ATM & Debit / Credit Cards
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  16-digit card number, CVC / CVV, expiry date, PIN hints, daily limits, and realistic card preview.
                </p>

                {/* Quick Chips preview */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10">
                    Card Number (Mask/Reveal)
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10">
                    CVV / CVC Reveal
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10">
                    Visa / Mastercard / RuPay
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-cyan-400">
                <span>View ATM & Debit Cards →</span>
                <span className="text-slate-400 font-normal text-[11px]">Realistic card mockups</span>
              </div>
            </div>

            {/* 3. DOCUMENTS CARD */}
            <div
              onClick={() => setActiveCategory('DOCUMENTS')}
              className="group cursor-pointer rounded-3xl p-6 bg-gradient-to-br from-blue-950/40 via-slate-900 to-purple-950/30 border border-blue-500/20 hover:border-blue-500/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {docsCount} {docsCount === 1 ? 'Doc' : 'Docs'}
                  </span>
                </div>

                <h3 className="text-xl font-black text-white mt-4 group-hover:text-blue-400 transition">
                  3. Identity Documents
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Driving License, Aadhaar Card, PAN Card, Passport, Voter ID & Custom Cards with front/back scans.
                </p>

                {/* Sub-cards preview chips as requested */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    🚗 License
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold">
                    🇮🇳 Aadhaar
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                    💳 PAN
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                    🛂 Passport
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                    🗳️ Voter ID
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/10 text-cyan-300 border border-cyan-500/20 font-semibold">
                    ➕ Can create card
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-blue-400">
                <span>Open Identity Documents →</span>
                <span className="text-slate-400 font-normal text-[11px]">Front/Back scan viewer</span>
              </div>
            </div>

            {/* 4. HEALTH INSURANCE CARD */}
            <div
              onClick={() => setActiveCategory('INSURANCE')}
              className="group cursor-pointer rounded-3xl p-6 bg-gradient-to-br from-rose-950/40 via-slate-900 to-amber-950/30 border border-rose-500/20 hover:border-rose-500/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 group-hover:scale-110 transition-transform">
                    <HeartHandshake className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {insuranceCount} {insuranceCount === 1 ? 'Policy' : 'Policies'}
                  </span>
                </div>

                <h3 className="text-xl font-black text-white mt-4 group-hover:text-rose-400 transition">
                  4. Insurance (Health & Life)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Health insurance policies, sum insured, cashless hospital network, TPA helpline, and policy documents.
                </p>

                {/* Quick Chips preview */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10">
                    Policy Number & Provider
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10">
                    Sum Insured (₹)
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10">
                    Cashless TPA Helpline
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-rose-400">
                <span>View Health Insurance →</span>
                <span className="text-slate-400 font-normal text-[11px]">Instant helpline call</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* IDENTITY DOCUMENTS SUB-FILTER BAR (When activeCategory === 'DOCUMENTS') */}
      {/* ----------------------------------------------------------------- */}
      {activeCategory === 'DOCUMENTS' && (
        <div className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold uppercase text-slate-400 shrink-0 mr-1">Filter:</span>
            {[
              { id: 'ALL', label: 'All Documents' },
              { id: 'DRIVING_LICENSE', label: '🚗 License' },
              { id: 'AADHAAR', label: '🇮🇳 Aadhaar' },
              { id: 'PAN', label: '💳 PAN Card' },
              { id: 'PASSPORT', label: '🛂 Passport' },
              { id: 'VOTER_ID', label: '🗳️ Voter ID' },
              { id: 'CUSTOM', label: '➕ Custom Cards' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setActiveDocSubType(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeDocSubType === st.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleOpenAddModal('DOCUMENTS', 'CUSTOM')}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create Custom Card</span>
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* CARDS LISTING GRID (Only shown when a category card is opened or searching) */}
      {/* ----------------------------------------------------------------- */}
      {(activeCategory !== 'ALL' || searchQuery.trim() !== '') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {activeCategory === 'BANK' && 'Bank Accounts'}
              {activeCategory === 'ATM' && 'ATM, Debit & Credit Cards'}
              {activeCategory === 'DOCUMENTS' && 'Identity & Government Documents'}
              {activeCategory === 'INSURANCE' && 'Health & Life Insurance Policies'}
              {activeCategory === 'ALL' && searchQuery.trim() && `Search Results for "${searchQuery}"`}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-medium">
                {filteredItems.length} {filteredItems.length === 1 ? 'card' : 'cards'}
              </span>
              {isDrilledDown && (
                <button
                  onClick={handleBack}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{backButtonLabel}</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs font-semibold">Loading your secure vault cards...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
              <ShieldCheck className="w-10 h-10 text-slate-400" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {searchQuery ? 'No matching cards found' : 'No cards saved in this category yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {searchQuery
                  ? `No cards matched "${searchQuery}". Try a different search term.`
                  : 'Click the button below to add your first secure card or document.'}
              </p>
              <button
                onClick={() => handleOpenAddModal(activeCategory === 'ALL' ? 'BANK' : activeCategory)}
                className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Card Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
              {filteredItems.map((item) => (
                <RealisticCardView
                  key={item.id}
                  item={item}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDeleteItem}
                  onViewAttachment={handleViewAttachment}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* ADD / EDIT MODAL                                                  */}
      {/* ----------------------------------------------------------------- */}
      <DocumentCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        editingItem={editingItem}
        defaultCategory={modalDefaultCategory}
        defaultSubType={modalDefaultSubType}
      />

      {/* ----------------------------------------------------------------- */}
      {/* IN-APP ATTACHMENT LIGHTBOX & VIEWER MODAL                         */}
      {/* ----------------------------------------------------------------- */}
      {viewerAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
            {/* Lightbox Toolbar */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between text-white bg-slate-950/80">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold truncate">{viewerAttachment.attachment.name}</h4>
                  <p className="text-[10px] text-slate-400 truncate">{viewerAttachment.title}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {/* Image zoom & rotate controls */}
                {!viewerAttachment.attachment.name.toLowerCase().endsWith('.pdf') && (
                  <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl text-xs">
                    <button
                      onClick={() => setViewerZoom((z) => Math.max(0.5, z - 0.25))}
                      title="Zoom Out"
                      className="p-1 hover:text-blue-400 transition"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-mono px-1">{(viewerZoom * 100).toFixed(0)}%</span>
                    <button
                      onClick={() => setViewerZoom((z) => Math.min(3, z + 0.25))}
                      title="Zoom In"
                      className="p-1 hover:text-blue-400 transition"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewerRotation((r) => (r + 90) % 360)}
                      title="Rotate 90°"
                      className="p-1 hover:text-blue-400 transition ml-1"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setViewerZoom(1);
                        setViewerRotation(0);
                      }}
                      title="Reset View"
                      className="p-1 hover:text-blue-400 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 1-Click Download */}
                <a
                  href={viewerAttachment.attachment.dataUrl}
                  download={viewerAttachment.attachment.name}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>

                <button
                  onClick={() => setViewerAttachment(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* File Display Area */}
            <div className="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-auto">
              {viewerAttachment.attachment.name.toLowerCase().endsWith('.pdf') ||
              viewerAttachment.attachment.type === 'application/pdf' ? (
                <iframe
                  src={viewerAttachment.attachment.dataUrl}
                  title={viewerAttachment.attachment.name}
                  className="w-full h-full rounded-2xl border border-slate-800"
                />
              ) : (
                <div className="max-w-full max-h-full flex items-center justify-center p-4">
                  <img
                    src={viewerAttachment.attachment.dataUrl}
                    alt={viewerAttachment.attachment.name}
                    style={{
                      transform: `scale(${viewerZoom}) rotate(${viewerRotation}deg)`,
                      transition: 'transform 0.2s ease-out',
                    }}
                    className="max-h-[70vh] max-w-[80vw] object-contain rounded-xl shadow-2xl"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
