import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchPayments,
  fetchPaymentMonthsSummary,
  createPaymentAction,
  updatePaymentAction,
  deletePaymentAction,
  setSelectedMonth,
  clearSelectedMonth,
} from '../store/slices/paymentsSlice';
import { PaymentRecord, PaymentAttachment } from '../types';
import { showToast } from '../store/slices/uiSlice';
import {
  exportPaymentsToPDF,
  exportPaymentsToExcel,
  exportPaymentsToCSV,
} from '../utils/itrExport';
import {
  Calendar,
  FileText,
  Download,
  Plus,
  ArrowLeft,
  Search,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  Paperclip,
  FileSpreadsheet,
  X,
  UploadCloud,
  ChevronRight,
  Receipt,
  Layers,
  Printer,
  Copy,
} from 'lucide-react';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const PAYMENT_METHODS = [
  'Bank Transfer (NEFT / IMPS)',
  'UPI (GPay / PhonePe / Paytm)',
  'Credit / Debit Card',
  'Stripe / Gateway',
  'PayPal',
  'Wire / SWIFT',
  'Cheque / DD',
  'Cash',
  'Other',
];

export const PaymentsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const { records, monthlySummaries, selectedMonth, isLoading } = useSelector(
    (state: RootState) => state.payments
  );

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'ATTACHED'>('ALL');
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('DATE_DESC');

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PaymentRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'INCOME' as 'INCOME' | 'EXPENSE',
    amount: '',
    currency: 'INR',
    forWhat: '',
    clientName: '',
    category: 'General',
    paymentMethod: 'Bank Transfer (NEFT / IMPS)',
    invoiceNumber: '',
    specialNotes: '',
    isShared: true,
  });
  const [invoiceAttachment, setInvoiceAttachment] = useState<PaymentAttachment | null>(null);

  // Preview & Delete Dialog
  const [previewAttachment, setPreviewAttachment] = useState<PaymentAttachment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchPaymentMonthsSummary());
    if (selectedMonth) {
      dispatch(fetchPayments(selectedMonth));
    } else {
      dispatch(fetchPayments());
    }
  }, [dispatch, selectedMonth]);

  // Generate 12 months for the selected year
  const allMonthsInYear = useMemo(() => {
    return MONTH_NAMES.map((name, index) => {
      const monthNum = String(index + 1).padStart(2, '0');
      const monthYear = `${selectedYear}-${monthNum}`;
      const monthLabel = `${name} ${selectedYear}`;
      const shortName = MONTH_SHORT_NAMES[index];

      const summary = monthlySummaries.find((s) => s.monthYear === monthYear);

      return {
        monthIndex: index + 1,
        monthYear,
        monthLabel,
        monthName: name,
        shortName,
        year: selectedYear,
        totalIncome: summary?.totalIncome || 0,
        totalExpense: summary?.totalExpense || 0,
        netTotal: summary?.netTotal || 0,
        count: summary?.count || 0,
        invoiceCount: summary?.invoiceCount || 0,
        hasData: Boolean(summary && summary.count > 0),
      };
    });
  }, [selectedYear, monthlySummaries]);

  // Active month data
  const currentMonthSummary = useMemo(() => {
    if (!selectedMonth) return null;
    return allMonthsInYear.find((m) => m.monthYear === selectedMonth) || null;
  }, [selectedMonth, allMonthsInYear]);

  // Filtered Records for Selected Month or Entire Active Scope
  const filteredRecords = useMemo(() => {
    let result = records.filter((r) => {
      if (selectedMonth && r.monthYear !== selectedMonth) {
        return false;
      }
      if (filterType === 'INCOME' && r.type !== 'INCOME') return false;
      if (filterType === 'EXPENSE' && r.type !== 'EXPENSE') return false;
      if (filterType === 'ATTACHED' && !r.invoiceAttachment) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchForWhat = (r.forWhat || '').toLowerCase().includes(query);
        const matchClient = (r.clientName || '').toLowerCase().includes(query);
        const matchNotes = (r.specialNotes || '').toLowerCase().includes(query);
        const matchInvoice = (r.invoiceNumber || '').toLowerCase().includes(query);
        const matchMethod = (r.paymentMethod || '').toLowerCase().includes(query);
        const matchAmount = String(r.amount).includes(query);
        return matchForWhat || matchClient || matchNotes || matchInvoice || matchMethod || matchAmount;
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'DATE_DESC') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'DATE_ASC') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'AMOUNT_DESC') {
        return Number(b.amount) - Number(a.amount);
      }
      if (sortBy === 'AMOUNT_ASC') {
        return Number(a.amount) - Number(b.amount);
      }
      return 0;
    });

    return result;
  }, [records, selectedMonth, filterType, searchTerm, sortBy]);

  // Year Stats
  const overallYearStats = useMemo(() => {
    const totalIncome = allMonthsInYear.reduce((acc, m) => acc + m.totalIncome, 0);
    const totalExpense = allMonthsInYear.reduce((acc, m) => acc + m.totalExpense, 0);
    const totalCount = allMonthsInYear.reduce((acc, m) => acc + m.count, 0);
    const totalInvoices = allMonthsInYear.reduce((acc, m) => acc + m.invoiceCount, 0);
    const netTotal = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      netTotal,
      totalCount,
      totalInvoices,
    };
  }, [allMonthsInYear]);

  // Active Month Stats
  const activeMonthStats = useMemo(() => {
    const income = filteredRecords
      .filter((r) => r.type === 'INCOME')
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const expense = filteredRecords
      .filter((r) => r.type === 'EXPENSE')
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const net = income - expense;

    return {
      income,
      expense,
      net,
      count: filteredRecords.length,
      invoices: filteredRecords.filter((r) => r.invoiceAttachment).length,
    };
  }, [filteredRecords]);

  // Form Handlers
  const handleOpenAddForm = (defaultMonthYear?: string, presetType?: 'INCOME' | 'EXPENSE') => {
    setEditingRecord(null);
    let defaultDate = new Date().toISOString().split('T')[0];
    if (defaultMonthYear) {
      defaultDate = `${defaultMonthYear}-01`;
    } else if (selectedMonth) {
      defaultDate = `${selectedMonth}-01`;
    }
    setFormData({
      date: defaultDate,
      type: presetType || 'INCOME',
      amount: '',
      currency: 'INR',
      forWhat: '',
      clientName: '',
      category: presetType === 'EXPENSE' ? 'Cloud Server & Hosting' : 'Client Project Payment',
      paymentMethod: 'Bank Transfer (NEFT / IMPS)',
      invoiceNumber: '',
      specialNotes: '',
      isShared: true,
    });
    setInvoiceAttachment(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (record: PaymentRecord) => {
    setEditingRecord(record);
    setFormData({
      date: record.date,
      type: record.type,
      amount: String(record.amount),
      currency: record.currency || 'INR',
      forWhat: record.forWhat,
      clientName: record.clientName || '',
      category: record.category || 'Client Project Payment',
      paymentMethod: record.paymentMethod || 'Bank Transfer (NEFT / IMPS)',
      invoiceNumber: record.invoiceNumber || '',
      specialNotes: record.specialNotes || '',
      isShared: record.isShared ?? true,
    });
    setInvoiceAttachment(record.invoiceAttachment || null);
    setIsFormOpen(true);
  };

  const handleDuplicateRecord = (record: PaymentRecord) => {
    setEditingRecord(null);
    setFormData({
      date: record.date,
      type: record.type,
      amount: String(record.amount),
      currency: record.currency || 'INR',
      forWhat: `${record.forWhat} (Copy)`,
      clientName: record.clientName || '',
      category: record.category || 'Client Project Payment',
      paymentMethod: record.paymentMethod || 'Bank Transfer (NEFT / IMPS)',
      invoiceNumber: '',
      specialNotes: record.specialNotes || '',
      isShared: record.isShared ?? true,
    });
    setInvoiceAttachment(null);
    setIsFormOpen(true);
    dispatch(showToast({ message: 'Cloned transaction details', type: 'info' }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      dispatch(showToast({ message: 'File size exceeds 15MB limit', type: 'error' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setInvoiceAttachment({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: reader.result as string,
      });
      dispatch(showToast({ message: `Attached: ${file.name}`, type: 'info' }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.forWhat.trim()) {
      dispatch(showToast({ message: 'Please enter purpose / description', type: 'warning' }));
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      dispatch(showToast({ message: 'Please enter a valid amount', type: 'warning' }));
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        invoiceAttachment: invoiceAttachment,
      };

      if (editingRecord) {
        await dispatch(updatePaymentAction({ id: editingRecord.id, data: payload })).unwrap();
        dispatch(showToast({ message: 'Payment record updated', type: 'success' }));
      } else {
        await dispatch(createPaymentAction(payload)).unwrap();
        dispatch(showToast({ message: 'Payment recorded in ledger', type: 'success' }));
      }

      dispatch(fetchPaymentMonthsSummary());
      setIsFormOpen(false);
    } catch (err: any) {
      dispatch(showToast({ message: err?.message || 'Failed to save record', type: 'error' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!deletingId) return;
    try {
      await dispatch(deletePaymentAction(deletingId)).unwrap();
      dispatch(fetchPaymentMonthsSummary());
      dispatch(showToast({ message: 'Record moved to Trash', type: 'info' }));
      setDeletingId(null);
    } catch (err: any) {
      dispatch(showToast({ message: err?.message || 'Failed to delete record', type: 'error' }));
    }
  };

  const handleExportPDF = () => {
    const label = selectedMonth
      ? currentMonthSummary?.monthLabel || selectedMonth
      : `FY_${selectedYear}`;
    exportPaymentsToPDF(filteredRecords, label, user?.name);
    dispatch(showToast({ message: `Downloaded PDF statement for ${label}`, type: 'success' }));
  };

  const handleExportExcel = () => {
    const label = selectedMonth
      ? currentMonthSummary?.monthLabel || selectedMonth
      : `FY_${selectedYear}`;
    exportPaymentsToExcel(filteredRecords, label);
    dispatch(showToast({ message: `Downloaded Excel sheet for ${label}`, type: 'success' }));
  };

  const handleExportCSV = () => {
    const label = selectedMonth
      ? currentMonthSummary?.monthLabel || selectedMonth
      : `FY_${selectedYear}`;
    exportPaymentsToCSV(filteredRecords, label);
    dispatch(showToast({ message: `Downloaded CSV for ${label}`, type: 'success' }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in pb-16 max-w-7xl mx-auto px-2 sm:px-4 md:px-6">
      {/* 1. CLEAN & CLASSIC PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate sm:whitespace-normal">
              Payments & ITR Ledger
            </h1>
            <p className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400 font-normal mt-0.5 truncate sm:whitespace-normal">
              Financial accounting ledger, invoice archives, and tax statements.
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 w-full sm:w-auto">
          {/* Year Picker */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-1.5 border border-slate-200 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
            <select
              value={selectedYear}
              onChange={(e) => {
                const yr = Number(e.target.value);
                setSelectedYear(yr);
                if (selectedMonth) {
                  const monthPart = selectedMonth.split('-')[1];
                  dispatch(setSelectedMonth(`${yr}-${monthPart}`));
                }
              }}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                <option key={yr} value={yr} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  FY {yr} - {yr + 1}
                </option>
              ))}
            </select>
          </div>

          {/* Record Transaction Button */}
          <button
            onClick={() => handleOpenAddForm(selectedMonth || undefined)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-xs sm:text-sm transition cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Record Entry</span>
          </button>
        </div>
      </div>

      {/* 2. SIMPLE & ELEGANT 4 STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Inflow Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">{selectedMonth ? `${currentMonthSummary?.shortName} Inflow` : `FY ${selectedYear} Inflow`}</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 ml-1">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2 truncate">
            +₹{(selectedMonth ? activeMonthStats.income : overallYearStats.totalIncome).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">Revenue & payments</p>
        </div>

        {/* Outflow Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">{selectedMonth ? `${currentMonthSummary?.shortName} Outflow` : `FY ${selectedYear} Outflow`}</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 ml-1">
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-2 truncate">
            -₹{(selectedMonth ? activeMonthStats.expense : overallYearStats.totalExpense).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">Tools & expenses</p>
        </div>

        {/* Net Profit Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">Net Balance</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 ml-1">
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div
            className={`text-base sm:text-xl lg:text-2xl font-bold font-mono mt-2 truncate ${
              (selectedMonth ? activeMonthStats.net : overallYearStats.netTotal) >= 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            ₹{(selectedMonth ? activeMonthStats.net : overallYearStats.netTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">Margin pre-tax</p>
        </div>

        {/* Invoices Attached Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">Invoices</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 ml-1">
              <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-2 truncate">
            {selectedMonth ? activeMonthStats.invoices : overallYearStats.totalInvoices}{' '}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Bills</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
            {selectedMonth ? activeMonthStats.count : overallYearStats.totalCount} entries
          </p>
        </div>
      </div>

      {/* 3. MONTH SELECTOR TABS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-2 shadow-xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => dispatch(clearSelectedMonth())}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
            !selectedMonth
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Months</span>
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 shrink-0 mx-0.5" />

        {allMonthsInYear.map((month) => {
          const isSelected = selectedMonth === month.monthYear;
          return (
            <button
              key={month.monthYear}
              onClick={() => dispatch(setSelectedMonth(month.monthYear))}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : month.hasData
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span>{month.shortName}</span>
              {month.hasData && (
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* 4. OVERVIEW GRID (WHEN NO MONTH SELECTED) */}
      {!selectedMonth ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              FY {selectedYear} Monthly Ledger
            </h2>
            <span className="text-xs text-slate-400">Click a month card to view transactions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allMonthsInYear.map((month) => {
              const isCurrentCalendarMonth =
                new Date().getFullYear() === month.year &&
                new Date().getMonth() + 1 === month.monthIndex;

              return (
                <div
                  key={month.monthYear}
                  onClick={() => dispatch(setSelectedMonth(month.monthYear))}
                  className={`group bg-white dark:bg-slate-900 border rounded-2xl p-5 transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between ${
                    isCurrentCalendarMonth
                      ? 'border-blue-500/70 dark:border-blue-500/60 shadow-xs ring-1 ring-blue-500/20'
                      : 'border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Month Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          #{String(month.monthIndex).padStart(2, '0')}
                        </span>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                          {month.monthName}
                        </h3>
                      </div>

                      {isCurrentCalendarMonth ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          Current
                        </span>
                      ) : month.hasData ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {month.count} {month.count === 1 ? 'entry' : 'entries'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400">
                          0 entries
                        </span>
                      )}
                    </div>

                    {/* Financial Inflow / Outflow Numbers */}
                    <div className="space-y-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between py-0.5">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Inflow</span>
                        </span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +₹{month.totalIncome.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-0.5">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                          <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                          <span>Outflow</span>
                        </span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          -₹{month.totalExpense.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Net Margin Highlight Box */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between mt-2">
                        <span className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                          Net Balance
                        </span>
                        <span
                          className={`font-mono font-bold text-xs ${
                            month.netTotal >= 0
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          ₹{month.netTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 flex items-center justify-between text-[11px] border-t border-slate-100 dark:border-slate-800">
                    <div>
                      {month.invoiceCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium text-[10px] border border-purple-200/60 dark:border-purple-800/60">
                          <Paperclip className="w-3 h-3 text-purple-500" />
                          <span>{month.invoiceCount} {month.invoiceCount === 1 ? 'invoice' : 'invoices'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px] font-medium">No invoices</span>
                      )}
                    </div>
                    <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold text-xs group-hover:translate-x-0.5 transition">
                      <span>Open</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 5. CLASSIC & CLEAN FINANCIAL TABLE (WHEN MONTH IS SELECTED) */
        <div className="space-y-3">
          {/* Active Month Header & Export Toolbar (Compact & 100% Mobile Responsive) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => dispatch(clearSelectedMonth())}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0"
                title="Back to All Months"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-2 truncate">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {currentMonthSummary?.monthLabel || selectedMonth} Ledger
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-medium shrink-0">
                  {filteredRecords.length} {filteredRecords.length === 1 ? 'Entry' : 'Entries'}
                </span>
              </div>
            </div>

            {/* Export Toolbar (PDF, Excel, CSV, Print) */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                title="Download PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span>PDF</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                title="Download Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span>Excel</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                title="Download CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handlePrint}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                title="Print"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search & Filter Bar (100% Mobile Responsive) */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-xs">
            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search purpose, amount, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 pl-9 pr-8 py-1.5 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer text-center ${
                    filterType === 'ALL'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('INCOME')}
                  className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer text-center ${
                    filterType === 'INCOME'
                      ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  Income
                </button>
                <button
                  onClick={() => setFilterType('EXPENSE')}
                  className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer text-center ${
                    filterType === 'EXPENSE'
                      ? 'bg-rose-600 text-white shadow-xs font-semibold'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  Expense
                </button>
                <button
                  onClick={() => setFilterType('ATTACHED')}
                  className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer text-center ${
                    filterType === 'ATTACHED'
                      ? 'bg-purple-600 text-white shadow-xs font-semibold'
                      : 'text-purple-600 dark:text-purple-400'
                  }`}
                >
                  Bills
                </button>
              </div>

              {/* Sort Filter */}
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="flex-1 sm:flex-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="DATE_DESC" className="bg-white dark:bg-slate-900">Newest</option>
                <option value="DATE_ASC" className="bg-white dark:bg-slate-900">Oldest</option>
                <option value="AMOUNT_DESC" className="bg-white dark:bg-slate-900">High-Low</option>
                <option value="AMOUNT_ASC" className="bg-white dark:bg-slate-900">Low-High</option>
              </select>
            </div>
          </div>

          {/* THE MASTER TABLE CONTAINER */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 overflow-hidden shadow-xs">
            {isLoading ? (
              <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading ledger...</span>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    No records found
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Add client payments or business expenses to start this month.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenAddForm(selectedMonth)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Transaction
                </button>
              </div>
            ) : (
              <div>
                {/* Desktop Financial Table with Column Borders */}
                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full min-w-[850px] text-left border-collapse border border-slate-200 dark:border-slate-700">
                    <thead>
                      <tr className="bg-pink-100/70  text-pink-800 dark:text-pink-200 text-[11px] font-bold tracking-wider">
                        <th className="py-3 px-3.5 w-10 text-center bg-pink-200 dark:bg-pink-950/80 text-pink-900 dark:text-pink-300 border border-pink-300 dark:border-pink-800">#</th>
                        <th className="py-3 px-3.5 w-28 bg-pink-200 dark:bg-pink-950/80 text-pink-950 dark:text-pink-200 border border-pink-300 dark:border-pink-800">Date</th>
                        <th className="py-3 px-3 w-24 bg-pink-200 dark:bg-pink-950/80 text-pink-950 dark:text-pink-200 border border-pink-300 dark:border-pink-800">Type</th>
                        <th className="py-3 px-4 bg-pink-200 dark:bg-pink-950/80 text-pink-950 dark:text-pink-200 border border-pink-300 dark:border-pink-800">Description</th>
                        <th className="py-3 px-3 w-32 bg-pink-200 dark:bg-pink-950/80 text-pink-950 dark:text-pink-200 border border-pink-300 dark:border-pink-800">Payment Mode</th>
                        <th className="py-3 px-4 w-36 text-right bg-pink-200 dark:bg-pink-950/80 text-pink-950 dark:text-pink-200 border border-pink-300 dark:border-pink-800">Amount</th>
                        <th className="py-3 px-3 w-24 text-center bg-pink-200 dark:bg-pink-950/80 text-pink-950 dark:text-pink-200 border border-pink-300 dark:border-pink-800">Invoice</th>
                        <th className="py-3 px-4 max-w-xs bg-pink-200 dark:bg-pink-950/80 text-pink-950 dark:text-pink-200 border border-pink-300 dark:border-pink-800">Notes</th>
                        <th className="py-3 px-3 w-20 text-right bg-pink-200 dark:bg-pink-950/80 text-pink-950 dark:text-pink-200 border border-pink-300 dark:border-pink-800">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {filteredRecords.map((r, index) => (
                        <tr
                          key={r.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* Row Index */}
                          <td className="py-3.5 px-3.5 text-center font-mono text-slate-400 text-[11px] border border-slate-200 dark:border-slate-700/80">
                            {index + 1}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-3.5 whitespace-nowrap border border-slate-200 dark:border-slate-700/80">
                            <span className="font-mono text-slate-900 dark:text-slate-200 font-medium">
                              {r.date}
                            </span>
                          </td>

                          {/* Flow / Type Badge */}
                          <td className="py-3.5 px-3 whitespace-nowrap border border-slate-200 dark:border-slate-700/80">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                r.type === 'INCOME'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                              }`}
                            >
                              {r.type === 'INCOME' ? '+ Inflow' : '- Outflow'}
                            </span>
                          </td>

                          {/* Purpose & Description */}
                          <td className="py-3.5 px-4 border border-slate-200 dark:border-slate-700/80">
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                              <span>{r.forWhat}</span>
                              {r.clientName && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 text-[10px] font-medium">
                                  Client: {r.clientName}
                                </span>
                              )}
                            </div>
                            {r.invoiceNumber && (
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                Ref #{r.invoiceNumber}
                              </div>
                            )}
                          </td>

                          {/* Payment Method */}
                          <td className="py-3.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/80">
                            {r.paymentMethod || '—'}
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono font-bold border border-slate-200 dark:border-slate-700/80">
                            <span
                              className={
                                r.type === 'INCOME'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {r.type === 'INCOME' ? '+' : '-'}₹
                              {Number(r.amount).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </td>

                          {/* Invoice Attachment */}
                          <td className="py-3.5 px-3 whitespace-nowrap text-center border border-slate-200 dark:border-slate-700/80">
                            {r.invoiceAttachment ? (
                              <button
                                onClick={() => setPreviewAttachment(r.invoiceAttachment!)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-[11px] transition cursor-pointer"
                                title="View Document"
                              >
                                <Paperclip className="w-3 h-3 text-slate-500" />
                                <span className="max-w-[60px] truncate">{r.invoiceAttachment.name}</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                            )}
                          </td>

                          {/* Notes */}
                          <td className="py-3.5 px-4 max-w-xs text-slate-500 dark:text-slate-400 text-xs truncate border border-slate-200 dark:border-slate-700/80">
                            {r.specialNotes || '—'}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-3 text-right whitespace-nowrap border border-slate-200 dark:border-slate-700/80">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleDuplicateRecord(r)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Duplicate"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditForm(r)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingId(r.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Cards Stack (md:hidden) */}
                <div className="md:hidden space-y-3">
                  {filteredRecords.map((r, index) => {
                    const isIncome = r.type === 'INCOME';
                    return (
                      <div
                        key={r.id}
                        className={`p-4 rounded-2xl border transition-all shadow-xs ${
                          isIncome
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/50'
                            : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                  isIncome
                                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
                                }`}
                              >
                                {isIncome ? '+ Inflow' : '- Outflow'}
                              </span>
                              <span className="font-mono text-[11px] text-slate-500">{r.date}</span>
                              <span className="text-[10px] text-slate-400">#{index + 1}</span>
                            </div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {r.forWhat}
                            </h4>
                          </div>

                          {/* Amount */}
                          <div className="text-right shrink-0">
                            <span className={`font-mono font-bold text-base ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {isIncome ? '+' : '-'}₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* Details line */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-[160px]">
                            {r.paymentMethod || '—'}
                          </span>

                          <div className="flex items-center gap-1">
                            {r.invoiceAttachment && (
                              <button
                                onClick={() => setPreviewAttachment(r.invoiceAttachment!)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition"
                                title="View Receipt"
                              >
                                <Paperclip className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDuplicateRecord(r)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                              title="Copy"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditForm(r)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingId(r.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {r.specialNotes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
                            {r.specialNotes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Table Footer Totals with Distinct Gap Above */}
                <div className="mt-3.5 p-3.5 bg-slate-50/90 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
                  <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400 font-medium">
                    <div>
                      Total Inflow:{' '}
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        +₹{activeMonthStats.income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-slate-300 dark:text-slate-700">|</div>
                    <div>
                      Total Outflow:{' '}
                      <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">
                        -₹{activeMonthStats.expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold">Net Balance:</span>
                    <span
                      className={`font-bold font-mono text-sm px-2.5 py-0.5 rounded-lg border ${
                        activeMonthStats.net >= 0
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900/60'
                          : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/60'
                      }`}
                    >
                      ₹{activeMonthStats.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. MODAL: RECORD / EDIT TRANSACTION */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92dvh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingRecord ? 'Edit Payment' : 'New Payment Entry'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'INCOME' })}
                  className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    formData.type === 'INCOME'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-500'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span>+ Income</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
                  className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    formData.type === 'EXPENSE'
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-500'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                  <span>- Expense</span>
                </button>
              </div>

              {/* Date & Amount */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 25000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Purpose / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Milestone 1 payment from Client, Server hosting"
                  value={formData.forWhat}
                  onChange={(e) => setFormData({ ...formData, forWhat: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Client Name (Who Paid) - Shown for Income */}
              {formData.type === 'INCOME' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Name (Who Paid)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp, John Doe, Global Tech Ltd"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice Number & Attachment */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Invoice Ref (Optional)</label>
                  <input
                    type="text"
                    placeholder="INV-001"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs font-mono text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Bill / Receipt</label>
                  {invoiceAttachment ? (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="truncate max-w-[120px] font-medium">{invoiceAttachment.name}</span>
                      <button
                        type="button"
                        onClick={() => setInvoiceAttachment(null)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 cursor-pointer text-slate-500">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload file</span>
                      <input type="file" onChange={handleFileUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="e.g. TDS deducted, GST notes..."
                  value={formData.specialNotes}
                  onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingRecord ? 'Update' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. PREVIEW ATTACHMENT MODAL */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate max-w-sm">
                {previewAttachment.name}
              </span>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center min-h-[200px] max-h-[65vh] overflow-y-auto">
              {previewAttachment.dataUrl?.startsWith('data:image/') ? (
                <img
                  src={previewAttachment.dataUrl}
                  alt={previewAttachment.name}
                  className="max-h-[50vh] rounded-lg object-contain"
                />
              ) : previewAttachment.dataUrl?.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewAttachment.dataUrl}
                  title="PDF"
                  className="w-full h-[50vh] rounded-lg border border-slate-200 dark:border-slate-800"
                />
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                  <p className="font-semibold text-xs">{previewAttachment.name}</p>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <a
                href={previewAttachment.dataUrl}
                download={previewAttachment.name}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium text-xs flex items-center gap-1.5"
              >
                <Download className="w-3 h-3" />
                <span>Download</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 8. DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Move to Trash?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This record will be moved to the Trash & Recycle Bin where you can restore it anytime.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRecord}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
              >
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
