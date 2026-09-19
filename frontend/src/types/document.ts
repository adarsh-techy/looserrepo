export type DocumentCategory = 'BANK' | 'ATM' | 'DOCUMENTS' | 'INSURANCE';

export type DocumentSubType =
  | 'SAVINGS'
  | 'CURRENT'
  | 'SALARY'
  | 'DEBIT'
  | 'CREDIT'
  | 'FOREX'
  | 'DRIVING_LICENSE'
  | 'AADHAAR'
  | 'PAN'
  | 'PASSPORT'
  | 'VOTER_ID'
  | 'CUSTOM'
  | 'HEALTH'
  | 'LIFE'
  | 'FAMILY_FLOATER'
  | 'CRITICAL_ILLNESS';

export interface DocumentAttachment {
  name: string;
  size?: number;
  type?: string;
  dataUrl: string;
}

export interface DocumentItem {
  id: string;
  category: DocumentCategory;
  subType?: DocumentSubType | string | null;
  title: string;
  holderName?: string | null;

  // Bank Account Fields
  accountNumber?: string | null;
  ifscCode?: string | null;
  bankName?: string | null;
  branchLocation?: string | null;
  upiId?: string | null;

  // ATM / Card Fields
  cardNumber?: string | null;
  expiryDate?: string | null;
  cvv?: string | null;
  cardNetwork?: string | null;
  cardType?: string | null;
  pinHint?: string | null;

  // Identity Document Fields
  docNumber?: string | null;
  issueDate?: string | null;
  validUntil?: string | null;
  issuingAuth?: string | null;
  addressLocation?: string | null;

  // Health Insurance Fields
  policyNumber?: string | null;
  insurerName?: string | null;
  policyType?: string | null;
  sumInsured?: number | null;
  tpaName?: string | null;
  helplinePhone?: string | null;
  cashlessHospitalNotes?: string | null;

  // Common
  notes?: string | null;
  customFields?: Record<string, any>;
  attachments: DocumentAttachment[];
  isShared?: boolean;
  ownerId?: string;
  owner?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
  createdAt: string;
  updatedAt: string;
}
