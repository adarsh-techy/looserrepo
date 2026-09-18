export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  totpEnabled: boolean;
  sirenSoundPref: boolean;
  themePref: string;
  notificationEmail?: string;
  pagePermissions?: string[];
  lastLogin?: string;
  lastCheckIn?: string;
  createdAt: string;
}

export interface BusinessItem {
  id: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  links: { title: string; url: string }[];
  attachments: { name: string; url?: string; type?: string; size?: string }[];
  isShared: boolean;
  ownerId: string;
  owner: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface FuturePlan {
  id: string;
  title: string;
  targetQuarter: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'IDEA' | 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED';
  description: string;
  milestones: { id: string; text: string; completed: boolean }[];
  links: { title: string; url: string }[];
  adNotes?: string;
  adNotesUpdatedAt?: string;
  nsNotes?: string;
  nsNotesUpdatedAt?: string;
  sharedNotes?: string;
  sharedNotesUpdatedAt?: string;
  sharedNotesUpdatedBy?: string;
  ownerId: string;
  owner: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface VaultItem {
  id: string;
  accountName: string;
  usernameOrEmail: string;
  maskedPassword: string;
  websiteUrl?: string;
  notes?: string;
  attachments: { name: string; url?: string }[];
  ownerId: string;
  owner: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface DayToDayNote {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  isCompleted: boolean;
  time?: string;
  tags: string[];
  authorId: string;
  author: { id: string; name: string; email: string; role: string };
  createdAt: string;
  updatedAt: string;
}

export interface SharedNote {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author: { id: string; name: string; email: string };
  recipientId: string;
  recipient: { id: string; name: string; email: string };
  reminderDate?: string;
  isRead: boolean;
  readAt?: string;
  promptOnLogin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SecretNote {
  id: string;
  title: string;
  category: 'PRIVATE_EMERGENCY' | 'POST_DEATH';
  hint?: string;
  recoveryQuestion?: string;
  recoveryQuestionsList?: Array<{ id: number; question: string }>;
  hasRecovery?: boolean;
  ownerId: string;
  owner: { id: string; name: string; email: string; lastCheckIn?: string };
  designatedRecipientId: string;
  designatedRecipient: { id: string; name: string; email: string };
  waitingPeriodHours: number;
  ownerLastCheckInAt: string;
  hoursSinceOwnerCheckIn: number;
  isOwnerUnreachable: boolean;
  status: 'ACTIVE' | 'UNLOCKED' | 'DEATH_VERIFIED' | 'ARCHIVED';
  postDeathVerified: boolean;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
  latestEmergencyRequest?: {
    id: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'DENIED' | 'RELEASED';
    eligibleReleaseDate: string;
    requester: { id: string; name: string; email: string };
    createdAt: string;
  } | null;
}

export interface AuditLog {
  id: string;
  eventType: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'ALERT';
  actorId?: string;
  actor?: { id: string; name: string; email: string };
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, any>;
  sirenTriggered: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SECURITY_ALERT' | 'EMERGENCY_REQUEST';
  isRead: boolean;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface SecurityAlert {
  alertId: string;
  eventType: string;
  severity: 'WARNING' | 'CRITICAL' | 'ALERT';
  message: string;
  noteTitle: string;
  actorEmail: string;
  timestamp: string;
  requiresSiren: boolean;
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  sender: { id: string; name: string; email: string; role: string; avatar?: string };
  recipientId: string;
  recipient: { id: string; name: string; email: string; role: string; avatar?: string };
  isDelivered: boolean;
  deliveredAt?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatPartner {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  isOnline: boolean;
  lastCheckIn?: string;
  lastLogin?: string;
}

export interface NoteAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export interface SecretNotePayload {
  text: string;
  attachments: NoteAttachment[];
}

export interface WorkCredential {
  id: string;
  label: string; // Dynamic user-defined tag e.g. "Supabase Key", "Stripe Secret", "Admin User", "Database"
  email?: string;
  password?: string;
  serviceType?: string; // e.g. "Database", "Hosting", "API Key", "Authentication", "Server SSH"
  notes?: string;
}

export interface WorkAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export interface WorkTechItem {
  name: string;
  category: 'frontend' | 'backend' | 'db' | 'other';
}

export interface WorkProject {
  id: string;
  name: string;
  clientName: string;
  careOf?: string;
  place?: string;
  country?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  techStack: WorkTechItem[] | string[];
  hostedPlatform?: string;
  gitLink?: string;
  notes?: string;
  credentials: WorkCredential[];
  attachments: WorkAttachment[];
  paymentAmount?: number;
  paymentCurrency?: string;
  paymentVia?: string;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  platformDueDate?: string;
  dbDueDate?: string;
  projectDueDate?: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  isShared: boolean;
  ownerId: string;
  owner?: { id: string; name: string; email: string; role: string };
  createdAt: string;
  updatedAt: string;
}
export interface PaymentAttachment {
  name: string;
  size?: number;
  type?: string;
  dataUrl?: string;
}

export interface PaymentRecord {
  id: string;
  monthYear: string; // "2026-09"
  monthLabel: string; // "September 2026"
  date: string;
  amount: number;
  currency: string;
  type: 'INCOME' | 'EXPENSE';
  forWhat: string;
  category?: string;
  paymentMethod?: string;
  invoiceNumber?: string;
  clientName?: string;
  invoiceAttachment?: PaymentAttachment | null;
  specialNotes?: string;
  isShared: boolean;
  ownerId: string;
  owner?: { id: string; name: string; email: string; role: string };
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMonthSummary {
  monthYear: string;
  monthLabel: string;
  totalIncome: number;
  totalExpense: number;
  netTotal: number;
  count: number;
  invoiceCount: number;
}

export interface MoneyRecord {
  id: string;
  monthYear: string; // "2026-09"
  monthLabel: string; // "September 2026"
  date: string; // "2026-09-18"
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  paymentMode: 'GPAY' | 'CASH' | 'ACCOUNT_TRANSFER' | 'OTHER' | string;
  forWhat: string;
  place?: string;
  notes?: string;
  isShared: boolean;
  ownerId: string;
  owner?: { id: string; name: string; email: string; role: string };
  createdAt: string;
  updatedAt: string;
}

export interface MoneyMonthSummary {
  monthYear: string;
  monthLabel: string;
  totalIncome: number;
  totalExpense: number;
  netTotal: number;
  count: number;
}

export type TrashItemType =
  | 'WORK'
  | 'MONEY'
  | 'PAYMENT'
  | 'BUSINESS'
  | 'FUTURE_PLAN'
  | 'DAY_TO_DAY'
  | 'VAULT'
  | 'SHARED_NOTE'
  | 'SECRET_NOTE';

export interface TrashItem {
  id: string;
  originalId: string;
  itemType: TrashItemType;
  title: string;
  subtitle?: string | null;
  deleteReason?: string | null;
  itemData: string;

  parsedData?: any;
  deletedById: string;
  deletedBy?: {
    id: string;
    name: string;
    email: string;
    role?: string;
    avatar?: string;
  };
  deletedAt: string;
}

