import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchDayToDayNotes,
  createDayToDayNoteAction,
  updateDayToDayNoteAction,
  deleteDayToDayNoteAction,
  toggleCompleteDayToDayNoteAction,
  setSelectedDate,
} from '../store/slices/dayToDaySlice';
import { showToast } from '../store/slices/uiSlice';
import { DayToDayNote } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  X,
  Search,
  CalendarDays,
  FileText,
  Loader2,
} from 'lucide-react';

const CATEGORIES = ['General', 'Meeting', 'Decision', 'Task', 'Important', 'Milestone'];

export const DayToDayPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { notes, selectedDate, isLoading } = useSelector((state: RootState) => state.dayToDay);

  // Calendar navigation state (current displayed month & year)
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<DayToDayNote | null>(null);

  // Form Fields
  const [formDate, setFormDate] = useState(selectedDate);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formPriority, setFormPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [formTime, setFormTime] = useState('');

  // Fetch all notes on initial load
  useEffect(() => {
    dispatch(fetchDayToDayNotes());
  }, [dispatch]);

  // Year & Month for current calendar view
  const currentYear = currentMonthDate.getFullYear();
  const currentMonth = currentMonthDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleJumpToToday = () => {
    const today = new Date();
    const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setCurrentMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    dispatch(setSelectedDate(formatted));
  };

  // Calendar Grid Calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      notesCount: number;
      hasHighPriority: boolean;
    }> = [];

    const todayStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayNotes = notes.filter((n) => n.date === dateStr);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        notesCount: dayNotes.length,
        hasHighPriority: dayNotes.some((n) => n.priority === 'HIGH'),
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayNotes = notes.filter((n) => n.date === dateStr);
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        notesCount: dayNotes.length,
        hasHighPriority: dayNotes.some((n) => n.priority === 'HIGH'),
      });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remainingCells = 42 - days.length;
    if (remainingCells > 0 && remainingCells < 7) {
      for (let i = 1; i <= remainingCells; i++) {
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayNotes = notes.filter((n) => n.date === dateStr);
        days.push({
          dateStr,
          dayNumber: i,
          isCurrentMonth: false,
          isToday: dateStr === todayStr,
          isSelected: dateStr === selectedDate,
          notesCount: dayNotes.length,
          hasHighPriority: dayNotes.some((n) => n.priority === 'HIGH'),
        });
      }
    }

    return days;
  }, [currentYear, currentMonth, notes, selectedDate]);

  // Notes filtered for the selected date
  const selectedDateNotes = useMemo(() => {
    return notes
      .filter((n) => n.date === selectedDate)
      .filter((n) => {
        if (selectedCategoryFilter !== 'ALL' && n.category !== selectedCategoryFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q) ||
            n.category.toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [notes, selectedDate, selectedCategoryFilter, search]);

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthlyNotes = notes.filter((n) => n.date.startsWith(prefix));
    const completed = monthlyNotes.filter((n) => n.isCompleted).length;
    const highPriority = monthlyNotes.filter((n) => n.priority === 'HIGH').length;
    return {
      total: monthlyNotes.length,
      completed,
      highPriority,
    };
  }, [notes, currentYear, currentMonth]);

  // Form handlers
  const handleOpenCreateModal = () => {
    setEditingNote(null);
    setFormDate(selectedDate);
    setFormTitle('');
    setFormContent('');
    setFormCategory('General');
    setFormPriority('MEDIUM');
    setFormTime('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (note: DayToDayNote) => {
    setEditingNote(note);
    setFormDate(note.date);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category);
    setFormPriority(note.priority);
    setFormTime(note.time || '');
    setIsModalOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    try {
      if (editingNote) {
        await dispatch(
          updateDayToDayNoteAction({
            id: editingNote.id,
            data: {
              date: formDate,
              title: formTitle,
              content: formContent,
              category: formCategory,
              priority: formPriority,
              time: formTime || null,
            },
          })
        ).unwrap();
        dispatch(showToast({ message: 'Day-to-Day note updated', type: 'success' }));
      } else {
        await dispatch(
          createDayToDayNoteAction({
            date: formDate,
            title: formTitle,
            content: formContent,
            category: formCategory,
            priority: formPriority,
            time: formTime || undefined,
          })
        ).unwrap();
        dispatch(showToast({ message: 'Day-to-Day note saved', type: 'success' }));
      }

      setIsModalOpen(false);
      dispatch(setSelectedDate(formDate));
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to save note', type: 'error' }));
    }
  };

  const handleDeleteNote = async (id: string, title: string) => {
    if (window.confirm(`Delete note "${title}"?`)) {
      try {
        await dispatch(deleteDayToDayNoteAction(id)).unwrap();
        dispatch(showToast({ message: 'Note deleted', type: 'info' }));
      } catch (err: any) {
        dispatch(showToast({ message: err.message || 'Failed to delete', type: 'error' }));
      }
    }
  };

  const handleToggleComplete = async (id: string) => {
    try {
      await dispatch(toggleCompleteDayToDayNoteAction(id)).unwrap();
    } catch (err: any) {
      dispatch(showToast({ message: 'Failed to toggle status', type: 'error' }));
    }
  };

  // Formatted date string for selected date
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [selectedDate]);

  const isSelectedDateToday = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return selectedDate === todayStr;
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Day-to-Day Schedule & Notes</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Interactive dual-partner calendar, daily notes, action items, and milestone tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleJumpToToday}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Today</span>
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Note / Entry</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left side Calendar, Right side Day's Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Calendar Card (5 Cols on large screens) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm dark:shadow-xl space-y-4">
          {/* Calendar Header with Month/Year Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Click any date to view and add notes
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* 7x6 Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, idx) => {
              const isSelected = day.isSelected;
              const isToday = day.isToday;
              const isCurrent = day.isCurrentMonth;

              return (
                <button
                  key={`${day.dateStr}-${idx}`}
                  onClick={() => dispatch(setSelectedDate(day.dateStr))}
                  className={`relative flex flex-col items-center justify-between p-2 h-14 rounded-2xl transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30 scale-[1.03] z-10'
                      : isToday
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-400/50 font-bold'
                      : isCurrent
                      ? 'bg-slate-50/70 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                      : 'text-slate-400 dark:text-slate-600 opacity-40 hover:opacity-80'
                  }`}
                >
                  <span className="text-xs">{day.dayNumber}</span>

                  {/* Indicator Dots for notes count */}
                  <div className="flex items-center gap-0.5 mt-auto">
                    {day.notesCount > 0 && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected
                            ? 'bg-white'
                            : day.hasHighPriority
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                        }`}
                      />
                    )}
                    {day.notesCount > 1 && (
                      <span
                        className={`text-[9px] font-mono leading-none ${
                          isSelected ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        +{day.notesCount - 1}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Monthly Summary Statistics */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-base font-extrabold text-slate-900 dark:text-white">{monthlyStats.total}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Total Notes</div>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-500/20">
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{monthlyStats.completed}</div>
              <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Completed</div>
            </div>
            <div className="p-2 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-500/20">
              <div className="text-base font-extrabold text-rose-600 dark:text-rose-400">{monthlyStats.highPriority}</div>
              <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80">High Priority</div>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Day's Details & Notes (7 Cols on large screens) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-5">
          {/* Day Details Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Day Schedule & Log
                </span>
                {isSelectedDateToday && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                    Today
                  </span>
                )}
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {formattedSelectedDate}
              </h2>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Day Note</span>
            </button>
          </div>

          {/* Search & Category Filter Pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search notes on this date..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategoryFilter === cat
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Notes List for Selected Date */}
          {isLoading && notes.length === 0 ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : selectedDateNotes.length === 0 ? (
            <div className="p-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3 bg-slate-50/50 dark:bg-slate-950/20">
              <FileText className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No entries recorded for {selectedDate}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Log daily partner discussions, customer meetings, key business decisions, or to-do action items.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Entry for This Date</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {selectedDateNotes.map((note) => {
                const isCompleted = note.isCompleted;

                return (
                  <div
                    key={note.id}
                    className={`border rounded-2xl p-4 transition-all ${
                      isCompleted
                        ? 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800/60 opacity-80'
                        : note.priority === 'HIGH'
                        ? 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-500/30 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Complete Toggle Checkbox */}
                        <button
                          onClick={() => handleToggleComplete(note.id)}
                          className="mt-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition shrink-0"
                          title={isCompleted ? 'Mark Incomplete' : 'Mark Completed'}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>

                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              className={`text-sm font-bold text-slate-900 dark:text-white leading-snug ${
                                isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                              }`}
                            >
                              {note.title}
                            </h3>

                            {/* Category Badge */}
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-500/20">
                              {note.category}
                            </span>

                            {/* Priority Badge */}
                            {note.priority === 'HIGH' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-500/20">
                                High Priority
                              </span>
                            )}

                            {/* Time Badge if available */}
                            {note.time && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {note.time}
                              </span>
                            )}
                          </div>

                          {/* Note Content */}
                          {note.content && (
                            <p
                              className={`text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap ${
                                isCompleted ? 'line-through text-slate-400 dark:text-slate-600' : ''
                              }`}
                            >
                              {note.content}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditModal(note)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition"
                          title="Edit Entry"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id, note.title)}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Footer Author & Timestamp */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Logged by {note.author?.name || 'Partner'} ({note.author?.role || 'AD'})</span>
                      <span>{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Day-to-Day Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    {editingNote ? 'Edit Day-to-Day Note' : 'Add Day-to-Day Note'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Record meetings, milestone updates, decisions, or daily logs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveNote} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Date (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Title / Subject
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Partner strategy sync, AWS deployment, Client contract signed"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e: any) => setFormPriority(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Notes / Details
                </label>
                <textarea
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Enter detailed points, decisions made, follow-up actions..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/30 transition"
                >
                  {editingNote ? 'Update Note' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
