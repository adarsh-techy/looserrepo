import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAuditEvent } from '../utils/auditLogger';
import { moveToTrash } from '../utils/trashHelper';

// Helper to parse JSON safely
function safeParseJson(str: string | null | undefined, fallback: any = []) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// Initial sample seed so user immediately sees rich, beautiful cards
async function seedInitialDocumentSamples(userId: string) {
  const count = await prisma.documentItem.count({ where: { ownerId: userId } });
  if (count > 0) return;

  const initialSamples = [
    // 1. Bank Account Sample
    {
      category: 'BANK',
      subType: 'SAVINGS',
      title: 'HDFC Priority Savings',
      holderName: 'Adarsh S',
      accountNumber: '50100492817291',
      ifscCode: 'HDFC0001245',
      bankName: 'HDFC Bank',
      branchLocation: 'MG Road, Kochi, Kerala',
      upiId: 'adarsh@okhdfcbank',
      notes: 'Primary salary and operational savings account. NetBanking active.',
      attachments: JSON.stringify([]),
      ownerId: userId,
    },
    {
      category: 'BANK',
      subType: 'CURRENT',
      title: 'SBI Business Current Account',
      holderName: 'Adarsh Enterprise',
      accountNumber: '381920491028',
      ifscCode: 'SBIN0004510',
      bankName: 'State Bank of India',
      branchLocation: 'Kakkanad Infopark, Kerala',
      upiId: 'adarsh.biz@sbi',
      notes: 'Current account for business transactions, client inward wires, and TDS.',
      attachments: JSON.stringify([]),
      ownerId: userId,
    },

    // 2. ATM / Card Sample
    {
      category: 'ATM',
      subType: 'DEBIT',
      title: 'HDFC Millennia Platinum Debit',
      holderName: 'ADARSH S',
      cardNumber: '4591823490124829',
      expiryDate: '08/29',
      cvv: '624',
      cardNetwork: 'VISA',
      cardType: 'DEBIT',
      pinHint: 'Year of high school graduation',
      bankName: 'HDFC Bank',
      notes: 'Daily ATM limit: ₹50,000. Online limit: ₹2,00,000.',
      attachments: JSON.stringify([]),
      ownerId: userId,
    },
    {
      category: 'ATM',
      subType: 'CREDIT',
      title: 'ICICI Sapphiro Metal Credit Card',
      holderName: 'ADARSH S',
      cardNumber: '5241908273615920',
      expiryDate: '11/30',
      cvv: '819',
      cardNetwork: 'MASTERCARD',
      cardType: 'CREDIT',
      pinHint: 'First phone digits',
      bankName: 'ICICI Bank',
      notes: 'Credit limit: ₹5,00,000. Free airport lounge access included.',
      attachments: JSON.stringify([]),
      ownerId: userId,
    },

    // 3. Identity Documents Samples
    {
      category: 'DOCUMENTS',
      subType: 'DRIVING_LICENSE',
      title: 'Indian Driving License',
      holderName: 'Adarsh S',
      docNumber: 'KL-07-2018-0049281',
      issueDate: '2018-04-12',
      validUntil: '2038-04-11',
      issuingAuth: 'RTO Ernakulam, Kerala',
      addressLocation: 'Kochi, Kerala, India',
      notes: 'Authorized vehicle classes: MCWG (Motorcycle with Gear), LMV (Light Motor Vehicle). Blood Group: O+',
      attachments: JSON.stringify([]),
      ownerId: userId,
    },
    {
      category: 'DOCUMENTS',
      subType: 'AADHAAR',
      title: 'Aadhaar Identity Card',
      holderName: 'Adarsh S',
      docNumber: '582949102847',
      issueDate: '2014-06-20',
      validUntil: 'Lifetime / Valid',
      issuingAuth: 'Unique Identification Authority of India (UIDAI)',
      addressLocation: 'Kerala, India',
      notes: 'Biometrics locked via mAadhaar app. Linked with mobile number.',
      attachments: JSON.stringify([]),
      ownerId: userId,
    },
    {
      category: 'DOCUMENTS',
      subType: 'PAN',
      title: 'Income Tax PAN Card',
      holderName: 'ADARSH S',
      docNumber: 'ABCPS8192K',
      issueDate: '2016-09-15',
      validUntil: 'Lifetime / Permanent',
      issuingAuth: 'Income Tax Department, Govt of India',
      addressLocation: 'India',
      notes: 'Linked with Aadhaar. Verified on NSDL and e-Filing portal.',
      attachments: JSON.stringify([]),
      ownerId: userId,
    },
    {
      category: 'DOCUMENTS',
      subType: 'PASSPORT',
      title: 'Republic of India Passport',
      holderName: 'ADARSH S',
      docNumber: 'Z5819204',
      issueDate: '2021-03-10',
      validUntil: '2031-03-09',
      issuingAuth: 'Passport Office Cochin, Ministry of External Affairs',
      addressLocation: 'Kochi, Kerala, India',
      notes: '36-page regular booklet. Valid for international travel through March 2031.',
      attachments: JSON.stringify([]),
      ownerId: userId,
    },
    {
      category: 'DOCUMENTS',
      subType: 'VOTER_ID',
      title: 'Election Commission Voter ID (EPIC)',
      holderName: 'Adarsh S',
      docNumber: 'KL/07/082/194829',
      issueDate: '2019-01-25',
      validUntil: 'Lifetime',
      issuingAuth: 'Election Commission of India',
      addressLocation: 'Ernakulam Assembly Constituency, Kerala',
      notes: 'Polling Station: Govt High School, Booth #42.',
      attachments: JSON.stringify([]),
      ownerId: userId,
    },

    // 4. Insurance (Health) Sample
    {
      category: 'INSURANCE',
      subType: 'HEALTH',
      title: 'Star Health Family Optima Comprehensive',
      holderName: 'Adarsh S & Family',
      policyNumber: 'P/191124/01/2026/009182',
      insurerName: 'Star Health and Allied Insurance Co Ltd',
      policyType: 'Family Floater Health Insurance',
      sumInsured: 1500000,
      issueDate: '2025-10-01',
      validUntil: '2026-09-30',
      tpaName: 'Star In-House Health TPA',
      helplinePhone: '1800-425-2255 / 044-28288800',
      cashlessHospitalNotes: 'Aster Medcity, Amrita Institute, Rajagiri Hospital, Apollo Hospitals network cashless pre-authorized.',
      notes: 'Covers inpatient hospitalization, day-care procedures, pre-post hospital expenses, ambulance, and annual health checkups.',
      attachments: JSON.stringify([]),
      ownerId: userId,
    },
  ];

  for (const sample of initialSamples) {
    await prisma.documentItem.create({ data: sample });
  }
}

export async function getDocumentItems(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id!;
    const { category, subType, search } = req.query;

    // Seed samples if empty for this user
    await seedInitialDocumentSamples(userId);

    const whereClause: any = {};

    if (category && typeof category === 'string' && category !== 'ALL') {
      whereClause.category = category.toUpperCase();
    }

    if (subType && typeof subType === 'string' && subType !== 'ALL') {
      whereClause.subType = subType;
    }

    const items = await prisma.documentItem.findMany({
      where: whereClause,
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let filtered = items;
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.holderName && i.holderName.toLowerCase().includes(q)) ||
          (i.bankName && i.bankName.toLowerCase().includes(q)) ||
          (i.accountNumber && i.accountNumber.toLowerCase().includes(q)) ||
          (i.ifscCode && i.ifscCode.toLowerCase().includes(q)) ||
          (i.cardNumber && i.cardNumber.toLowerCase().includes(q)) ||
          (i.docNumber && i.docNumber.toLowerCase().includes(q)) ||
          (i.policyNumber && i.policyNumber.toLowerCase().includes(q)) ||
          (i.insurerName && i.insurerName.toLowerCase().includes(q)) ||
          (i.notes && i.notes.toLowerCase().includes(q))
      );
    }

    const parsed = filtered.map((item) => ({
      ...item,
      attachments: safeParseJson(item.attachments, []),
      customFields: safeParseJson(item.customFields, {}),
    }));

    return res.json(parsed);
  } catch (error) {
    console.error('Failed to get document items:', error);
    return res.status(500).json({ error: 'Failed to retrieve documents' });
  }
}

export async function getDocumentItemById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const item = await prisma.documentItem.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.json({
      ...item,
      attachments: safeParseJson(item.attachments, []),
      customFields: safeParseJson(item.customFields, {}),
    });
  } catch (error) {
    console.error('Failed to get document item:', error);
    return res.status(500).json({ error: 'Failed to retrieve document' });
  }
}

export async function createDocumentItem(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id!;
    const {
      category,
      subType,
      title,
      holderName,
      accountNumber,
      ifscCode,
      bankName,
      branchLocation,
      upiId,
      cardNumber,
      expiryDate,
      cvv,
      cardNetwork,
      cardType,
      pinHint,
      docNumber,
      issueDate,
      validUntil,
      issuingAuth,
      addressLocation,
      policyNumber,
      insurerName,
      policyType,
      sumInsured,
      tpaName,
      helplinePhone,
      cashlessHospitalNotes,
      notes,
      customFields,
      attachments,
    } = req.body;

    if (!category || !title) {
      return res.status(400).json({ error: 'Category and Title are required' });
    }

    const validCategories = ['BANK', 'ATM', 'DOCUMENTS', 'INSURANCE'];
    if (!validCategories.includes(category.toUpperCase())) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
    }

    const newItem = await prisma.documentItem.create({
      data: {
        category: category.toUpperCase(),
        subType: subType || null,
        title: title.trim(),
        holderName: holderName?.trim() || null,
        accountNumber: accountNumber?.trim() || null,
        ifscCode: ifscCode?.trim()?.toUpperCase() || null,
        bankName: bankName?.trim() || null,
        branchLocation: branchLocation?.trim() || null,
        upiId: upiId?.trim() || null,
        cardNumber: cardNumber?.replace(/\s+/g, '') || null,
        expiryDate: expiryDate?.trim() || null,
        cvv: cvv?.trim() || null,
        cardNetwork: cardNetwork?.trim() || null,
        cardType: cardType?.trim() || null,
        pinHint: pinHint?.trim() || null,
        docNumber: docNumber?.trim() || null,
        issueDate: issueDate || null,
        validUntil: validUntil || null,
        issuingAuth: issuingAuth?.trim() || null,
        addressLocation: addressLocation?.trim() || null,
        policyNumber: policyNumber?.trim() || null,
        insurerName: insurerName?.trim() || null,
        policyType: policyType?.trim() || null,
        sumInsured: sumInsured ? Number(sumInsured) : null,
        tpaName: tpaName?.trim() || null,
        helplinePhone: helplinePhone?.trim() || null,
        cashlessHospitalNotes: cashlessHospitalNotes?.trim() || null,
        notes: notes?.trim() || null,
        customFields: typeof customFields === 'object' ? JSON.stringify(customFields) : (customFields || '{}'),
        attachments: typeof attachments === 'object' ? JSON.stringify(attachments) : (attachments || '[]'),
        ownerId: userId,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await logAuditEvent({
      eventType: 'DOCUMENT_CREATED',
      severity: 'INFO',
      actorId: userId,
      actorEmail: req.user?.email,
      targetType: 'DocumentItem',
      targetId: newItem.id,
      metadata: { category: newItem.category, title: newItem.title, subType: newItem.subType },
    });

    return res.status(201).json({
      ...newItem,
      attachments: safeParseJson(newItem.attachments, []),
      customFields: safeParseJson(newItem.customFields, {}),
    });
  } catch (error) {
    console.error('Failed to create document item:', error);
    return res.status(500).json({ error: 'Failed to create document' });
  }
}

export async function updateDocumentItem(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id!;
    const { id } = req.params;

    const existing = await prisma.documentItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const {
      category,
      subType,
      title,
      holderName,
      accountNumber,
      ifscCode,
      bankName,
      branchLocation,
      upiId,
      cardNumber,
      expiryDate,
      cvv,
      cardNetwork,
      cardType,
      pinHint,
      docNumber,
      issueDate,
      validUntil,
      issuingAuth,
      addressLocation,
      policyNumber,
      insurerName,
      policyType,
      sumInsured,
      tpaName,
      helplinePhone,
      cashlessHospitalNotes,
      notes,
      customFields,
      attachments,
    } = req.body;

    const updated = await prisma.documentItem.update({
      where: { id },
      data: {
        category: category !== undefined ? category.toUpperCase() : undefined,
        subType: subType !== undefined ? subType : undefined,
        title: title !== undefined ? title.trim() : undefined,
        holderName: holderName !== undefined ? holderName?.trim() : undefined,
        accountNumber: accountNumber !== undefined ? accountNumber?.trim() : undefined,
        ifscCode: ifscCode !== undefined ? ifscCode?.trim()?.toUpperCase() : undefined,
        bankName: bankName !== undefined ? bankName?.trim() : undefined,
        branchLocation: branchLocation !== undefined ? branchLocation?.trim() : undefined,
        upiId: upiId !== undefined ? upiId?.trim() : undefined,
        cardNumber: cardNumber !== undefined ? cardNumber?.replace(/\s+/g, '') : undefined,
        expiryDate: expiryDate !== undefined ? expiryDate?.trim() : undefined,
        cvv: cvv !== undefined ? cvv?.trim() : undefined,
        cardNetwork: cardNetwork !== undefined ? cardNetwork?.trim() : undefined,
        cardType: cardType !== undefined ? cardType?.trim() : undefined,
        pinHint: pinHint !== undefined ? pinHint?.trim() : undefined,
        docNumber: docNumber !== undefined ? docNumber?.trim() : undefined,
        issueDate: issueDate !== undefined ? issueDate : undefined,
        validUntil: validUntil !== undefined ? validUntil : undefined,
        issuingAuth: issuingAuth !== undefined ? issuingAuth?.trim() : undefined,
        addressLocation: addressLocation !== undefined ? addressLocation?.trim() : undefined,
        policyNumber: policyNumber !== undefined ? policyNumber?.trim() : undefined,
        insurerName: insurerName !== undefined ? insurerName?.trim() : undefined,
        policyType: policyType !== undefined ? policyType?.trim() : undefined,
        sumInsured: sumInsured !== undefined ? (sumInsured ? Number(sumInsured) : null) : undefined,
        tpaName: tpaName !== undefined ? tpaName?.trim() : undefined,
        helplinePhone: helplinePhone !== undefined ? helplinePhone?.trim() : undefined,
        cashlessHospitalNotes: cashlessHospitalNotes !== undefined ? cashlessHospitalNotes?.trim() : undefined,
        notes: notes !== undefined ? notes?.trim() : undefined,
        customFields: customFields !== undefined ? (typeof customFields === 'object' ? JSON.stringify(customFields) : customFields) : undefined,
        attachments: attachments !== undefined ? (typeof attachments === 'object' ? JSON.stringify(attachments) : attachments) : undefined,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await logAuditEvent({
      eventType: 'DOCUMENT_UPDATED',
      severity: 'INFO',
      actorId: userId,
      actorEmail: req.user?.email,
      targetType: 'DocumentItem',
      targetId: updated.id,
      metadata: { category: updated.category, title: updated.title, subType: updated.subType },
    });

    return res.json({
      ...updated,
      attachments: safeParseJson(updated.attachments, []),
      customFields: safeParseJson(updated.customFields, {}),
    });
  } catch (error) {
    console.error('Failed to update document item:', error);
    return res.status(500).json({ error: 'Failed to update document' });
  }
}

export async function deleteDocumentItem(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id!;
    const { id } = req.params;

    const existing = await prisma.documentItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Move to recycle bin
    await moveToTrash({
      originalId: existing.id,
      itemType: 'DOCUMENT',
      title: existing.title,
      subtitle: `${existing.category}${existing.subType ? ` — ${existing.subType}` : ''}`,
      itemData: existing,
      deletedById: userId,
    });

    await prisma.documentItem.delete({ where: { id } });

    await logAuditEvent({
      eventType: 'DOCUMENT_DELETED',
      severity: 'WARNING',
      actorId: userId,
      actorEmail: req.user?.email,
      targetType: 'DocumentItem',
      targetId: existing.id,
      metadata: { category: existing.category, title: existing.title },
    });

    return res.json({ success: true, message: 'Document moved to Recycle Bin' });
  } catch (error) {
    console.error('Failed to delete document item:', error);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
}
