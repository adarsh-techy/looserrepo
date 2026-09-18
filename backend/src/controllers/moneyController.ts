import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAuditEvent } from '../utils/auditLogger';
import { moveToTrash } from '../utils/trashHelper';

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

// 1. Get all Money Management records
export async function getMoneyRecords(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id!;
    const { monthYear, startDate, endDate, type, paymentMode, search } = req.query;

    const whereClause: any = {
      OR: [
        { isShared: true },
        { ownerId: userId },
      ],
    };

    if (monthYear && typeof monthYear === 'string') {
      whereClause.monthYear = monthYear;
    }

    // Date range filtering (Day / Week / Custom range)
    if (startDate && typeof startDate === 'string' && endDate && typeof endDate === 'string') {
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    } else if (startDate && typeof startDate === 'string') {
      whereClause.date = { gte: startDate };
    } else if (endDate && typeof endDate === 'string') {
      whereClause.date = { lte: endDate };
    }

    if (type && typeof type === 'string' && type !== 'ALL') {
      whereClause.type = type;
    }

    if (paymentMode && typeof paymentMode === 'string' && paymentMode !== 'ALL') {
      whereClause.paymentMode = paymentMode;
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      whereClause.AND = [
        {
          OR: [
            { forWhat: { contains: q, mode: 'insensitive' } },
            { place: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
            { paymentMode: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const records = await prisma.moneyRecord.findMany({
      where: whereClause,
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return res.json(records);
  } catch (error: any) {
    console.error('Error fetching money records:', error);
    return res.status(500).json({ error: 'Failed to fetch money records' });
  }
}

// 2. Get Money Months Overview Summary
export async function getMoneyMonthsSummary(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id!;

    const records = await prisma.moneyRecord.findMany({
      where: {
        OR: [
          { isShared: true },
          { ownerId: userId },
        ],
      },
      select: {
        monthYear: true,
        monthLabel: true,
        type: true,
        amount: true,
      },
    });

    const summaryMap: Record<
      string,
      {
        monthYear: string;
        monthLabel: string;
        totalIncome: number;
        totalExpense: number;
        netTotal: number;
        count: number;
      }
    > = {};

    for (const r of records) {
      if (!summaryMap[r.monthYear]) {
        summaryMap[r.monthYear] = {
          monthYear: r.monthYear,
          monthLabel: r.monthLabel,
          totalIncome: 0,
          totalExpense: 0,
          netTotal: 0,
          count: 0,
        };
      }

      const num = Number(r.amount) || 0;
      summaryMap[r.monthYear].count += 1;

      if (r.type === 'INCOME') {
        summaryMap[r.monthYear].totalIncome += num;
      } else {
        summaryMap[r.monthYear].totalExpense += num;
      }

      summaryMap[r.monthYear].netTotal =
        summaryMap[r.monthYear].totalIncome - summaryMap[r.monthYear].totalExpense;
    }

    const summaryList = Object.values(summaryMap).sort((a, b) =>
      b.monthYear.localeCompare(a.monthYear)
    );

    return res.json(summaryList);
  } catch (error: any) {
    console.error('Error fetching money summary:', error);
    return res.status(500).json({ error: 'Failed to fetch money summary' });
  }
}

// 3. Create Money Record
export async function createMoneyRecord(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id!;
    const {
      date,
      type = 'EXPENSE',
      amount,
      paymentMode = 'GPAY',
      forWhat,
      place,
      notes,
      isShared = true,
    } = req.body;

    if (!forWhat || forWhat.trim() === '') {
      return res.status(400).json({ error: 'Purpose ("forWhat") is required' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'A valid positive amount is required' });
    }

    const transDate = date || new Date().toISOString().split('T')[0];
    const { monthYear, monthLabel } = getMonthYearAndLabel(transDate);

    const record = await prisma.moneyRecord.create({
      data: {
        monthYear,
        monthLabel,
        date: transDate,
        type: type.toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE',
        amount: numAmount,
        paymentMode: paymentMode || 'GPAY',
        forWhat: forWhat.trim(),
        place: place ? place.trim() : null,
        notes: notes ? notes.trim() : null,
        isShared: Boolean(isShared),
        ownerId: userId,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await logAuditEvent({
      eventType: 'CREATE_MONEY_RECORD',
      severity: 'INFO',
      actorId: userId,
      actorEmail: req.user?.email || '',
      targetType: 'MoneyRecord',
      targetId: record.id,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      metadata: { forWhat: record.forWhat, amount: record.amount, type: record.type, place: record.place },
    });

    return res.status(201).json(record);
  } catch (error: any) {
    console.error('Error creating money record:', error);
    return res.status(500).json({ error: 'Failed to create money record' });
  }
}

// 4. Update Money Record
export async function updateMoneyRecord(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id!;
    const userRole = req.user?.role;
    const { id } = req.params;

    const existing = await prisma.moneyRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Money record not found' });
    }

    if (existing.ownerId !== userId && userRole !== 'AD') {
      return res.status(403).json({ error: 'Unauthorized to modify this record' });
    }

    const {
      date,
      type,
      amount,
      paymentMode,
      forWhat,
      place,
      notes,
      isShared,
    } = req.body;

    const updateData: any = {};

    if (date !== undefined) {
      updateData.date = date;
      const { monthYear, monthLabel } = getMonthYearAndLabel(date);
      updateData.monthYear = monthYear;
      updateData.monthLabel = monthLabel;
    }

    if (type !== undefined) {
      updateData.type = type.toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE';
    }

    if (amount !== undefined) {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'A valid positive amount is required' });
      }
      updateData.amount = numAmount;
    }

    if (paymentMode !== undefined) updateData.paymentMode = paymentMode;
    if (forWhat !== undefined) updateData.forWhat = forWhat.trim();
    if (place !== undefined) updateData.place = place ? place.trim() : null;
    if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;
    if (isShared !== undefined) updateData.isShared = Boolean(isShared);

    const updated = await prisma.moneyRecord.update({
      where: { id },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return res.json(updated);
  } catch (error: any) {
    console.error('Error updating money record:', error);
    return res.status(500).json({ error: 'Failed to update money record' });
  }
}

// 5. Delete Money Record
export async function deleteMoneyRecord(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id!;
    const userRole = req.user?.role;
    const { id } = req.params;

    const existing = await prisma.moneyRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Money record not found' });
    }

    if (existing.ownerId !== userId && userRole !== 'AD') {
      return res.status(403).json({ error: 'Unauthorized to delete this record' });
    }

    // Move snapshot to Trash
    await moveToTrash({
      originalId: existing.id,
      itemType: 'MONEY',
      title: existing.forWhat,
      subtitle: `${existing.date} • ₹${existing.amount} (${existing.type}) via ${existing.paymentMode}${existing.place ? ` @ ${existing.place}` : ''}`,
      itemData: existing,
      deletedById: userId,
    });

    await prisma.moneyRecord.delete({
      where: { id },
    });

    await logAuditEvent({
      eventType: 'DELETE_MONEY_RECORD',
      severity: 'WARNING',
      actorId: userId,
      actorEmail: req.user?.email || '',
      targetType: 'MoneyRecord',
      targetId: id,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      metadata: { forWhat: existing.forWhat, amount: existing.amount, type: existing.type },
    });

    return res.json({ message: 'Money record moved to trash' });
  } catch (error: any) {

    console.error('Error deleting money record:', error);
    return res.status(500).json({ error: 'Failed to delete money record' });
  }
}
