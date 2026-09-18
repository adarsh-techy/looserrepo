import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  updateBusinessItemAction,
  deleteBusinessItemAction,
} from '../store/slices/businessSlice';
import { showToast } from '../store/slices/uiSlice';
import { api } from '../services/api';
import { BusinessItem } from '../types';
import {
  ArrowLeft,
  Tag,
  ExternalLink,
  Paperclip,
  Trash2,
  Edit,
  Clock,
  User,
  Shield,
  X,
  Loader2,
  FileText,
} from 'lucide-react';

export const BusinessDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const storeItem = useSelector((state: RootState) =>
    state.business.items.find(i => i.id === id)
  );

  const [item, setItem] = useState<BusinessItem | null>(storeItem || null);
  const [loading, setLoading] = useState(!storeItem);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Edit Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Strategic');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [linksInput, setLinksInput] = useState('');

  useEffect(() => {
    async function loadItem() {
      if (!id) return;
      try {
        setLoading(true);
        const res = await api.get(`/business/${id}`);
        setItem(res);
      } catch (err: any) {
        dispatch(showToast({ message: 'Failed to load business details', type: 'error' }));
        navigate('/business');
      } finally {
        setLoading(false);
      }
    }

    loadItem();
  }, [id, dispatch, navigate]);

  const handleOpenEdit = () => {
    if (!item) return;
    setTitle(item.title);
    setCategory(item.category);
    setDescription(item.description);
    setTagsInput(item.tags.join(', '));
    setLinksInput(item.links.map(l => `${l.title}|${l.url}`).join('\n'));
    setIsModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const links = linksInput
      .split('\n')
      .map(line => {
        const parts = line.split('|');
        return parts.length >= 2 ? { title: parts[0].trim(), url: parts[1].trim() } : null;
      })
      .filter(Boolean);

    try {
      const updated = await dispatch(
        updateBusinessItemAction({
          id: item.id,
          data: { title, category, description, tags, links },
        })
      ).unwrap();

      setItem(updated);
      dispatch(showToast({ message: 'Business record updated successfully!', type: 'success' }));
      setIsModalOpen(false);
    } catch (err: any) {
      dispatch(showToast({ message: 'Failed to save changes', type: 'error' }));
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (confirm(`Permanently delete "${item.title}"?`)) {
      await dispatch(deleteBusinessItemAction(item.id));
      dispatch(showToast({ message: 'Record deleted', type: 'info' }));
      navigate('/business');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading business asset...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Business record not found</h2>
        <Link
          to="/business"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Business Vault</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/business"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition group"
        >
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/60 border border-slate-200 dark:border-slate-700">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span>Back to Business Vault</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenEdit}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <Edit className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Edit Record</span>
          </button>
          <button
            onClick={handleDelete}
            className="px-3.5 py-2 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Detail Header Card */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase font-bold tracking-wider px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                {item.category}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                <Shield className="w-3 h-3" />
                <span>Shared Partner Asset</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {item.title}
            </h1>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Created by: <strong className="text-slate-800 dark:text-slate-200">{item.owner?.name || 'Partner'}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Updated: {new Date(item.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Detailed Content / Description */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Overview & Documentation</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/80 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {item.description}
          </div>
        </div>

        {/* Tags Section */}
        {item.tags && item.tags.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Classifications & Tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1.5 text-xs font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800/50"
                >
                  <Tag className="w-3 h-3 text-purple-500" />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Links & External Documentation */}
        {item.links && item.links.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Associated Links & Resources</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {item.links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 hover:bg-blue-50/50 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-600/50 rounded-2xl transition group shadow-sm"
                >
                  <div className="space-y-0.5 truncate pr-2">
                    <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                      {link.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate font-mono">
                      {link.url}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Attachments Section */}
        {item.attachments && item.attachments.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Paperclip className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Vault Attachments</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {item.attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3"
                >
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{att.name}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-mono">{att.type || 'Document'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                    Edit Business Record
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    Modify business terms, tags & links
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Strategic">Strategic</option>
                  <option value="Financial">Financial</option>
                  <option value="Operations">Operations</option>
                  <option value="Legal">Legal</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Description / Details</label>
                <textarea
                  rows={5}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Links (Title|URL per line)</label>
                <textarea
                  rows={2}
                  value={linksInput}
                  onChange={(e) => setLinksInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/30 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
