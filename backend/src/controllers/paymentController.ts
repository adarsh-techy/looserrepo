import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAuditEvent } from '../utils/auditLogger';
import { moveToTrash } from '../utils/trashHelper';

// Helper to format month labels
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getMonthYearAndLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return {
      monthYear: `${now.getFullYear()}-${mm}`,
      monthLabel: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`,
    };
  }
  const year = d.getFullYear();
  const monthIdx = d.getMonth();
  const mm = String(monthIdx + 1).padStart(2, '0');
  return {
    monthYear: `${year}-${mm}`,
    monthLabel: `${MONTH_NAMES[monthIdx]} ${year}`,
  };
}

function parsePaymentJsonFields(payment: any) {
  let invoiceAttachment: any = null;
  if (payment.invoiceAttachment) {
    try {
      invoiceAttachment = JSON.parse(payment.invoiceAttachment);
    } catch (e) {
      invoiceAttachment = payment.invoiceAttachment;
    }
  }

  return {
    ...payment,
    invoiceAttachment,
  };
}

// 1. Get all payment records (or filtered by month / search)
export async function getPaymentRecords(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id!;
  const { monthYear, year, search, category, type } = req.query;

  const whereClause: any = {
    OR: [
      { isShared: true },
      { ownerId: userId },
    ],
  };

  if (monthYear && typeof monthYear === 'string') {
    whereClause.monthYear = monthYear;
  } else if (year && typeof year === 'string') {
    whereClause.monthYear = { startsWith: `${year}-` };
  }

  if (category && typeof category === 'string' && category !== 'ALL') {
    whereClause.category = category;
  }

  if (type && typeof type === 'string' && type !== 'ALL') {
    whereClause.type = type;
  }

  if (search && typeof search === 'string') {
    whereClause.OR = [
      { forWhat: { contains: search, mode: 'insensitive' } },
      { specialNotes: { contains: search, mode: 'insensitive' } },
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
      { paymentMethod: { contains: search, mode: 'insensitive' } },
    ];
  }

  const records = await prisma.paymentRecord.findMany({
    where: whereClause,
    include: {
      owner: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: [
      { date: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return res.json(records.map(parsePaymentJsonFields));
}

// 2. Get Months Overview Cards Summary
export async function getPaymentMonthsSummary(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id!;
  const { year } = req.query;

  const whereClause: any = {
    OR: [
      { isShared: true },
      { ownerId: userId },
    ],
  };

  if (year && typeof year === 'string') {
    whereClause.monthYear = { startsWith: `${year}-` };
  }

  const records = await prisma.paymentRecord.findMany({
    where: whereClause,
    orderBy: { date: 'desc' },
  });

  // Group records by monthYear
  const monthMap: Record<string, {
    monthYear: string;
    monthLabel: string;
    totalCount: number;
    totalAmount: number;
    totalIncome: number;
    totalExpense: number;
    invoicesCount: number;
    currencies: string[];
    latestDate: string;
  }> = {};

  for (const r of records) {
    if (!monthMap[r.monthYear]) {
      monthMap[r.monthYear] = {
        monthYear: r.monthYear,
        monthLabel: r.monthLabel,
        totalCount: 0,
        totalAmount: 0,
        totalIncome: 0,
        totalExpense: 0,
        invoicesCount: 0,
        currencies: [],
        latestDate: r.date,
      };
    }

    const item = monthMap[r.monthYear];
    item.totalCount += 1;
    item.totalAmount += r.amount;
    if (r.type === 'EXPENSE') {
      item.totalExpense += r.amount;
    } else {
      item.totalIncome += r.amount;
    }
    if (r.invoiceAttachment) {
      item.invoicesCount += 1;
    }
    if (r.currency && !item.currencies.includes(r.currency)) {
      item.currencies.push(r.currency);
    }
  }

  // Convert map to sorted array
  const monthsArray = Object.values(monthMap).sort((a, b) => b.monthYear.localeCompare(a.monthYear));

  return res.json(monthsArray);
}

// 3. Create a payment record
export async function createPaymentRecord(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id!;
  const {
    date,
    amount,
    currency = 'INR',
    type = 'INCOME',
    forWhat,
    category = 'General',
    paymentMethod = 'Bank Transfer',
    invoiceNumber,
    clientName,
    invoiceAttachment,
    specialNotes,
    isShared = true,
  } = req.body;

  if (!date || amount === undefined || !forWhat) {
    return res.status(400).json({ error: 'Date, amount, and forWhat purpose are required' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) {
    return res.status(400).json({ error: 'Valid numeric amount is required' });
  }

  const { monthYear, monthLabel } = getMonthYearAndLabel(date);

  const invoiceStr = invoiceAttachment
    ? typeof invoiceAttachment === 'string'
      ? invoiceAttachment
      : JSON.stringify(invoiceAttachment)
    : null;

  const record = await prisma.paymentRecord.create({
    data: {
      date,
      monthYear,
      monthLabel,
      amount: parsedAmount,
      currency: currency.toUpperCase(),
      type,
      forWhat: forWhat.trim(),
      category: category?.trim() || 'General',
      paymentMethod: paymentMethod?.trim() || 'Bank Transfer',
      invoiceNumber: invoiceNumber?.trim() || null,
      clientName: clientName?.trim() || null,
      invoiceAttachment: invoiceStr,
      specialNotes: specialNotes?.trim() || null,
      isShared,
      ownerId: userId,
    },
    include: {
      owner: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  await logAuditEvent({
    eventType: 'PAYMENT_RECORD_CREATED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email || '',
    targetType: 'PAYMENT_RECORD',
    targetId: record.id,
    ipAddress: req.ip || '',
    userAgent: req.headers['user-agent'] || '',
    metadata: { forWhat: record.forWhat, amount: record.amount, monthYear: record.monthYear },
  });

  return res.status(201).json(parsePaymentJsonFields(record));
}

// 4. Update a payment record
export async function updatePaymentRecord(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id!;
  const userRole = req.user?.role;

  const existing = await prisma.paymentRecord.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Payment record not found' });
  }

  if (existing.ownerId !== userId && userRole !== 'AD') {
    return res.status(403).json({ error: 'Unauthorized to update this payment record' });
  }

  const {
    date,
    amount,
    currency,
    type,
    forWhat,
    category,
    paymentMethod,
    invoiceNumber,
    clientName,
    invoiceAttachment,
    specialNotes,
    isShared,
  } = req.body;

  let updateData: any = {};

  if (date !== undefined) {
    updateData.date = date;
    const { monthYear, monthLabel } = getMonthYearAndLabel(date);
    updateData.monthYear = monthYear;
    updateData.monthLabel = monthLabel;
  }

  if (amount !== undefined) {
    const parsedAmount = parseFloat(amount);
    if (!isNaN(parsedAmount)) {
      updateData.amount = parsedAmount;
    }
  }

  if (currency !== undefined) updateData.currency = currency.toUpperCase();
  if (type !== undefined) updateData.type = type;
  if (forWhat !== undefined) updateData.forWhat = forWhat.trim();
  if (category !== undefined) updateData.category = category.trim();
  if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod.trim();
  if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber.trim() || null;
  if (clientName !== undefined) updateData.clientName = clientName?.trim() || null;
  if (specialNotes !== undefined) updateData.specialNotes = specialNotes.trim() || null;
  if (isShared !== undefined) updateData.isShared = isShared;

  if (invoiceAttachment !== undefined) {
    updateData.invoiceAttachment = invoiceAttachment
      ? typeof invoiceAttachment === 'string'
        ? invoiceAttachment
        : JSON.stringify(invoiceAttachment)
      : null;
  }

  const updated = await prisma.paymentRecord.update({
    where: { id },
    data: updateData,
    include: {
      owner: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return res.json(parsePaymentJsonFields(updated));
}

// 5. Delete a payment record
export async function deletePaymentRecord(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id!;
  const userRole = req.user?.role;

  const existing = await prisma.paymentRecord.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Payment record not found' });
  }

  if (existing.ownerId !== userId && userRole !== 'AD') {
    return res.status(403).json({ error: 'Unauthorized to delete this payment record' });
  }

  // Move snapshot to Trash
  await moveToTrash({
    originalId: existing.id,
    itemType: 'PAYMENT',
    title: existing.forWhat,
    subtitle: `${existing.monthLabel} • ${existing.currency || 'INR'} ${existing.amount} (${existing.type})`,
    itemData: existing,
    deletedById: userId,
  });

  await prisma.paymentRecord.delete({ where: { id } });

  await logAuditEvent({
    eventType: 'PAYMENT_RECORD_DELETED',
    severity: 'INFO',
    actorId: userId,
    actorEmail: req.user?.email || '',
    targetType: 'PAYMENT_RECORD',
    targetId: id,
    ipAddress: req.ip || '',
    userAgent: req.headers['user-agent'] || '',
    metadata: { forWhat: existing.forWhat, monthYear: existing.monthYear },
  });

  return res.json({ message: 'Payment record moved to trash', id });
}

