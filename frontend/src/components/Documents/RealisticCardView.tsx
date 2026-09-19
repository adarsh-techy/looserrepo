import React, { useState } from 'react';
import {
  CreditCard as CardIcon,
  Landmark,
  ShieldCheck,
  HeartHandshake,
  Eye,
  EyeOff,
  Copy,
  Check,
  Phone,
  Edit2,
  Trash2,
  Paperclip,
  QrCode,
  Lock,
} from 'lucide-react';
import { DocumentItem } from '../../types/document';

interface RealisticCardViewProps {
  item: DocumentItem;
  onEdit: (item: DocumentItem) => void;
  onDelete: (id: string, title: string) => void;
  onViewAttachment: (attachment: any, itemTitle: string) => void;
}

export const RealisticCardView: React.FC<RealisticCardViewProps> = ({
  item,
  onEdit,
  onDelete,
  onViewAttachment,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleReveal = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Format 16-digit card number with spaces: 4591 8234 9012 4829
  const formatCardNumber = (num: string | null | undefined, revealed: boolean) => {
    if (!num) return '•••• •••• •••• ••••';
    const clean = num.replace(/\s+/g, '');
    if (!revealed) {
      const last4 = clean.slice(-4);
      return `•••• •••• •••• ${last4}`;
    }
    return clean.match(/.{1,4}/g)?.join(' ') || clean;
  };

  // Format Aadhaar: 5829 4910 2847
  const formatAadhaar = (num: string | null | undefined, revealed: boolean) => {
    if (!num) return '•••• •••• ••••';
    const clean = num.replace(/\s+/g, '');
    if (!revealed) {
      const last4 = clean.slice(-4);
      return `•••• •••• ${last4}`;
    }
    return clean.match(/.{1,4}/g)?.join(' ') || clean;
  };

  /* ------------------------------------------------------------- */
  /* 1. ATM / DEBIT / CREDIT CARD DESIGN                          */
  /* ------------------------------------------------------------- */
  if (item.category === 'ATM') {
    const isCredit = item.cardType === 'CREDIT';
    const isRevealed = !!revealedKeys[`card_${item.id}`];
    const isCvvRevealed = !!revealedKeys[`cvv_${item.id}`];

    return (
      <div className="relative group rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] overflow-hidden border border-white/10 shadow-xl bg-gradient-to-br min-h-[240px] flex flex-col justify-between"
        style={{
          background: isCredit
            ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%)'
            : 'linear-gradient(135deg, #0c4a6e 0%, #0f172a 50%, #082f49 100%)',
        }}
      >
        {/* Subtle decorative glow & circuits */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-xl pointer-events-none -ml-16 -mb-16" />

        {/* Card Header: Bank Name & Network Badge */}
        <div className="relative z-10 flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-mono text-cyan-400 font-bold">
              {item.cardType || 'DEBIT CARD'}
            </span>
            <h4 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              {item.bankName || item.title}
            </h4>
          </div>

          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <CardIcon className="w-4 h-4 text-cyan-300" />
            <span className="text-xs font-black tracking-wider text-white">
              {item.cardNetwork || 'VISA'}
            </span>
          </div>
        </div>

        {/* EMV Chip & Contactless Graphic */}
        <div className="relative z-10 my-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Metallic Gold Chip */}
            <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 border border-amber-500/60 shadow-inner flex flex-col justify-around p-1">
              <div className="w-full h-0.5 bg-amber-600/30 rounded" />
              <div className="w-full h-0.5 bg-amber-600/30 rounded" />
              <div className="w-full h-0.5 bg-amber-600/30 rounded" />
            </div>

            {/* Contactless waves */}
            <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.5a6.5 6.5 0 000-13M15.5 21a10 10 0 000-18" />
            </svg>
          </div>

          {/* Quick Reveal / Mask Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => toggleReveal(`card_${item.id}`, e)}
              title={isRevealed ? 'Hide Number' : 'Reveal Number'}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 transition text-xs flex items-center gap-1"
            >
              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="text-[10px]">{isRevealed ? 'Mask' : 'Reveal'}</span>
            </button>

            {item.cardNumber && (
              <button
                onClick={(e) => handleCopy(item.cardNumber!.replace(/\s+/g, ''), `card_${item.id}`, e)}
                title="Copy Card Number"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 transition text-xs flex items-center gap-1"
              >
                {copiedKey === `card_${item.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[10px]">{copiedKey === `card_${item.id}` ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 16-Digit Card Number Display */}
        <div className="relative z-10 mb-4 font-mono font-bold tracking-widest text-lg sm:text-xl text-white drop-shadow-md">
          {formatCardNumber(item.cardNumber, isRevealed)}
        </div>

        {/* Bottom Details: Cardholder, Expiry, CVV */}
        <div className="relative z-10 grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-xs">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Cardholder</div>
            <div className="font-bold text-white uppercase tracking-wide truncate">
              {item.holderName || 'ADARSH S'}
            </div>
          </div>

          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Expires</div>
            <div className="font-bold font-mono text-white">
              {item.expiryDate || '••/••'}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
              <span>CVV</span>
              <button
                onClick={(e) => toggleReveal(`cvv_${item.id}`, e)}
                className="text-cyan-300 hover:underline cursor-pointer"
              >
                {isCvvRevealed ? 'hide' : 'show'}
              </button>
            </div>
            <div className="flex items-center gap-1 font-bold font-mono text-amber-300">
              <span>{isCvvRevealed ? item.cvv || '---' : '•••'}</span>
              {item.cvv && (
                <button
                  onClick={(e) => handleCopy(item.cvv!, `cvv_${item.id}`, e)}
                  title="Copy CVV"
                  className="p-0.5 hover:text-white transition"
                >
                  {copiedKey === `cvv_${item.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="relative z-10 mt-3 pt-2.5 flex items-center justify-between border-t border-white/5 text-[11px] text-slate-300">
          {item.pinHint ? (
            <div className="flex items-center gap-1 text-[10px] text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/40">
              <Lock className="w-3 h-3" />
              <span>Hint: {item.pinHint}</span>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {item.attachments && item.attachments.length > 0 && (
              <button
                onClick={() => onViewAttachment(item.attachments[0], item.title)}
                className="flex items-center gap-1 text-[11px] text-cyan-300 hover:text-white transition bg-white/10 px-2 py-0.5 rounded-lg"
              >
                <Paperclip className="w-3 h-3" />
                <span>{item.attachments.length} Scan</span>
              </button>
            )}
            <button
              onClick={() => onEdit(item)}
              title="Edit Card"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(item.id, item.title)}
              title="Delete Card"
              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- */
  /* 2. BANK ACCOUNT DESIGN (Passbook / Financial Card)           */
  /* ------------------------------------------------------------- */
  if (item.category === 'BANK') {
    const isRevealed = !!revealedKeys[`acc_${item.id}`];

    return (
      <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/20">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {item.subType || 'SAVINGS'} ACCOUNT
                </span>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                  {item.bankName || item.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Holder: <span className="font-semibold text-slate-800 dark:text-slate-200">{item.holderName || 'Adarsh S'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onEdit(item)}
                title="Edit Account"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(item.id, item.title)}
                title="Delete Account"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Account Number & IFSC Grid */}
          <div className="mt-4 space-y-3">
            {/* Account Number */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Account Number
                </span>
                <div className="text-base font-black font-mono text-slate-900 dark:text-white tracking-wider">
                  {isRevealed
                    ? item.accountNumber || '—'
                    : item.accountNumber
                    ? `•••• •••• ${item.accountNumber.slice(-4)}`
                    : '—'}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => toggleReveal(`acc_${item.id}`, e)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                  title={isRevealed ? 'Hide' : 'Reveal'}
                >
                  {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {item.accountNumber && (
                  <button
                    onClick={(e) => handleCopy(item.accountNumber!, `acc_${item.id}`, e)}
                    className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1 shadow-sm transition"
                    title="Copy Account Number"
                  >
                    {copiedKey === `acc_${item.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === `acc_${item.id}` ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* IFSC Code & Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    IFSC Code
                  </span>
                  <div className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {item.ifscCode || '—'}
                  </div>
                </div>
                {item.ifscCode && (
                  <button
                    onClick={(e) => handleCopy(item.ifscCode!, `ifsc_${item.id}`, e)}
                    className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                    title="Copy IFSC"
                  >
                    {copiedKey === `ifsc_${item.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Branch / Location
                </span>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate" title={item.branchLocation || ''}>
                  {item.branchLocation || 'Not specified'}
                </div>
              </div>
            </div>

            {/* UPI ID */}
            {item.upiId && (
              <div className="p-2.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-800/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <QrCode className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">UPI ID:</span>
                  <span className="font-mono font-bold text-teal-700 dark:text-teal-300">{item.upiId}</span>
                </div>
                <button
                  onClick={(e) => handleCopy(item.upiId!, `upi_${item.id}`, e)}
                  className="p-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition"
                  title="Copy UPI ID"
                >
                  {copiedKey === `upi_${item.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer info & Passbook attachments */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px] truncate max-w-[200px]" title={item.notes || ''}>
            {item.notes || 'Secure Bank Record'}
          </span>
          {item.attachments && item.attachments.length > 0 && (
            <button
              onClick={() => onViewAttachment(item.attachments[0], item.title)}
              className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>{item.attachments.length} Passbook/Cheque</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- */
  /* 3. IDENTITY DOCUMENT CARDS (License, Aadhaar, PAN, Passport, etc) */
  /* ------------------------------------------------------------- */
  if (item.category === 'DOCUMENTS') {
    const isRevealed = !!revealedKeys[`doc_${item.id}`];
    const subType = item.subType || 'CUSTOM';

    // Type-specific badge & color highlights
    const getDocConfig = () => {
      switch (subType) {
        case 'AADHAAR':
          return {
            badge: '🇮🇳 AADHAAR CARD',
            badgeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
            iconColor: 'from-orange-500 to-amber-500',
            label: '12-Digit Aadhaar Number',
            formattedNum: formatAadhaar(item.docNumber, isRevealed),
          };
        case 'PAN':
          return {
            badge: '💳 PAN CARD (INCOME TAX)',
            badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            iconColor: 'from-blue-600 to-indigo-600',
            label: 'Permanent Account Number (PAN)',
            formattedNum: item.docNumber ? (isRevealed ? item.docNumber : `${item.docNumber.slice(0, 5)}••••${item.docNumber.slice(-1)}`) : '—',
          };
        case 'DRIVING_LICENSE':
          return {
            badge: '🚗 DRIVING LICENSE',
            badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            iconColor: 'from-emerald-600 to-teal-600',
            label: 'Driving License (DL) Number',
            formattedNum: item.docNumber || '—',
          };
        case 'PASSPORT':
          return {
            badge: '🛂 REPUBLIC OF INDIA PASSPORT',
            badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
            iconColor: 'from-indigo-600 to-purple-600',
            label: 'Passport Number',
            formattedNum: item.docNumber || '—',
          };
        case 'VOTER_ID':
          return {
            badge: '🗳️ ELECTION VOTER ID (EPIC)',
            badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
            iconColor: 'from-purple-600 to-pink-600',
            label: 'Voter ID (EPIC) Number',
            formattedNum: item.docNumber || '—',
          };
        default:
          return {
            badge: `🪪 ${item.subType?.replace(/_/g, ' ') || 'CUSTOM DOCUMENT'}`,
            badgeBg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
            iconColor: 'from-slate-700 to-slate-900',
            label: 'Document / Card Number',
            formattedNum: item.docNumber || '—',
          };
      }
    };

    const docCfg = getDocConfig();

    return (
      <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl bg-gradient-to-tr ${docCfg.iconColor} text-white shadow-md`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${docCfg.badgeBg}`}>
                  {docCfg.badge}
                </span>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Name: <span className="font-semibold text-slate-800 dark:text-slate-200">{item.holderName || 'Adarsh S'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onEdit(item)}
                title="Edit Document"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(item.id, item.title)}
                title="Delete Document"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Document Number Box */}
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                {docCfg.label}
              </span>
              <div className="text-base font-black font-mono text-slate-900 dark:text-white tracking-wider">
                {docCfg.formattedNum}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {subType === 'AADHAAR' || subType === 'PAN' ? (
                <button
                  onClick={(e) => toggleReveal(`doc_${item.id}`, e)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                  title={isRevealed ? 'Hide' : 'Reveal'}
                >
                  {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              ) : null}

              {item.docNumber && (
                <button
                  onClick={(e) => handleCopy(item.docNumber!, `doc_${item.id}`, e)}
                  className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1 shadow-sm transition"
                  title="Copy Document Number"
                >
                  {copiedKey === `doc_${item.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === `doc_${item.id}` ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Key Details Grid */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {item.validUntil && (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
                <span className="text-[9px] uppercase font-bold text-slate-400">Valid Until / Expiry</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200">{item.validUntil}</div>
              </div>
            )}
            {item.issuingAuth && (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
                <span className="text-[9px] uppercase font-bold text-slate-400">Issuing Authority</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.issuingAuth}>
                  {item.issuingAuth}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Scans */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px] truncate max-w-[200px]" title={item.addressLocation || item.notes || ''}>
            {item.addressLocation || item.notes || 'Verified Document'}
          </span>
          {item.attachments && item.attachments.length > 0 ? (
            <button
              onClick={() => onViewAttachment(item.attachments[0], item.title)}
              className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>{item.attachments.length} Scan(s)</span>
            </button>
          ) : (
            <span className="text-[10px] text-slate-400">No scan attached</span>
          )}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- */
  /* 4. HEALTH INSURANCE CARD DESIGN                              */
  /* ------------------------------------------------------------- */
  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-md shadow-rose-600/20">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                {item.policyType || 'HEALTH INSURANCE'}
              </span>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                {item.insurerName || item.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Insured: <span className="font-semibold text-slate-800 dark:text-slate-200">{item.holderName || 'Adarsh & Family'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onEdit(item)}
              title="Edit Policy"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(item.id, item.title)}
              title="Delete Policy"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Policy Number Box */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Policy Number
            </span>
            <div className="text-base font-black font-mono text-slate-900 dark:text-white tracking-wider">
              {item.policyNumber || '—'}
            </div>
          </div>

          {item.policyNumber && (
            <button
              onClick={(e) => handleCopy(item.policyNumber!, `pol_${item.id}`, e)}
              className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1 shadow-sm transition"
              title="Copy Policy Number"
            >
              {copiedKey === `pol_${item.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === `pol_${item.id}` ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>

        {/* Sum Insured & Validity */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40">
            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Sum Insured</span>
            <div className="text-sm font-black text-emerald-800 dark:text-emerald-300">
              {item.sumInsured ? `₹${item.sumInsured.toLocaleString('en-IN')}` : '₹15,00,000'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Renewal / Valid Till</span>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {item.validUntil || 'Active'}
            </div>
          </div>
        </div>

        {/* TPA & Helpline Call */}
        {item.helplinePhone && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Cashless Helpline:</span>
              <a href={`tel:${item.helplinePhone}`} className="font-bold text-rose-700 dark:text-rose-300 hover:underline">
                {item.helplinePhone}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <span className="text-[11px] truncate max-w-[200px]" title={item.tpaName || ''}>
          TPA: {item.tpaName || 'In-House TPA'}
        </span>
        {item.attachments && item.attachments.length > 0 ? (
          <button
            onClick={() => onViewAttachment(item.attachments[0], item.title)}
            className="flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 hover:underline"
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>{item.attachments.length} Policy PDF</span>
          </button>
        ) : (
          <span className="text-[10px] text-slate-400">No policy PDF</span>
        )}
      </div>
    </div>
  );
};
