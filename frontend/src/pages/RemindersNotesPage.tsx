import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchSharedNotes,
  createSharedNoteAction,
  markSharedNoteReadAction,
  deleteSharedNoteAction,
} from '../store/slices/sharedNotesSlice';
import { showToast } from '../store/slices/uiSlice';
import {
  StickyNote,
  Plus,
  Send,
  CheckCircle2,
  Trash2,
  Calendar,
  X,
  Loader2,
  Eye,
} from 'lucide-react';

export const RemindersNotesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { notes, isLoading } = useSelector((state: RootState) => state.sharedNotes);
  const user = useSelector((state: RootState) => state.auth.user);
  const partnerStatus = useSelector((state: RootState) => state.auth.partnerStatus);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [promptOnLogin, setPromptOnLogin] = useState(true);

  useEffect(() => {
    dispatch(fetchSharedNotes());
  }, [dispatch]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerStatus?.partner) {
      dispatch(showToast({ message: 'Partner account not found', type: 'error' }));
      return;
    }

    try {
      await dispatch(
        createSharedNoteAction({
          title,
          content,
          recipientId: partnerStatus.partner.id,
          reminderDate: reminderDate ? new Date(reminderDate).toISOString() : undefined,
          promptOnLogin,
        })
      ).unwrap();

      dispatch(showToast({ message: 'Note left for your partner!', type: 'success' }));
      setIsModalOpen(false);
      setTitle('');
      setContent('');
      setReminderDate('');
      setPromptOnLogin(true);
    } catch (err) {
      dispatch(showToast({ message: 'Failed to create note', type: 'error' }));
    }
  };

  const handleMarkRead = async (id: string) => {
    await dispatch(markSharedNoteReadAction(id));
    dispatch(showToast({ message: 'Read receipt sent to author!', type: 'success' }));
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this note?')) {
      await dispatch(deleteSharedNoteAction(id));
      dispatch(showToast({ message: 'Note deleted', type: 'info' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <StickyNote className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <span>Reminders & Shared Notes</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Leave prominent notes specifically for your partner, scheduled reminders, and automatic read receipts.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Leave Note For Partner</span>
        </button>
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3 shadow-sm dark:shadow-none">
          <StickyNote className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Active Notes</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Leave a note specifically for your partner to display prominently when they next log in.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((note) => {
            const isRecipient = note.recipientId === user?.id;
            const isAuthor = note.authorId === user?.id;

            return (
              <div
                key={note.id}
                className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          {isAuthor ? `To: ${note.recipient.name}` : `From: ${note.author.name}`}
                        </span>
                        {note.promptOnLogin && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            Prompts On Login
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5 leading-snug">{note.title}</h3>
                    </div>

                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800/60 font-sans">
                    {note.content}
                  </p>

                  {note.reminderDate && (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-300">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                      <span>Reminder: {new Date(note.reminderDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Read Receipt & Actions */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    {note.isRead ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Read by {note.recipient.name} ({new Date(note.readAt || note.updatedAt).toLocaleDateString()})</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">Unread</span>
                    )}
                  </div>

                  {isRecipient && !note.isRead && (
                    <button
                      onClick={() => handleMarkRead(note.id)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Read</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 dark:border-purple-500/30">
                  <StickyNote className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Leave Note For Partner</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Targeted specifically for {partnerStatus?.partner?.name || 'Partner'}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-1">Subject / Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Urgent review: Q4 Term Sheet & Escrow"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-1">Note Content</label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write clear directives or thoughts for your partner..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-1">Reminder Date (Optional)</label>
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="promptLogin"
                  checked={promptOnLogin}
                  onChange={(e) => setPromptOnLogin(e.target.checked)}
                  className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="promptLogin" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Prominently pop up this note when partner next logs in
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
