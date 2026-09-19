import React, { useState, useEffect } from 'react';
import {
  X,
  Landmark,
  CreditCard,
  ShieldCheck,
  HeartHandshake,
  Upload,
  Trash2,
  Paperclip,
  FileText,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { DocumentCategory, DocumentSubType, DocumentItem, DocumentAttachment } from '../../types/document';

interface DocumentCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<DocumentItem>) => Promise<void>;
  editingItem?: DocumentItem | null;
  defaultCategory?: DocumentCategory;
  defaultSubType?: DocumentSubType;
}

export const DocumentCardModal: React.FC<DocumentCardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  defaultCategory = 'BANK',
  defaultSubType,
}) => {
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory);
  const [subType, setSubType] = useState<string>(defaultSubType || 'SAVINGS');
  const [title, setTitle] = useState('');
  const [holderName, setHolderName] = useState('Adarsh S');

  // Bank
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [upiId, setUpiId] = useState('');

  // ATM
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardNetwork, setCardNetwork] = useState('VISA');
  const [cardType, setCardType] = useState('DEBIT');
  const [pinHint, setPinHint] = useState('');

  // Identity Docs
  const [docNumber, setDocNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [issuingAuth, setIssuingAuth] = useState('');
  const [addressLocation, setAddressLocation] = useState('');
  const [customDocTypeName, setCustomDocTypeName] = useState('');

  // Health Insurance
  const [policyNumber, setPolicyNumber] = useState('');
  const [insurerName, setInsurerName] = useState('');
  const [policyType, setPolicyType] = useState('Family Floater Health Insurance');
  const [sumInsured, setSumInsured] = useState<string>('1500000');
  const [tpaName, setTpaName] = useState('');
  const [helplinePhone, setHelplinePhone] = useState('');
  const [cashlessHospitalNotes, setCashlessHospitalNotes] = useState('');

  // Common
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form state
  useEffect(() => {
    if (editingItem) {
      setCategory(editingItem.category);
      setSubType(editingItem.subType || '');
      setTitle(editingItem.title || '');
      setHolderName(editingItem.holderName || '');
      setAccountNumber(editingItem.accountNumber || '');
      setIfscCode(editingItem.ifscCode || '');
      setBankName(editingItem.bankName || '');
      setBranchLocation(editingItem.branchLocation || '');
      setUpiId(editingItem.upiId || '');
      setCardNumber(editingItem.cardNumber || '');
      setExpiryDate(editingItem.expiryDate || '');
      setCvv(editingItem.cvv || '');
      setCardNetwork(editingItem.cardNetwork || 'VISA');
      setCardType(editingItem.cardType || 'DEBIT');
      setPinHint(editingItem.pinHint || '');
      setDocNumber(editingItem.docNumber || '');
      setIssueDate(editingItem.issueDate || '');
      setValidUntil(editingItem.validUntil || '');
      setIssuingAuth(editingItem.issuingAuth || '');
      setAddressLocation(editingItem.addressLocation || '');
      setPolicyNumber(editingItem.policyNumber || '');
      setInsurerName(editingItem.insurerName || '');
      setPolicyType(editingItem.policyType || 'Family Floater Health Insurance');
      setSumInsured(editingItem.sumInsured ? String(editingItem.sumInsured) : '');
      setTpaName(editingItem.tpaName || '');
      setHelplinePhone(editingItem.helplinePhone || '');
      setCashlessHospitalNotes(editingItem.cashlessHospitalNotes || '');
      setNotes(editingItem.notes || '');
      setAttachments(editingItem.attachments || []);
    } else {
      setCategory(defaultCategory);
      setSubType(defaultSubType || (defaultCategory === 'BANK' ? 'SAVINGS' : defaultCategory === 'ATM' ? 'DEBIT' : defaultCategory === 'DOCUMENTS' ? 'DRIVING_LICENSE' : 'HEALTH'));
      setTitle('');
      setHolderName('Adarsh S');
      setAccountNumber('');
      setIfscCode('');
      setBankName('');
      setBranchLocation('');
      setUpiId('');
      setCardNumber('');
      setExpiryDate('');
      setCvv('');
      setCardNetwork('VISA');
      setCardType('DEBIT');
      setPinHint('');
      setDocNumber('');
      setIssueDate('');
      setValidUntil('');
      setIssuingAuth('');
      setAddressLocation('');
      setPolicyNumber('');
      setInsurerName('');
      setPolicyType('Family Floater Health Insurance');
      setSumInsured('1500000');
      setTpaName('');
      setHelplinePhone('');
      setCashlessHospitalNotes('');
      setNotes('');
      setAttachments([]);
    }
    setError(null);
  }, [editingItem, defaultCategory, defaultSubType, isOpen]);

  if (!isOpen) return null;

  // Handle file uploads (converts file to base64 DataURL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 25 * 1024 * 1024) {
        setError(`File ${file.name} exceeds 25MB maximum size.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title or nickname for this card.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        category,
        subType: category === 'DOCUMENTS' && subType === 'CUSTOM' && customDocTypeName ? customDocTypeName : subType,
        title: title.trim(),
        holderName: holderName.trim() || null,
        accountNumber: accountNumber.trim() || null,
        ifscCode: ifscCode.trim().toUpperCase() || null,
        bankName: bankName.trim() || null,
        branchLocation: branchLocation.trim() || null,
        upiId: upiId.trim() || null,
        cardNumber: cardNumber.replace(/\s+/g, '') || null,
        expiryDate: expiryDate.trim() || null,
        cvv: cvv.trim() || null,
        cardNetwork,
        cardType,
        pinHint: pinHint.trim() || null,
        docNumber: docNumber.trim() || null,
        issueDate: issueDate || null,
        validUntil: validUntil.trim() || null,
        issuingAuth: issuingAuth.trim() || null,
        addressLocation: addressLocation.trim() || null,
        policyNumber: policyNumber.trim() || null,
        insurerName: insurerName.trim() || null,
        policyType: policyType.trim() || null,
        sumInsured: sumInsured ? Number(sumInsured) : null,
        tpaName: tpaName.trim() || null,
        helplinePhone: helplinePhone.trim() || null,
        cashlessHospitalNotes: cashlessHospitalNotes.trim() || null,
        notes: notes.trim() || null,
        attachments,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to save card');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              {category === 'BANK' && <Landmark className="w-5 h-5" />}
              {category === 'ATM' && <CreditCard className="w-5 h-5" />}
              {category === 'DOCUMENTS' && <ShieldCheck className="w-5 h-5" />}
              {category === 'INSURANCE' && <HeartHandshake className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {editingItem ? 'Edit Vault Card' : 'Add New Vault Card'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Encrypted and securely vaulted for Adarsh
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Selector Tabs (if creating new) */}
          {!editingItem && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Card Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'BANK', label: '1. Bank Account', icon: Landmark, color: 'text-emerald-500' },
                  { id: 'ATM', label: '2. ATM / Card', icon: CreditCard, color: 'text-cyan-500' },
                  { id: 'DOCUMENTS', label: '3. Identity Docs', icon: ShieldCheck, color: 'text-blue-500' },
                  { id: 'INSURANCE', label: '4. Health Insurance', icon: HeartHandshake, color: 'text-rose-500' },
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategory(cat.id as DocumentCategory);
                        if (cat.id === 'BANK') setSubType('SAVINGS');
                        if (cat.id === 'ATM') setSubType('DEBIT');
                        if (cat.id === 'DOCUMENTS') setSubType('DRIVING_LICENSE');
                        if (cat.id === 'INSURANCE') setSubType('HEALTH');
                      }}
                      className={`p-2.5 rounded-2xl border text-left text-xs font-bold flex flex-col gap-1 transition ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                          : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : cat.color}`} />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Title & Cardholder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Card Title / Nickname *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  category === 'BANK'
                    ? 'e.g. HDFC Salary Account'
                    : category === 'ATM'
                    ? 'e.g. Millennia Platinum Debit'
                    : category === 'DOCUMENTS'
                    ? 'e.g. Kerala Driving License'
                    : 'e.g. Star Health Family Optima'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Holder / Beneficiary Name
              </label>
              <input
                type="text"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="e.g. Adarsh S"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* CATEGORY 1: BANK ACCOUNT FIELDS                               */}
          {/* ------------------------------------------------------------- */}
          {category === 'BANK' && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank, SBI, ICICI"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Account Type
                  </label>
                  <select
                    value={subType}
                    onChange={(e) => setSubType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="SAVINGS">Savings Account</option>
                    <option value="CURRENT">Current Account</option>
                    <option value="SALARY">Salary Account</option>
                    <option value="BUSINESS">Business Account</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 50100492817291"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0001245"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Branch Location
                  </label>
                  <input
                    type="text"
                    value={branchLocation}
                    onChange={(e) => setBranchLocation(e.target.value)}
                    placeholder="e.g. MG Road, Kochi, Kerala"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    UPI ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. adarsh@okhdfcbank"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* CATEGORY 2: ATM / CARD FIELDS                                 */}
          {/* ------------------------------------------------------------- */}
          {category === 'ATM' && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Issuing Bank
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank, ICICI"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Card Type
                  </label>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="DEBIT">Debit Card</option>
                    <option value="CREDIT">Credit Card</option>
                    <option value="FOREX">Forex Card</option>
                    <option value="VIRTUAL">Virtual Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Network
                  </label>
                  <select
                    value={cardNetwork}
                    onChange={(e) => setCardNetwork(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="VISA">Visa</option>
                    <option value="MASTERCARD">Mastercard</option>
                    <option value="RUPAY">RuPay</option>
                    <option value="AMEX">American Express</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  16-Digit Card Number *
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="e.g. 4591 8234 9012 4829"
                  maxLength={23}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-mono font-bold tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Expiry Date (MM/YY)
                  </label>
                  <input
                    type="text"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    placeholder="08/29"
                    maxLength={5}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    CVV / CVC (3-4 digits)
                  </label>
                  <input
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="624"
                    maxLength={4}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ATM PIN Hint (Optional)
                  </label>
                  <input
                    type="text"
                    value={pinHint}
                    onChange={(e) => setPinHint(e.target.value)}
                    placeholder="e.g. Graduation year"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* CATEGORY 3: IDENTITY DOCUMENTS (License, Aadhaar, PAN, etc)  */}
          {/* ------------------------------------------------------------- */}
          {category === 'DOCUMENTS' && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Document Card Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'DRIVING_LICENSE', label: '🚗 Driving License' },
                    { id: 'AADHAAR', label: '🇮🇳 Aadhaar Card' },
                    { id: 'PAN', label: '💳 PAN Card' },
                    { id: 'PASSPORT', label: '🛂 Passport' },
                    { id: 'VOTER_ID', label: '🗳️ Voter ID (EPIC)' },
                    { id: 'CUSTOM', label: '➕ Custom Card' },
                  ].map((docType) => {
                    const isSelected = subType === docType.id;
                    return (
                      <button
                        key={docType.id}
                        type="button"
                        onClick={() => {
                          setSubType(docType.id);
                          if (docType.id === 'DRIVING_LICENSE' && !title) setTitle('Indian Driving License');
                          if (docType.id === 'AADHAAR' && !title) setTitle('Aadhaar Card');
                          if (docType.id === 'PAN' && !title) setTitle('Income Tax PAN Card');
                          if (docType.id === 'PASSPORT' && !title) setTitle('Republic of India Passport');
                          if (docType.id === 'VOTER_ID' && !title) setTitle('Voter ID Card (EPIC)');
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition text-left ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {docType.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {subType === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Custom Card / Document Name *
                  </label>
                  <input
                    type="text"
                    value={customDocTypeName}
                    onChange={(e) => setCustomDocTypeName(e.target.value)}
                    placeholder="e.g. Vehicle RC Book, Ration Card, Ayushman Card, Employee ID"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Document / Card Number *
                  </label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder={
                      subType === 'AADHAAR'
                        ? '12-digit UID e.g. 582949102847'
                        : subType === 'PAN'
                        ? '10-char PAN e.g. ABCPS8192K'
                        : subType === 'DRIVING_LICENSE'
                        ? 'e.g. KL-07-2018-0049281'
                        : subType === 'PASSPORT'
                        ? 'e.g. Z5819204'
                        : 'Document identifier number'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Issuing Authority
                  </label>
                  <input
                    type="text"
                    value={issuingAuth}
                    onChange={(e) => setIssuingAuth(e.target.value)}
                    placeholder={
                      subType === 'AADHAAR'
                        ? 'UIDAI'
                        : subType === 'PAN'
                        ? 'Income Tax Dept'
                        : subType === 'DRIVING_LICENSE'
                        ? 'RTO Ernakulam'
                        : 'Govt Department / Organization'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Valid Until / Expiry
                  </label>
                  <input
                    type="text"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    placeholder="e.g. 2038-04-11 or Lifetime"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Registered Address / Constituency
                </label>
                <input
                  type="text"
                  value={addressLocation}
                  onChange={(e) => setAddressLocation(e.target.value)}
                  placeholder="e.g. Kochi, Kerala, India"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* CATEGORY 4: HEALTH INSURANCE FIELDS                           */}
          {/* ------------------------------------------------------------- */}
          {category === 'INSURANCE' && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Insurance Provider *
                  </label>
                  <input
                    type="text"
                    value={insurerName}
                    onChange={(e) => setInsurerName(e.target.value)}
                    placeholder="e.g. Star Health, HDFC ERGO, Care Health"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Policy Plan Type
                  </label>
                  <input
                    type="text"
                    value={policyType}
                    onChange={(e) => setPolicyType(e.target.value)}
                    placeholder="e.g. Family Floater, Critical Illness, Top-Up"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Policy Number *
                  </label>
                  <input
                    type="text"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    placeholder="e.g. P/191124/01/2026/009182"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Sum Insured (₹ INR)
                  </label>
                  <input
                    type="number"
                    value={sumInsured}
                    onChange={(e) => setSumInsured(e.target.value)}
                    placeholder="1500000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    TPA / Cashless Administrator
                  </label>
                  <input
                    type="text"
                    value={tpaName}
                    onChange={(e) => setTpaName(e.target.value)}
                    placeholder="e.g. Medi Assist, Raksha TPA, Star In-House"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Cashless Helpline Phone
                  </label>
                  <input
                    type="text"
                    value={helplinePhone}
                    onChange={(e) => setHelplinePhone(e.target.value)}
                    placeholder="1800-425-2255"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Renewal / Expiry Date
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Network Hospital Notes
                  </label>
                  <input
                    type="text"
                    value={cashlessHospitalNotes}
                    onChange={(e) => setCashlessHospitalNotes(e.target.value)}
                    placeholder="e.g. Aster Medcity, Amrita, Apollo cashless network"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Special Remarks / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Remarks & Vault Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional confidential notes, PIN hints, recovery instructions..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {/* File Attachments (Scans / PDFs / Documents) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                <span>Upload Scans & Documents (Images / PDFs)</span>
              </label>
              <span className="text-[10px] text-slate-400">Max 25MB per file</span>
            </div>

            {/* Upload Drag/Click Zone */}
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50/50 dark:bg-slate-950/40 cursor-pointer transition group">
              <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition mb-1" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600">
                Click or drop scans to upload
              </span>
              <span className="text-[10px] text-slate-400">
                Supports JPG, PNG, WEBP, PDF files (Passbook, Front/Back Card, ID copy, Policy PDF)
              </span>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Attached Files List */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {file.name}
                      </span>
                      {file.size && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="p-1 text-slate-400 hover:text-red-500 transition"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-extrabold shadow-lg shadow-blue-500/25 transition flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>{editingItem ? 'Update Card' : 'Save to Vault'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
