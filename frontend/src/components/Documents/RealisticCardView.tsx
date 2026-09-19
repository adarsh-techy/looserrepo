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
      <div className="relative group rounded-3xl p-4 sm:p-6 transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] overflow-hidden border border-white/10 shadow-xl bg-gradient-to-br min-h-[240px] flex flex-col justify-between"
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
        <div className="relative z-10 mb-4 font-mono font-bold tracking-wider sm:tracking-widest text-base sm:text-xl text-white drop-shadow-md">
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
        <div className="relative z-10 mt-3 pt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 text-[11px] text-slate-300">
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
  /* 2. BANK ACCOUNT DESIGN (Authentic Bank Passbook & Folio Theme)*/
  /* ------------------------------------------------------------- */
  if (item.category === 'BANK') {
    const isRevealed = !!revealedKeys[`acc_${item.id}`];

    // Detect authentic bank brand theme
    const bName = (item.bankName || item.title || '').toUpperCase();
    const isHdfc = bName.includes('HDFC');
    const isSbi = bName.includes('SBI') || bName.includes('STATE BANK');
    const isIcici = bName.includes('ICICI');
    const isAxis = bName.includes('AXIS');
    const isKotak = bName.includes('KOTAK');

    const bankConfig = isHdfc
      ? {
          name: 'HDFC BANK',
          tagline: 'We understand your world',
          headerBg: 'bg-gradient-to-r from-[#004c8f] via-[#00386b] to-[#002244]',
          headerBorder: 'border-[#002b54]',
          accentText: 'text-[#004c8f] dark:text-sky-300',
          badgeStyle: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-sky-300 border-blue-300 dark:border-blue-800',
          emblemSvg: (
            <div className="w-8 h-8 rounded-lg bg-[#004c8f] border border-white/30 p-1 flex items-center justify-center shadow-xs">
              <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                <div className="bg-red-600 rounded-xs" />
                <div className="bg-white rounded-xs" />
                <div className="bg-white rounded-xs" />
                <div className="bg-red-600 rounded-xs" />
              </div>
            </div>
          ),
        }
      : isSbi
      ? {
          name: 'STATE BANK OF INDIA',
          tagline: 'भारतीय स्टेट बैंक • The banker to every Indian',
          headerBg: 'bg-gradient-to-r from-[#0082c6] via-[#1a3c75] to-[#0f2347]',
          headerBorder: 'border-[#0b1c38]',
          accentText: 'text-[#0082c6] dark:text-cyan-300',
          badgeStyle: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800',
          emblemSvg: (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0082c6] to-blue-900 border border-white/40 flex items-center justify-center shadow-xs">
              <div className="w-4 h-4 rounded-full bg-white flex flex-col items-center justify-end">
                <div className="w-1 h-2 bg-[#0082c6]" />
              </div>
            </div>
          ),
        }
      : isIcici
      ? {
          name: 'ICICI BANK',
          tagline: 'Hum Hai Na, Khayaal Aapka',
          headerBg: 'bg-gradient-to-r from-[#a21d22] via-[#b92b27] to-[#e65100]',
          headerBorder: 'border-[#7a1216]',
          accentText: 'text-[#a21d22] dark:text-orange-300',
          badgeStyle: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-300 border-orange-300 dark:border-orange-800',
          emblemSvg: (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-red-600 p-1 flex items-center justify-center font-black text-white text-base shadow-xs">
              i
            </div>
          ),
        }
      : isAxis
      ? {
          name: 'AXIS BANK',
          tagline: 'Badhti Ka Naam Zindagi',
          headerBg: 'bg-gradient-to-r from-[#800020] via-[#9f1239] to-[#4c0519]',
          headerBorder: 'border-[#380312]',
          accentText: 'text-[#9f1239] dark:text-rose-300',
          badgeStyle: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800',
          emblemSvg: (
            <div className="w-8 h-8 rounded-lg bg-[#800020] border border-white/30 flex items-center justify-center font-black text-white text-sm shadow-xs">
              ▲
            </div>
          ),
        }
      : isKotak
      ? {
          name: 'KOTAK MAHINDRA BANK',
          tagline: "Let's make money simple",
          headerBg: 'bg-gradient-to-r from-[#ed1c24] via-[#cc141b] to-[#1e3a8a]',
          headerBorder: 'border-[#990e13]',
          accentText: 'text-[#ed1c24] dark:text-red-400',
          badgeStyle: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-300 border-red-300 dark:border-red-800',
          emblemSvg: (
            <div className="w-8 h-8 rounded-lg bg-[#ed1c24] border border-white/30 flex items-center justify-center font-black text-white text-sm shadow-xs">
              ∞
            </div>
          ),
        }
      : {
          name: item.bankName || item.title || 'COMMERCIAL BANK',
          tagline: 'Premier Passbook & Secure Account Ledger',
          headerBg: 'bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#0f766e]',
          headerBorder: 'border-[#064e3b]',
          accentText: 'text-emerald-700 dark:text-emerald-400',
          badgeStyle: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
          emblemSvg: (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
              <Landmark className="w-4 h-4" />
            </div>
          ),
        };

    return (
      <div className="relative group rounded-3xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] overflow-hidden border border-slate-300 dark:border-slate-700 shadow-xl bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-between min-h-[310px]">
        {/* Subtle Bank Passbook Guilloche Background Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* 1. Official Bank Institutional Header Bar */}
        <div className={`relative z-10 px-4 sm:px-5 py-3 ${bankConfig.headerBg} text-white flex items-center justify-between border-b ${bankConfig.headerBorder} shadow-md`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {bankConfig.emblemSvg}
            <div className="leading-tight min-w-0">
              <h4 className="text-sm font-black tracking-wider text-white uppercase truncate">
                {bankConfig.name}
              </h4>
              <p className="text-[9px] font-semibold text-white/80 tracking-wide truncate">
                {bankConfig.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-xs">
              {item.subType || 'SAVINGS'}
            </span>
          </div>
        </div>

        {/* 2. Primary Account Number High-Security Display */}
        <div className="relative z-10 px-4 sm:px-5 pt-3.5 sm:pt-4 pb-2">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>Account Number / खाता संख्या</span>
              </div>
              <div className="text-lg sm:text-2xl font-black font-mono tracking-wide sm:tracking-wider text-slate-900 dark:text-white mt-0.5">
                {isRevealed
                  ? item.accountNumber || '—'
                  : item.accountNumber
                  ? `•••• •••• ${item.accountNumber.slice(-4)}`
                  : '—'}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={(e) => toggleReveal(`acc_${item.id}`, e)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1 transition shadow-xs"
                title={isRevealed ? 'Mask Account' : 'Reveal Account'}
              >
                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span className="text-[10px] font-bold">{isRevealed ? 'Mask' : 'Reveal'}</span>
              </button>

              {item.accountNumber && (
                <button
                  onClick={(e) => handleCopy(item.accountNumber!, `acc_${item.id}`, e)}
                  className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
                  title="Copy Account Number"
                >
                  {copiedKey === `acc_${item.id}` ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[10px]">{copiedKey === `acc_${item.id}` ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Passbook Routing Details (IFSC, Branch, CIF Holder, UPI) */}
        <div className="relative z-10 px-4 sm:px-5 py-2 space-y-2 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* IFSC Code Box */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400">
                  IFSC (RTGS / NEFT)
                </span>
                <div className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-400 tracking-wider">
                  {item.ifscCode || '—'}
                </div>
              </div>
              {item.ifscCode && (
                <button
                  onClick={(e) => handleCopy(item.ifscCode!, `ifsc_${item.id}`, e)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 transition"
                  title="Copy IFSC"
                >
                  {copiedKey === `ifsc_${item.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Account Holder (CIF Name) */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[9px] uppercase font-bold text-slate-400">
                Account Holder Name
              </span>
              <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide truncate">
                {item.holderName || 'ADARSH S'}
              </div>
            </div>
          </div>

          {/* Branch Location & UPI ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Branch */}
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
              <span className="text-[9px] uppercase font-bold text-slate-400">Branch & City</span>
              <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.branchLocation || ''}>
                {item.branchLocation || 'Branch not specified'}
              </div>
            </div>

            {/* UPI ID */}
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-bold text-slate-400">UPI Virtual ID</span>
                <div className="text-[11px] font-bold font-mono text-teal-700 dark:text-teal-300 truncate">
                  {item.upiId || '—'}
                </div>
              </div>
              {item.upiId && (
                <button
                  onClick={(e) => handleCopy(item.upiId!, `upi_${item.id}`, e)}
                  className="p-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition shrink-0"
                  title="Copy UPI"
                >
                  {copiedKey === `upi_${item.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. Bottom Passbook Ledger Seal & Actions Bar */}
        <div className="relative z-10 px-4 sm:px-5 py-2.5 bg-slate-100 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Simulated Bank Authorized Seal Stamp */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>VERIFIED LEDGER</span>
          </div>

          <div className="flex items-center gap-2">
            {item.attachments && item.attachments.length > 0 && (
              <button
                onClick={() => onViewAttachment(item.attachments[0], item.title)}
                className="flex items-center gap-1 font-bold text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>{item.attachments.length} Passbook/Cheque</span>
              </button>
            )}
            <button
              onClick={() => onEdit(item)}
              title="Edit Bank Account"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(item.id, item.title)}
              title="Delete Bank Account"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- */
  /* 3. IDENTITY DOCUMENT CARDS (Exact Replica Card Styles)        */
  /* ------------------------------------------------------------- */
  if (item.category === 'DOCUMENTS') {
    const isRevealed = !!revealedKeys[`doc_${item.id}`];
    const subType = item.subType || 'CUSTOM';

    /* ============================================================= */
    /* 3A. EXACT AADHAAR PVC CARD REPLICA                          */
    /* ============================================================= */
    if (subType === 'AADHAAR') {
      return (
        <div className="relative group rounded-3xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] overflow-hidden border border-slate-300 dark:border-slate-700 shadow-xl bg-gradient-to-b from-amber-500/10 via-white dark:via-slate-900 to-emerald-500/10 flex flex-col justify-between min-h-[300px]">
          {/* Subtle Guilloche Security Wave Background */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Top Header Bar: Ashoka Emblem & UIDAI Logo */}
          <div className="relative z-10 px-4 sm:px-5 pt-3.5 pb-2 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white/70 dark:bg-slate-950/70 backdrop-blur-xs">
            {/* Left: Emblem of India & Govt of India */}
            <div className="flex items-center gap-2.5">
              {/* Ashoka Lion Silhouette */}
              <div className="w-8 h-9 text-slate-800 dark:text-amber-400 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 24 28" fill="currentColor" className="w-full h-full">
                  <path d="M12 1c-1.1 0-2 .9-2 2v1H8c-1.1 0-2 .9-2 2v2h12V6c0-1.1-.9-2-2-2h-2V3c0-1.1-.9-2-2-2zm-5 9c-.6 0-1 .4-1 1v4c0 3.3 2.7 6 6 6s6-2.7 6-6v-4c0-.6-.4-1-1-1H7zm5 9c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm-6 3h12v2H6v-2z" />
                </svg>
              </div>
              <div className="leading-tight">
                <div className="text-[11px] font-black text-slate-900 dark:text-white tracking-tight">भारत सरकार</div>
                <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Government of India</div>
              </div>
            </div>

            {/* Right: UIDAI Sunburst Logo */}
            <div className="flex items-center gap-2 text-right">
              <div className="leading-tight hidden sm:block">
                <div className="text-[10px] font-black text-red-700 dark:text-red-400">भारतीय विशिष्ट पहचान प्राधिकरण</div>
                <div className="text-[8px] font-bold text-slate-600 dark:text-slate-400">Unique Identification Authority of India</div>
              </div>
              {/* UIDAI Sun Emblem */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 p-1 flex items-center justify-center shadow-xs shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6">
                  <circle cx="12" cy="12" r="4" fill="white" />
                  <path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.1-6.9l-1.4 1.4m-11 11l-1.4 1.4m0-13.8l1.4 1.4m11 11l1.4 1.4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Middle Body: Photo Frame, Personal Details & QR Box */}
          <div className="relative z-10 px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row items-start justify-between gap-4">
            {/* Left: Photo Frame with Hologram Watermark */}
            <div className="relative shrink-0 flex flex-col items-center">
              <div className="w-20 h-24 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 shadow-inner flex flex-col items-center justify-center overflow-hidden p-1">
                <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-black text-sm">
                  {item.holderName ? item.holderName.slice(0, 2).toUpperCase() : 'AD'}
                </div>
                <span className="text-[8px] font-bold text-slate-500 mt-1 uppercase tracking-wider text-center">
                  Official Photo
                </span>
                {/* Miniature Hologram Badge */}
                <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-400 via-cyan-400 to-amber-300 opacity-80 shadow-xs border border-white/40 flex items-center justify-center text-[6px] font-black text-slate-900">
                  GOI
                </div>
              </div>
            </div>

            {/* Center: Bilingual Personal Details */}
            <div className="flex-1 min-w-0 space-y-1.5 text-xs">
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">नाम / Name:</div>
                <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide truncate">
                  {item.holderName || 'Adarsh S'}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">जन्म तिथि / DOB:</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {item.issueDate || '12/05/1998'}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">लिंग / Gender:</div>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  पुरुष / Male
                </div>
              </div>

              {item.addressLocation && (
                <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate" title={item.addressLocation}>
                  पता / Address: {item.addressLocation}
                </div>
              )}
            </div>

            {/* Right: 2D Aadhaar QR Box */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="w-20 h-20 rounded-xl bg-white dark:bg-slate-950 p-1.5 border border-slate-300 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
                <QrCode className="w-12 h-12 text-slate-900 dark:text-slate-100" />
                <span className="text-[7px] font-mono font-bold text-slate-500 mt-0.5">SECURE QR</span>
              </div>
            </div>
          </div>

          {/* Aadhaar 12-Digit Number Section */}
          <div className="relative z-10 px-4 sm:px-5 py-2.5 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
                12-Digit Aadhaar Number
              </div>
              <div className="text-base sm:text-2xl font-black font-mono tracking-wider sm:tracking-widest text-red-700 dark:text-red-400">
                {formatAadhaar(item.docNumber, isRevealed)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => toggleReveal(`doc_${item.id}`, e)}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-600 text-xs flex items-center gap-1 transition shadow-xs"
                title={isRevealed ? 'Mask Aadhaar' : 'Reveal Aadhaar'}
              >
                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span className="text-[10px] font-bold">{isRevealed ? 'Mask' : 'Reveal'}</span>
              </button>

              {item.docNumber && (
                <button
                  onClick={(e) => handleCopy(item.docNumber!.replace(/\s+/g, ''), `doc_${item.id}`, e)}
                  className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
                  title="Copy Aadhaar Number"
                >
                  {copiedKey === `doc_${item.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[10px]">{copiedKey === `doc_${item.id}` ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Official Ribbon: "मेरा आधार, मेरी पहचान" */}
          <div className="relative z-10 px-4 sm:px-5 py-2 bg-gradient-to-r from-red-600 via-red-700 to-amber-700 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-extrabold tracking-wider text-[11px] drop-shadow-xs">
              मेरा आधार, मेरी पहचान
            </span>

            <div className="flex items-center gap-2 text-white">
              {item.attachments && item.attachments.length > 0 && (
                <button
                  onClick={() => onViewAttachment(item.attachments[0], item.title)}
                  className="flex items-center gap-1 font-bold text-[10px] bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-lg transition"
                >
                  <Paperclip className="w-3 h-3" />
                  <span>{item.attachments.length} Scan</span>
                </button>
              )}
              <button
                onClick={() => onEdit(item)}
                title="Edit Aadhaar"
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(item.id, item.title)}
                title="Delete Aadhaar"
                className="p-1 rounded-lg bg-black/20 hover:bg-black/40 text-white transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    /* ============================================================= */
    /* 3B. EXACT PAN CARD (INCOME TAX DEPT) REPLICA                  */
    /* ============================================================= */
    if (subType === 'PAN') {
      return (
        <div className="relative group rounded-3xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] overflow-hidden border border-sky-300 dark:border-blue-900/60 shadow-xl bg-gradient-to-br from-sky-50 via-blue-50/50 to-indigo-50 dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 flex flex-col justify-between min-h-[300px]">
          {/* Authentic Income Tax Deep Blue Header */}
          <div className="relative z-10 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white flex items-center justify-between border-b border-blue-950 shadow-md">
            <div className="leading-tight">
              <div className="text-[11px] font-black tracking-tight text-white">आयकर विभाग</div>
              <div className="text-[9px] font-extrabold text-sky-200 tracking-wider">INCOME TAX DEPARTMENT</div>
            </div>

            {/* Ashoka Lion Center Seal */}
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 text-amber-300">
                <svg viewBox="0 0 24 28" fill="currentColor" className="w-full h-full">
                  <path d="M12 1c-1.1 0-2 .9-2 2v1H8c-1.1 0-2 .9-2 2v2h12V6c0-1.1-.9-2-2-2h-2V3c0-1.1-.9-2-2-2zm-5 9c-.6 0-1 .4-1 1v4c0 3.3 2.7 6 6 6s6-2.7 6-6v-4c0-.6-.4-1-1-1H7zm5 9c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm-6 3h12v2H6v-2z" />
                </svg>
              </div>
            </div>

            <div className="text-right leading-tight">
              <div className="text-[11px] font-black tracking-tight text-white">भारत सरकार</div>
              <div className="text-[9px] font-extrabold text-sky-200 tracking-wider">GOVT. OF INDIA</div>
            </div>
          </div>

          {/* Subheader: Permanent Account Number Card */}
          <div className="relative z-10 px-3 sm:px-5 py-1 text-center bg-blue-100/70 dark:bg-blue-950/60 border-b border-blue-200 dark:border-blue-900/40">
            <span className="text-[9px] font-extrabold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
              स्थायी लेखा संख्या कार्ड / Permanent Account Number Card
            </span>
          </div>

          {/* Middle Body: Photo, Hologram Seal, PAN Details */}
          <div className="relative z-10 px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row items-start justify-between gap-4">
            {/* Left: Photo Frame + Holographic Seal */}
            <div className="relative shrink-0 flex flex-col items-center gap-2">
              <div className="w-20 h-24 rounded-xl border-2 border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-950 shadow-sm flex flex-col items-center justify-center p-1">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-800 dark:text-blue-200 font-black text-sm">
                  {item.holderName ? item.holderName.slice(0, 2).toUpperCase() : 'AD'}
                </div>
                <span className="text-[8px] font-bold text-slate-500 mt-1 uppercase">Photo</span>
              </div>

              {/* Iridescent Hologram Sticker */}
              <div className="w-16 h-6 rounded-md bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-300 border border-amber-400/80 shadow-xs flex items-center justify-center text-[7px] font-black text-slate-900 tracking-widest uppercase">
                ★ GOVT ★
              </div>
            </div>

            {/* Center: Details */}
            <div className="flex-1 min-w-0 space-y-2 text-xs">
              {/* PAN Number Highlight Box */}
              <div>
                <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Permanent Account Number (PAN)
                </div>
                <div className="text-lg sm:text-2xl font-black font-mono text-blue-950 dark:text-sky-300 tracking-wider sm:tracking-widest">
                  {item.docNumber
                    ? isRevealed
                      ? item.docNumber
                      : `${item.docNumber.slice(0, 5)}••••${item.docNumber.slice(-1)}`
                    : 'ABCPS8192K'}
                </div>
              </div>

              <div>
                <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">नाम / Name:</div>
                <div className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide truncate">
                  {item.holderName || 'ADARSH S'}
                </div>
              </div>

              <div>
                <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">पिता का नाम / Father's Name:</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                  S. NAIR
                </div>
              </div>

              <div>
                <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">जन्म की तारीख / Date of Birth:</div>
                <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {item.issueDate || '12/05/1998'}
                </div>
              </div>
            </div>

            {/* Right: Signature Strip & QR */}
            <div className="shrink-0 flex flex-col items-center gap-2">
              <div className="w-20 h-16 rounded-xl bg-white dark:bg-slate-950 p-1 border border-slate-300 dark:border-slate-800 flex items-center justify-center">
                <QrCode className="w-11 h-11 text-slate-800 dark:text-slate-200" />
              </div>
              {/* Simulated Signature Box */}
              <div className="w-24 h-7 rounded-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 flex items-center justify-center px-1 font-serif italic text-xs text-blue-800 dark:text-sky-300 tracking-tighter">
                Adarsh S.
              </div>
            </div>
          </div>

          {/* Bottom Actions Bar */}
          <div className="relative z-10 px-4 sm:px-5 py-2.5 bg-blue-900/10 dark:bg-slate-950/80 border-t border-sky-200 dark:border-blue-950 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => toggleReveal(`doc_${item.id}`, e)}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 text-xs flex items-center gap-1 transition shadow-xs"
                title={isRevealed ? 'Mask PAN' : 'Reveal PAN'}
              >
                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span className="text-[10px] font-bold">{isRevealed ? 'Mask' : 'Reveal'}</span>
              </button>

              {item.docNumber && (
                <button
                  onClick={(e) => handleCopy(item.docNumber!, `doc_${item.id}`, e)}
                  className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
                  title="Copy PAN"
                >
                  {copiedKey === `doc_${item.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[10px]">{copiedKey === `doc_${item.id}` ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {item.attachments && item.attachments.length > 0 && (
                <button
                  onClick={() => onViewAttachment(item.attachments[0], item.title)}
                  className="flex items-center gap-1 font-bold text-[11px] text-blue-600 dark:text-sky-400 hover:underline"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{item.attachments.length} Scan</span>
                </button>
              )}
              <button
                onClick={() => onEdit(item)}
                title="Edit PAN"
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(item.id, item.title)}
                title="Delete PAN"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    /* ============================================================= */
    /* 3C. EXACT DRIVING LICENCE (INDIAN SMART CARD) REPLICA        */
    /* ============================================================= */
    if (subType === 'DRIVING_LICENSE') {
      return (
        <div className="relative group rounded-3xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] overflow-hidden border border-emerald-300 dark:border-emerald-900/60 shadow-xl bg-gradient-to-br from-emerald-50 via-amber-50/40 to-teal-50 dark:from-slate-900 dark:via-emerald-950/30 dark:to-slate-900 flex flex-col justify-between min-h-[300px]">
          {/* Top Banner: Indian Union Driving Licence */}
          <div className="relative z-10 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex items-center justify-between border-b border-emerald-950 shadow-md">
            <div className="leading-tight">
              <div className="text-[11px] font-black tracking-wider text-white uppercase">INDIAN UNION DRIVING LICENCE</div>
              <div className="text-[9px] font-bold text-emerald-200">KERALA STATE / MOTOR VEHICLES DEPARTMENT</div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-black text-amber-300">
              <span>RTO-KL</span>
            </div>
          </div>

          {/* Middle Body: Smart Chip, Photo, DL Details */}
          <div className="relative z-10 px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row items-start justify-between gap-4">
            {/* Left: Photo Frame & Gold Smart Card Chip */}
            <div className="relative shrink-0 flex flex-col items-center gap-2">
              {/* Metallic Gold EMV Chip */}
              <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 border border-amber-500/60 shadow-inner flex flex-col justify-around p-1">
                <div className="w-full h-0.5 bg-amber-600/30 rounded" />
                <div className="w-full h-0.5 bg-amber-600/30 rounded" />
                <div className="w-full h-0.5 bg-amber-600/30 rounded" />
              </div>

              <div className="w-20 h-22 rounded-xl border-2 border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-950 shadow-sm flex flex-col items-center justify-center p-1">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-800 dark:text-emerald-200 font-black text-sm">
                  {item.holderName ? item.holderName.slice(0, 2).toUpperCase() : 'AD'}
                </div>
                <span className="text-[8px] font-bold text-slate-500 mt-1 uppercase">Holder</span>
              </div>
            </div>

            {/* Center Details */}
            <div className="flex-1 min-w-0 space-y-2 text-xs">
              <div>
                <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">Licence Number</div>
                <div className="text-lg sm:text-xl font-black font-mono text-emerald-950 dark:text-emerald-300 tracking-wider">
                  {item.docNumber || 'KL-07-2018-0049281'}
                </div>
              </div>

              <div>
                <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Name:</div>
                <div className="font-black text-slate-900 dark:text-white uppercase tracking-wide truncate">
                  {item.holderName || 'ADARSH S'}
                </div>
              </div>

              {/* Authorised Vehicle Classes & Blood Group */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  MCWG
                </span>
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  LMV
                </span>
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                  BG: O+
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                <div>
                  <span className="text-slate-500">Issued: </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.issueDate || '12/04/2018'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Valid Till: </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.validUntil || '11/04/2038'}</span>
                </div>
              </div>
            </div>

            {/* Right: RTO Seal & QR */}
            <div className="shrink-0 flex flex-col items-center gap-1">
              <div className="w-18 h-18 rounded-xl bg-white dark:bg-slate-950 p-1 border border-slate-300 dark:border-slate-800 flex items-center justify-center">
                <QrCode className="w-12 h-12 text-emerald-900 dark:text-emerald-200" />
              </div>
              <span className="text-[8px] font-bold text-slate-500">RTO ERNAKULAM</span>
            </div>
          </div>

          {/* Bottom Actions Bar */}
          <div className="relative z-10 px-4 sm:px-5 py-2.5 bg-emerald-900/10 dark:bg-slate-950/80 border-t border-emerald-200 dark:border-emerald-950 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              {item.docNumber && (
                <button
                  onClick={(e) => handleCopy(item.docNumber!, `doc_${item.id}`, e)}
                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
                  title="Copy DL Number"
                >
                  {copiedKey === `doc_${item.id}` ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[10px]">{copiedKey === `doc_${item.id}` ? 'Copied' : 'Copy DL'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {item.attachments && item.attachments.length > 0 && (
                <button
                  onClick={() => onViewAttachment(item.attachments[0], item.title)}
                  className="flex items-center gap-1 font-bold text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{item.attachments.length} Scan</span>
                </button>
              )}
              <button
                onClick={() => onEdit(item)}
                title="Edit DL"
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-800 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(item.id, item.title)}
                title="Delete DL"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    /* ============================================================= */
    /* 3D. EXACT REPUBLIC OF INDIA PASSPORT REPLICA                 */
    /* ============================================================= */
    if (subType === 'PASSPORT') {
      return (
        <div className="relative group rounded-3xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] overflow-hidden border border-amber-500/30 shadow-xl bg-gradient-to-b from-[#0b1b36] via-[#09152b] to-[#040a14] text-white flex flex-col justify-between min-h-[320px]">
          {/* Passport Header in Gold Foil */}
          <div className="relative z-10 px-4 sm:px-5 py-2.5 sm:py-3 border-b border-amber-500/20 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-3">
              <div className="w-7 h-8 text-amber-400">
                <svg viewBox="0 0 24 28" fill="currentColor" className="w-full h-full">
                  <path d="M12 1c-1.1 0-2 .9-2 2v1H8c-1.1 0-2 .9-2 2v2h12V6c0-1.1-.9-2-2-2h-2V3c0-1.1-.9-2-2-2zm-5 9c-.6 0-1 .4-1 1v4c0 3.3 2.7 6 6 6s6-2.7 6-6v-4c0-.6-.4-1-1-1H7zm5 9c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm-6 3h12v2H6v-2z" />
                </svg>
              </div>
              <div className="leading-tight">
                <div className="text-xs font-black tracking-widest text-amber-300 uppercase">भारत गणराज्य / REPUBLIC OF INDIA</div>
                <div className="text-[10px] font-bold text-amber-400/80 uppercase">पासपोर्ट / PASSPORT</div>
              </div>
            </div>

            <div className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[10px] font-mono font-bold text-amber-300">
              IND
            </div>
          </div>

          {/* Data Fields & Photo Frame */}
          <div className="relative z-10 px-4 sm:px-5 py-3 flex flex-col sm:flex-row items-start justify-between gap-4 text-xs">
            {/* Left: Photo Frame */}
            <div className="w-20 h-24 rounded-xl border border-amber-400/40 bg-black/60 shadow-inner flex flex-col items-center justify-center p-1 shrink-0">
              <div className="w-10 h-10 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center font-black text-sm">
                {item.holderName ? item.holderName.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <span className="text-[8px] font-bold text-amber-400/70 mt-1 uppercase">Photo</span>
            </div>

            {/* Passport Data Grid */}
            <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <div className="text-[9px] uppercase text-amber-300/70">Type / Code</div>
                <div className="font-mono font-bold text-white">P / IND</div>
              </div>

              <div>
                <div className="text-[9px] uppercase text-amber-300/70">Passport No.</div>
                <div className="font-mono font-black text-amber-300 text-sm">
                  {item.docNumber || 'Z5819204'}
                </div>
              </div>

              <div>
                <div className="text-[9px] uppercase text-amber-300/70">Nationality</div>
                <div className="font-bold text-white">INDIAN</div>
              </div>

              <div className="col-span-2">
                <div className="text-[9px] uppercase text-amber-300/70">Given Name(s)</div>
                <div className="font-black text-white uppercase truncate">{item.holderName || 'ADARSH S'}</div>
              </div>

              <div>
                <div className="text-[9px] uppercase text-amber-300/70">Sex</div>
                <div className="font-bold text-white">M</div>
              </div>

              <div>
                <div className="text-[9px] uppercase text-amber-300/70">Date of Issue</div>
                <div className="font-mono text-white">{item.issueDate || '10/03/2021'}</div>
              </div>

              <div>
                <div className="text-[9px] uppercase text-amber-300/70">Date of Expiry</div>
                <div className="font-mono text-amber-300 font-bold">{item.validUntil || '09/03/2031'}</div>
              </div>

              <div>
                <div className="text-[9px] uppercase text-amber-300/70">Place of Issue</div>
                <div className="font-bold text-white uppercase">COCHIN</div>
              </div>
            </div>
          </div>

          {/* Machine Readable Zone (MRZ Lines) */}
          <div className="relative z-10 px-4 sm:px-5 py-2 bg-black/60 border-t border-amber-500/20 font-mono text-[8px] sm:text-[10px] tracking-widest text-amber-300/80 leading-tight select-all overflow-x-auto whitespace-nowrap">
            <div>P&lt;IND{item.holderName ? item.holderName.replace(/\s+/g, '<').toUpperCase() : 'ADARSH<S'}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
            <div>{item.docNumber || 'Z5819204'}&lt;8IND9805124M3103098&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;02</div>
          </div>

          {/* Bottom Actions Bar */}
          <div className="relative z-10 px-4 sm:px-5 py-2 bg-black/40 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              {item.docNumber && (
                <button
                  onClick={(e) => handleCopy(item.docNumber!, `doc_${item.id}`, e)}
                  className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-sm transition"
                  title="Copy Passport Number"
                >
                  {copiedKey === `doc_${item.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[10px]">{copiedKey === `doc_${item.id}` ? 'Copied' : 'Copy No.'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {item.attachments && item.attachments.length > 0 && (
                <button
                  onClick={() => onViewAttachment(item.attachments[0], item.title)}
                  className="flex items-center gap-1 font-bold text-[11px] text-amber-300 hover:underline"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{item.attachments.length} Scan</span>
                </button>
              )}
              <button
                onClick={() => onEdit(item)}
                title="Edit Passport"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(item.id, item.title)}
                title="Delete Passport"
                className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    /* ============================================================= */
    /* 3E. EXACT ELECTION VOTER ID (EPIC) REPLICA                   */
    /* ============================================================= */
    if (subType === 'VOTER_ID') {
      return (
        <div className="relative group rounded-3xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] overflow-hidden border border-slate-300 dark:border-slate-700 shadow-xl bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-between min-h-[300px]">
          {/* Top Tricolor Strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-white to-emerald-500" />

          {/* Header Bar */}
          <div className="relative z-10 px-4 sm:px-5 py-2.5 sm:py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-8 text-slate-800 dark:text-amber-400">
                <svg viewBox="0 0 24 28" fill="currentColor" className="w-full h-full">
                  <path d="M12 1c-1.1 0-2 .9-2 2v1H8c-1.1 0-2 .9-2 2v2h12V6c0-1.1-.9-2-2-2h-2V3c0-1.1-.9-2-2-2zm-5 9c-.6 0-1 .4-1 1v4c0 3.3 2.7 6 6 6s6-2.7 6-6v-4c0-.6-.4-1-1-1H7zm5 9c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm-6 3h12v2H6v-2z" />
                </svg>
              </div>
              <div className="leading-tight">
                <div className="text-[11px] font-black text-slate-900 dark:text-white">भारत निर्वाचन आयोग</div>
                <div className="text-[9px] font-extrabold text-slate-600 dark:text-slate-400">ELECTION COMMISSION OF INDIA</div>
              </div>
            </div>

            {/* EPIC Number Badge */}
            <div className="px-3 py-1 rounded-xl bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800">
              <span className="text-[9px] font-bold text-purple-700 dark:text-purple-300 uppercase">EPIC NO.</span>
              <div className="text-xs font-black font-mono text-purple-900 dark:text-purple-200">
                {item.docNumber || 'KL/07/082/194829'}
              </div>
            </div>
          </div>

          {/* Details & Photo */}
          <div className="relative z-10 px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row items-start justify-between gap-4 text-xs">
            {/* Left Photo Frame with Hologram */}
            <div className="relative shrink-0 flex flex-col items-center">
              <div className="w-20 h-24 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-sm flex flex-col items-center justify-center p-1">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-800 dark:text-purple-200 font-black text-sm">
                  {item.holderName ? item.holderName.slice(0, 2).toUpperCase() : 'AD'}
                </div>
                <span className="text-[8px] font-bold text-slate-500 mt-1 uppercase">Elector</span>
              </div>
              <div className="mt-1 w-6 h-6 rounded-full bg-gradient-to-tr from-purple-400 to-pink-300 border border-white/60 shadow-xs flex items-center justify-center text-[6px] font-bold text-slate-900">
                ECI
              </div>
            </div>

            {/* Center: Elector Info */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div>
                <div className="text-[9px] font-bold text-slate-400">निर्वाचक का नाम / Elector's Name:</div>
                <div className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">
                  {item.holderName || 'Adarsh S'}
                </div>
              </div>

              <div>
                <div className="text-[9px] font-bold text-slate-400">पिता का नाम / Father's Name:</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 uppercase">S. NAIR</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-slate-400">लिंग / Sex: </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">पुरुष / Male</span>
                </div>
                <div>
                  <span className="text-slate-400">आयु / Age: </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">28 Years</span>
                </div>
              </div>

              <div>
                <div className="text-[9px] font-bold text-slate-400">विधान सभा निर्वाचन क्षेत्र / Assembly Constituency:</div>
                <div className="font-bold text-purple-800 dark:text-purple-300 truncate">
                  {item.addressLocation || '082 - Ernakulam Assembly Constituency'}
                </div>
              </div>
            </div>

            {/* Right: Signature Seal */}
            <div className="shrink-0 flex flex-col items-center gap-1">
              <div className="w-18 h-18 rounded-xl bg-white dark:bg-slate-950 p-1 border border-slate-300 dark:border-slate-800 flex items-center justify-center">
                <QrCode className="w-12 h-12 text-slate-800 dark:text-slate-200" />
              </div>
              <span className="text-[7px] font-mono text-slate-500">ERO SEAL</span>
            </div>
          </div>

          {/* Bottom Actions Bar */}
          <div className="relative z-10 px-4 sm:px-5 py-2.5 bg-slate-100 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              {item.docNumber && (
                <button
                  onClick={(e) => handleCopy(item.docNumber!, `doc_${item.id}`, e)}
                  className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
                  title="Copy EPIC Number"
                >
                  {copiedKey === `doc_${item.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[10px]">{copiedKey === `doc_${item.id}` ? 'Copied' : 'Copy EPIC'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {item.attachments && item.attachments.length > 0 && (
                <button
                  onClick={() => onViewAttachment(item.attachments[0], item.title)}
                  className="flex items-center gap-1 font-bold text-[11px] text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{item.attachments.length} Scan</span>
                </button>
              )}
              <button
                onClick={() => onEdit(item)}
                title="Edit Voter ID"
                className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-white dark:hover:bg-slate-800 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(item.id, item.title)}
                title="Delete Voter ID"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    /* ============================================================= */
    /* 3F. EXACT PVC SMART CARD REPLICA (CUSTOM E-CARD)              */
    /* ============================================================= */
    return (
      <div className="relative group rounded-3xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] overflow-hidden border border-slate-300 dark:border-slate-700 shadow-xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col justify-between min-h-[300px]">
        {/* Header Bar */}
        <div className="relative z-10 px-4 sm:px-5 py-2.5 sm:py-3 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-cyan-300 border border-cyan-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-widest">
                OFFICIAL SMART CARD
              </span>
              <h4 className="text-sm font-black text-white">{item.title}</h4>
            </div>
          </div>

          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20 uppercase">
            {item.subType?.replace(/_/g, ' ') || 'CUSTOM'}
          </span>
        </div>

        {/* Card Body */}
        <div className="relative z-10 px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row items-start justify-between gap-4 text-xs">
          {/* Left: Smart Chip */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 border border-amber-500/60 shadow-inner flex flex-col justify-around p-1">
              <div className="w-full h-0.5 bg-amber-600/30 rounded" />
              <div className="w-full h-0.5 bg-amber-600/30 rounded" />
              <div className="w-full h-0.5 bg-amber-600/30 rounded" />
            </div>

            <div className="w-16 h-18 rounded-xl bg-white/10 border border-white/20 flex flex-col items-center justify-center p-1">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs">
                {item.holderName ? item.holderName.slice(0, 2).toUpperCase() : 'ID'}
              </div>
            </div>
          </div>

          {/* Center Details */}
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <div className="text-[9px] uppercase font-bold text-slate-400">Document Identifier</div>
              <div className="text-base sm:text-lg font-black font-mono text-cyan-300 tracking-wider">
                {item.docNumber || '—'}
              </div>
            </div>

            <div>
              <div className="text-[9px] uppercase font-bold text-slate-400">Cardholder Name</div>
              <div className="font-black text-white uppercase truncate">{item.holderName || 'Adarsh S'}</div>
            </div>

            {item.issuingAuth && (
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-400">Authority / Dept</div>
                <div className="font-semibold text-slate-200 truncate">{item.issuingAuth}</div>
              </div>
            )}

            {item.validUntil && (
              <div className="text-[10px] text-slate-300">
                <span className="text-slate-400">Valid Till: </span>
                <span className="font-bold text-white font-mono">{item.validUntil}</span>
              </div>
            )}
          </div>

          {/* Right: Barcode Box */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div className="w-18 h-18 rounded-xl bg-white p-1 border border-white/20 flex items-center justify-center">
              <QrCode className="w-12 h-12 text-slate-900" />
            </div>
            <span className="text-[7px] font-mono text-slate-400">VERIFIED</span>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="relative z-10 px-4 sm:px-5 py-2.5 bg-black/40 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {item.docNumber && (
              <button
                onClick={(e) => handleCopy(item.docNumber!, `doc_${item.id}`, e)}
                className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
                title="Copy Number"
              >
                {copiedKey === `doc_${item.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[10px]">{copiedKey === `doc_${item.id}` ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {item.attachments && item.attachments.length > 0 && (
              <button
                onClick={() => onViewAttachment(item.attachments[0], item.title)}
                className="flex items-center gap-1 font-bold text-[11px] text-cyan-300 hover:underline"
              >
                <Paperclip className="w-3.5 h-3.5" />
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
  /* 4. HEALTH INSURANCE CARD DESIGN                              */
  /* ------------------------------------------------------------- */
  return (
    <div className="rounded-3xl p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
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
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
              className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1 shadow-sm transition self-start sm:self-auto"
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
          <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/40 flex flex-wrap items-center justify-between gap-2 text-xs">
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
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
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
