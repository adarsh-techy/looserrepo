import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchMoneyRecords,
  fetchMoneyMonthsSummary,
  createMoneyAction,
  updateMoneyAction,
  deleteMoneyAction,
  setSelectedMonth,
  clearSelectedMonth,
} from '../store/slices/moneySlice';
import { MoneyRecord } from '../types';
import { showToast } from '../store/slices/uiSlice';
import {
  Wallet,
  Calendar,
  Plus,
  ArrowLeft,
  Search,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  DollarSign,
  MapPin,
  Layers,
  Sparkles,
  CreditCard,
  Banknote,
  Building2,
  SlidersHorizontal,
  Copy,
  ArrowUpDown,
  Utensils,
  Fuel,
  ShoppingCart,
  Home,
  Coffee,
  Smartphone,
  Briefcase,
  Gift,
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

const PAYMENT_MODES = [
  { id: 'GPAY', label: 'GPay / UPI', icon: CreditCard, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800' },
  { id: 'CASH', label: 'Cash', icon: Banknote, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800' },
  { id: 'ACCOUNT_TRANSFER', label: 'Bank Transfer', icon: Building2, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800' },
  { id: 'OTHER', label: 'Other', icon: Wallet, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' },
];

const QUICK_AMOUNT_PRESETS = [100, 200, 500, 1000, 2000, 5000];

const QUICK_PURPOSE_PRESETS = [
  { label: 'Food & Dining', icon: Utensils, type: 'EXPENSE' },
  { label: 'Fuel & Travel', icon: Fuel, type: 'EXPENSE' },
  { label: 'Groceries & Mart', icon: ShoppingCart, type: 'EXPENSE' },
  { label: 'Coffee & Snacks', icon: Coffee, type: 'EXPENSE' },
  { label: 'Rent & Bills', icon: Home, type: 'EXPENSE' },
  { label: 'Mobile & Wifi Recharge', icon: Smartphone, type: 'EXPENSE' },
  { label: 'Freelance / Client Payout', icon: Briefcase, type: 'INCOME' },
  { label: 'Salary Inflow', icon: DollarSign, type: 'INCOME' },
  { label: 'Bonus / Gift', icon: Gift, type: 'INCOME' },
];

export const MoneyManagementPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { records, monthlySummaries, selectedMonth, isLoading } = useSelector(
    (state: RootState) => state.money
  );

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'MONTHLY' | 'TODAY' | 'WEEK_1' | 'WEEK_2' | 'WEEK_3' | 'WEEK_4' | 'CUSTOM'>('MONTHLY');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('DATE_DESC');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MoneyRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form values
  const [formType, setFormType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMode: 'GPAY',
    forWhat: '',
    place: '',
    notes: '',
    isShared: true,
  });

  // Delete Confirm Modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchMoneyMonthsSummary());
    if (selectedMonth) {
      dispatch(fetchMoneyRecords({ monthYear: selectedMonth }));
    } else {
      dispatch(fetchMoneyRecords());
    }
  }, [dispatch, selectedMonth]);

  // Current calendar month string e.g. "2026-09"
  const currentCalendarMonth = useMemo(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${mm}`;
  }, []);

  // Generate 12 months for selected year WITH CURRENT MONTH AS 1ST CARD
  const allMonthsInYear = useMemo(() => {
    const months = MONTH_NAMES.map((name, index) => {
      const monthNum = String(index + 1).padStart(2, '0');
      const monthYear = `${selectedYear}-${monthNum}`;
      const monthLabel = `${name} ${selectedYear}`;
      const shortName = MONTH_SHORT_NAMES[index];

      const summary = monthlySummaries.find((s) => s.monthYear === monthYear);
      const isCurrentMonth = currentCalendarMonth === monthYear;

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
        isCurrentMonth,
        hasData: Boolean(summary && summary.count > 0),
      };
    });

    // Sort: Current calendar month comes 1st! Then the rest of the months in descending order
    return [...months].sort((a, b) => {
      if (a.isCurrentMonth) return -1;
      if (b.isCurrentMonth) return 1;
      return b.monthIndex - a.monthIndex;
    });
  }, [selectedYear, monthlySummaries, currentCalendarMonth]);

  // Active month info
  const activeMonthInfo = useMemo(() => {
    if (!selectedMonth) return null;
    return allMonthsInYear.find((m) => m.monthYear === selectedMonth) || null;
  }, [selectedMonth, allMonthsInYear]);

  // Filtered and Sorted records
  const filteredRecords = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    let result = records.filter((r) => {
      // Month check if a month is active
      if (selectedMonth && r.monthYear !== selectedMonth) {
        return false;
      }

      // Time Period Filter
      if (timeFilter === 'TODAY') {
        if (r.date !== todayStr) return false;
      } else if (timeFilter === 'WEEK_1') {
        const day = parseInt(r.date.split('-')[2], 10);
        if (day < 1 || day > 7) return false;
      } else if (timeFilter === 'WEEK_2') {
        const day = parseInt(r.date.split('-')[2], 10);
        if (day < 8 || day > 14) return false;
      } else if (timeFilter === 'WEEK_3') {
        const day = parseInt(r.date.split('-')[2], 10);
        if (day < 15 || day > 21) return false;
      } else if (timeFilter === 'WEEK_4') {
        const day = parseInt(r.date.split('-')[2], 10);
        if (day < 22) return false;
      } else if (timeFilter === 'CUSTOM') {
        if (customStartDate && r.date < customStartDate) return false;
        if (customEndDate && r.date > customEndDate) return false;
      }

      // Payment Mode filter
      if (modeFilter !== 'ALL' && r.paymentMode !== modeFilter) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchForWhat = (r.forWhat || '').toLowerCase().includes(q);
        const matchPlace = (r.place || '').toLowerCase().includes(q);
        const matchNotes = (r.notes || '').toLowerCase().includes(q);
        const matchAmount = String(r.amount).includes(q);
        const matchMode = (r.paymentMode || '').toLowerCase().includes(q);
        return matchForWhat || matchPlace || matchNotes || matchAmount || matchMode;
      }

      return true;
    });

    // Sorting
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
  }, [records, selectedMonth, timeFilter, customStartDate, customEndDate, modeFilter, searchTerm, sortBy]);

  // LIVE TOP SUMMARY TOTALS (Calculated from filtered records!)
  const dynamicTotals = useMemo(() => {
    const totalIncome = filteredRecords
      .filter((r) => r.type === 'INCOME')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const totalExpense = filteredRecords
      .filter((r) => r.type === 'EXPENSE')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const netBalance = totalIncome - totalExpense;
    const totalVolume = totalIncome + totalExpense;
    const incomePercent = totalVolume > 0 ? (totalIncome / totalVolume) * 100 : 50;
    const expensePercent = totalVolume > 0 ? (totalExpense / totalVolume) * 100 : 50;

    return {
      totalIncome,
      totalExpense,
      netBalance,
      count: filteredRecords.length,
      incomePercent,
      expensePercent,
    };
  }, [filteredRecords]);

  // Open Form for Expense (Red) or Income (Green)
  const handleOpenForm = (type: 'EXPENSE' | 'INCOME', recordToEdit?: MoneyRecord) => {
    setFormType(type);
    if (recordToEdit) {
      setEditingRecord(recordToEdit);
      setFormData({
        date: recordToEdit.date,
        amount: String(recordToEdit.amount),
        paymentMode: recordToEdit.paymentMode || 'GPAY',
        forWhat: recordToEdit.forWhat,
        place: recordToEdit.place || '',
        notes: recordToEdit.notes || '',
        isShared: recordToEdit.isShared ?? true,
      });
    } else {
      setEditingRecord(null);
      let defaultDate = new Date().toISOString().split('T')[0];
      if (selectedMonth) {
        defaultDate = `${selectedMonth}-01`;
      }
      setFormData({
        date: defaultDate,
        amount: '',
        paymentMode: 'GPAY',
        forWhat: '',
        place: '',
        notes: '',
        isShared: true,
      });
    }
    setIsFormOpen(true);
  };

  // Duplicate entry helper
  const handleDuplicateRecord = (record: MoneyRecord) => {
    setFormType(record.type);
    setEditingRecord(null);
    setFormData({
      date: record.date,
      amount: String(record.amount),
      paymentMode: record.paymentMode || 'GPAY',
      forWhat: `${record.forWhat} (Copy)`,
      place: record.place || '',
      notes: record.notes || '',
      isShared: record.isShared ?? true,
    });
    setIsFormOpen(true);
    dispatch(showToast({ message: 'Cloned transaction into form', type: 'info' }));
  };

  // Quick Amount preset handler
  const handleQuickAddAmount = (addValue: number) => {
    const currentVal = Number(formData.amount) || 0;
    setFormData({ ...formData, amount: String(currentVal + addValue) });
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.forWhat.trim()) {
      dispatch(showToast({ message: 'Please enter "For What" purpose', type: 'warning' }));
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      dispatch(showToast({ message: 'Please enter a valid amount greater than 0', type: 'warning' }));
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        type: formType,
        amount: Number(formData.amount),
      };

      if (editingRecord) {
        await dispatch(updateMoneyAction({ id: editingRecord.id, data: payload })).unwrap();
        dispatch(showToast({ message: 'Transaction updated successfully', type: 'success' }));
      } else {
        await dispatch(createMoneyAction(payload)).unwrap();
        dispatch(
          showToast({
            message: `Recorded ${formType === 'EXPENSE' ? 'Expense' : 'Income'} of ₹${Number(formData.amount).toLocaleString('en-IN')}`,
            type: 'success',
          })
        );
      }

      dispatch(fetchMoneyMonthsSummary());
      setIsFormOpen(false);
    } catch (err: any) {
      dispatch(showToast({ message: err?.message || 'Failed to save transaction', type: 'error' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Record
  const handleDeleteRecord = async () => {
    if (!deletingId) return;
    try {
      await dispatch(deleteMoneyAction(deletingId)).unwrap();
      dispatch(fetchMoneyMonthsSummary());
      dispatch(showToast({ message: 'Transaction deleted', type: 'info' }));
      setDeletingId(null);
    } catch (err: any) {
      dispatch(showToast({ message: err?.message || 'Failed to delete transaction', type: 'error' }));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in pb-16 max-w-7xl mx-auto px-2 sm:px-4 md:px-6">
      {/* 1. TOP PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/50">
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate sm:whitespace-normal">
              Money Management
            </h1>
            <p className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400 font-normal mt-0.5 truncate sm:whitespace-normal">
              Day-to-day cashflow tracker. Manage GPay, Cash, and Bank expenses.
            </p>
          </div>
        </div>

        {/* Top Controls: Year Picker + Action Button */}
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
                  Year {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Record Transaction Button */}
          <button
            onClick={() => handleOpenForm('EXPENSE')}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold text-xs sm:text-sm transition cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Record Entry</span>
          </button>
        </div>
      </div>

      {/* 2. 3 STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
        {/* Total Income Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">Total Inflow (Income)</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 ml-1">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2 truncate">
            +₹{dynamicTotals.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
            {dynamicTotals.incomePercent.toFixed(1)}% of total cashflow
          </p>
        </div>

        {/* Total Expense Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">Total Outflow (Expense)</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 ml-1">
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-2 truncate">
            -₹{dynamicTotals.totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
            {dynamicTotals.expensePercent.toFixed(1)}% of total cashflow
          </p>
        </div>

        {/* Net Balance Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">Net Cashflow Balance</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 ml-1">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div
            className={`text-base sm:text-xl lg:text-2xl font-bold font-mono mt-2 truncate ${
              dynamicTotals.netBalance >= 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            ₹{dynamicTotals.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
            {dynamicTotals.count} {dynamicTotals.count === 1 ? 'entry' : 'entries'} recorded
          </p>
        </div>
      </div>

      {/* Visual Inflow vs Outflow Distribution Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Inflow: {dynamicTotals.incomePercent.toFixed(1)}%
          </span>
          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5" /> Outflow: {dynamicTotals.expensePercent.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${dynamicTotals.incomePercent}%` }}
            className="bg-emerald-500 transition-all duration-500"
          />
          <div
            style={{ width: `${dynamicTotals.expensePercent}%` }}
            className="bg-rose-500 transition-all duration-500"
          />
        </div>
      </div>

      {/* 2. TIME PERIOD FILTER BAR (Updates Cards & Table in Real-Time) */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
              Filter Cashflow Period:
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {[
              { id: 'MONTHLY', label: 'Monthly' },
              { id: 'TODAY', label: 'Today (Day)' },
              { id: 'WEEK_1', label: '1st Week (1-7)' },
              { id: 'WEEK_2', label: '2nd Week (8-14)' },
              { id: 'WEEK_3', label: '3rd Week (15-21)' },
              { id: 'WEEK_4', label: '4th Week (22+)' },
              { id: 'CUSTOM', label: 'Custom Range' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimeFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                  timeFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Row */}
        {timeFilter === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span>From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span>To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. MONTH CARDS OVERVIEW (1st card is ALWAYS Current Month!) */}
      {!selectedMonth ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Monthly Money Cards ({selectedYear}) — Current Month 1st
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">
              Click any card to open detailed red & green cashflow table
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allMonthsInYear.map((month) => (
              <div
                key={month.monthYear}
                onClick={() => dispatch(setSelectedMonth(month.monthYear))}
                className={`group relative bg-white dark:bg-slate-900 rounded-3xl p-5 border transition-all duration-200 cursor-pointer hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between ${
                  month.isCurrentMonth
                    ? 'border-emerald-500/80 dark:border-emerald-500/60 shadow-emerald-500/10 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          #{String(month.monthIndex).padStart(2, '0')}
                        </span>
                        <h3 className="font-black text-slate-900 dark:text-white text-base group-hover:text-emerald-600 transition">
                          {month.monthName}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">{month.year}</p>
                    </div>

                    {month.isCurrentMonth && (
                      <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 animate-pulse">
                        <Sparkles className="w-3 h-3" /> 1st Current Month
                      </span>
                    )}
                  </div>

                  {/* Numbers */}
                  <div className="mt-4 space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1 font-medium">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Income
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +₹{month.totalIncome.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1 font-medium">
                        <TrendingDown className="w-3.5 h-3.5 text-rose-500" /> Expense
                      </span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        -₹{month.totalExpense.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Balance</span>
                      <span
                        className={`font-mono font-black ${
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

                {/* Footer */}
                <div className="mt-4 pt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{month.count} entries</span>
                  <div className="flex items-center text-emerald-600 font-extrabold group-hover:translate-x-1 transition text-xs">
                    <span>Open Month</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* 4. ACTIVE MONTH VIEW WITH 2 BIG BUTTONS & TABLE */
        <div className="space-y-4">
          {/* Active Month Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => dispatch(clearSelectedMonth())}
                className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition shrink-0 active:scale-95"
                title="Back to all month cards"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  {activeMonthInfo?.monthLabel || selectedMonth} Ledger
                </h2>
                <p className="text-xs text-slate-500">
                  Click Red (- Expense) or Green (+ Income) to add new rows into the table
                </p>
              </div>
            </div>

            {/* Action Buttons in Month View */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleOpenForm('INCOME')}
                className="flex items-center gap-1.5 px-3.5 sm:px-4 h-10 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition whitespace-nowrap"
              >
                <TrendingUp className="w-4 h-4" />
                <span>+ Income</span>
              </button>

              <button
                onClick={() => handleOpenForm('EXPENSE')}
                className="flex items-center gap-1.5 px-3.5 sm:px-4 h-10 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-500/20 transition whitespace-nowrap"
              >
                <TrendingDown className="w-4 h-4" />
                <span>- Expense</span>
              </button>
            </div>
          </div>


          {/* Search, Mode & Sort Filters */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search purpose, place, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 pl-9 pr-4 py-2 rounded-xl text-xs font-medium text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {['ALL', 'GPAY', 'CASH', 'ACCOUNT_TRANSFER'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setModeFilter(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
                      modeFilter === m
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {m === 'ALL' ? 'All Modes' : m === 'GPAY' ? 'GPay' : m === 'CASH' ? 'Cash' : 'Bank'}
                  </button>
                ))}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs font-semibold px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="DATE_DESC">Date: Newest</option>
                  <option value="DATE_ASC">Date: Oldest</option>
                  <option value="AMOUNT_DESC">Amount: Highest</option>
                  <option value="AMOUNT_ASC">Amount: Lowest</option>
                </select>
              </div>
            </div>
          </div>

          {/* MASTER MONEY TABLE (LIGHT RED FOR EXPENSE, LIGHT GREEN FOR INCOME) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading cashflow records...</span>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <Wallet className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    No transactions found in this period
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Click the Red button to record an expense or the Green button to record income.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => handleOpenForm('INCOME')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition"
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> + Add Income
                  </button>
                  <button
                    onClick={() => handleOpenForm('EXPENSE')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition"
                  >
                    <TrendingDown className="w-3.5 h-3.5" /> - Add Expense
                  </button>
                </div>

              </div>
            ) : (
              <div>
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-black uppercase text-[11px] border-b border-slate-200 dark:border-slate-700">
                        <th className="py-3.5 px-4 w-12 text-center">#</th>
                        <th className="py-3.5 px-4 w-28">Date</th>
                        <th className="py-3.5 px-3 w-28">Type</th>
                        <th className="py-3.5 px-5">For What (Purpose)</th>
                        <th className="py-3.5 px-3 w-36">Place / Location</th>
                        <th className="py-3.5 px-3 w-36">Payment Mode</th>
                        <th className="py-3.5 px-4 w-36 text-right">Amount (₹)</th>
                        <th className="py-3.5 px-4">Notes</th>
                        <th className="py-3.5 px-4 w-24 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium">
                      {filteredRecords.map((r, i) => {
                        const isIncome = r.type === 'INCOME';

                        return (
                          <tr
                            key={r.id}
                            className={`transition-colors border-l-4 ${
                              isIncome
                                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/40 border-l-emerald-500 text-emerald-950 dark:text-emerald-100'
                                : 'bg-rose-50/80 dark:bg-rose-950/30 hover:bg-rose-100/90 dark:hover:bg-rose-900/40 border-l-rose-500 text-rose-950 dark:text-rose-100'
                            }`}
                          >
                            {/* Index */}
                            <td className="py-4 px-4 text-center font-mono font-bold opacity-60">
                              {i + 1}
                            </td>

                            {/* Date */}
                            <td className="py-4 px-4 whitespace-nowrap font-mono font-bold">
                              <div>{r.date}</div>
                              <div className="text-[10px] opacity-70">
                                {new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' })}
                              </div>
                            </td>

                            {/* Type */}
                            <td className="py-4 px-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                  isIncome
                                    ? 'bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-100 shadow-xs'
                                    : 'bg-rose-200/80 dark:bg-rose-900/80 text-rose-900 dark:text-rose-100 shadow-xs'
                                }`}
                              >
                                {isIncome ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                {r.type}
                              </span>
                            </td>

                            {/* For What */}
                            <td className="py-4 px-5 font-black text-sm">
                              {r.forWhat}
                            </td>

                            {/* Place */}
                            <td className="py-4 px-3 whitespace-nowrap">
                              {r.place ? (
                                <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold text-xs bg-white/70 dark:bg-slate-800/70 px-2 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                                  <MapPin className="w-3 h-3 text-rose-500" />
                                  {r.place}
                                </span>
                              ) : (
                                <span className="opacity-40">—</span>
                              )}
                            </td>

                            {/* Payment Mode */}
                            <td className="py-4 px-3 whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded-xl font-extrabold text-[11px] bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 shadow-xs">
                                {r.paymentMode === 'GPAY'
                                  ? '💳 GPay / UPI'
                                  : r.paymentMode === 'CASH'
                                  ? '💵 Cash'
                                  : r.paymentMode === 'ACCOUNT_TRANSFER'
                                  ? '🏦 Bank Transfer'
                                  : r.paymentMode}
                              </span>
                            </td>

                            {/* Amount */}
                            <td className="py-4 px-4 whitespace-nowrap text-right font-mono font-black text-sm sm:text-base">
                              <span className={isIncome ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>
                                {isIncome ? '+' : '-'} ₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            {/* Notes */}
                            <td className="py-4 px-4 max-w-xs text-xs opacity-80">
                              {r.notes || '—'}
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleDuplicateRecord(r)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-white/80 dark:hover:bg-slate-800 transition"
                                  title="Duplicate"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenForm(r.type, r)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white/80 dark:hover:bg-slate-800 transition"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingId(r.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white/80 dark:hover:bg-slate-800 transition"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Table Footer */}
                    <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                      <tr>
                        <td colSpan={4} className="py-4 px-4 font-black uppercase text-slate-500">
                          Period Total ({filteredRecords.length} items):
                        </td>
                        <td colSpan={2} className="py-4 px-4 font-mono font-bold text-xs">
                          <span className="text-emerald-600">Inflow: +₹{dynamicTotals.totalIncome.toLocaleString('en-IN')}</span> | <span className="text-rose-600">Outflow: -₹{dynamicTotals.totalExpense.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-black text-base text-blue-600 dark:text-blue-400">
                          Net: ₹{dynamicTotals.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile Responsive Cards Stack */}
                <div className="md:hidden divide-y divide-slate-200/80 dark:divide-slate-800/80">
                  {filteredRecords.map((r) => {
                    const isIncome = r.type === 'INCOME';

                    return (
                      <div
                        key={r.id}
                        className={`p-4 space-y-3 border-l-4 ${
                          isIncome
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-l-emerald-500'
                            : 'bg-rose-50/80 dark:bg-rose-950/30 border-l-rose-500'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                                  isIncome
                                    ? 'bg-emerald-200 text-emerald-800'
                                    : 'bg-rose-200 text-rose-800'
                                }`}
                              >
                                {isIncome ? '+' : '-'} {r.type}
                              </span>
                              <span className="font-mono text-xs text-slate-500">{r.date}</span>
                            </div>
                            <h4 className="font-black text-sm text-slate-900 dark:text-white">
                              {r.forWhat}
                            </h4>
                          </div>

                          <div
                            className={`font-black font-mono text-base ${
                              isIncome ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {isIncome ? '+' : '-'}₹{Number(r.amount).toLocaleString('en-IN')}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded-md font-bold bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-[11px]">
                            {r.paymentMode === 'GPAY'
                              ? 'GPay'
                              : r.paymentMode === 'CASH'
                              ? 'Cash'
                              : r.paymentMode === 'ACCOUNT_TRANSFER'
                              ? 'Bank'
                              : r.paymentMode}
                          </span>
                          {r.place && (
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                              <MapPin className="w-3 h-3 text-rose-500" />
                              {r.place}
                            </span>
                          )}
                        </div>

                        {r.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl">
                            {r.notes}
                          </p>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                          <button
                            onClick={() => handleDuplicateRecord(r)}
                            className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-white/80 rounded-lg flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Clone
                          </button>
                          <button
                            onClick={() => handleOpenForm(r.type, r)}
                            className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-white/80 rounded-lg flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => setDeletingId(r.id)}
                            className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-white/80 rounded-lg flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL FORM WITH PRESET AMOUNTS & PURPOSE CHIPS */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
            {/* Modal Header */}
            <div
              className={`p-5 sm:p-6 border-b flex items-center justify-between ${
                formType === 'EXPENSE'
                  ? 'bg-rose-50/90 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/60'
                  : 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-2xl text-white shadow-md ${
                    formType === 'EXPENSE' ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}
                >
                  {formType === 'EXPENSE' ? (
                    <TrendingDown className="w-5 h-5" />
                  ) : (
                    <TrendingUp className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                    {editingRecord ? 'Edit Entry' : formType === 'EXPENSE' ? 'Record Expense (Red)' : 'Record Income (Green)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formType === 'EXPENSE' ? 'Enter money paid out' : 'Enter money received'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="p-5 sm:p-6 space-y-4">
              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-black font-mono text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Preset Amount Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 mr-1">Quick +:</span>
                {QUICK_AMOUNT_PRESETS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAddAmount(val)}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold transition"
                  >
                    +₹{val}
                  </button>
                ))}
              </div>

              {/* Payment Option Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Payment Mode / Option *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PAYMENT_MODES.map((mode) => {
                    const isSelected = formData.paymentMode === mode.id;
                    const Icon = mode.icon;

                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMode: mode.id })}
                        className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 transition ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-md shadow-emerald-500/20'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                        <span className="text-[11px] font-bold">{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* For What (Purpose) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  For What (Purpose / Item) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dinner, Fuel, Groceries, Freelance Payout, Rent"
                  value={formData.forWhat}
                  onChange={(e) => setFormData({ ...formData, forWhat: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none"
                />
              </div>

              {/* Quick Purpose Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_PURPOSE_PRESETS.filter((p) => p.type === formType).map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, forWhat: preset.label })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition"
                    >
                      <Icon className="w-3 h-3 text-emerald-600" />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Place / Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Place / Location / Vendor (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Starbucks, Kochi, Supermarket, Amazon"
                  value={formData.place}
                  onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none"
                />
              </div>

              {/* Special Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Special Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional remarks..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex items-center gap-1.5 px-6 py-2.5 rounded-2xl text-white font-black text-xs sm:text-sm shadow-lg transition ${
                    formType === 'EXPENSE'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : editingRecord ? 'Save Changes' : `Save ${formType === 'EXPENSE' ? 'Expense' : 'Income'}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRM MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Delete Transaction?
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Are you sure you want to delete this cashflow record? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRecord}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
