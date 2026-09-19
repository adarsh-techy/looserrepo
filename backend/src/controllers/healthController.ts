import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAuditEvent } from '../utils/auditLogger';

/**
 * Seed initial starter persons and records if none exist in the system
 */
async function ensureSeedPersons(userId: string) {
  const existing = await prisma.healthPerson.count();
  if (existing > 0) return;

  // 1. Create Adarsh (Self)
  const adarsh = await prisma.healthPerson.create({
    data: {
      name: 'Adarsh',
      relationship: 'Self',
      gender: 'Male',
      dob: '1998-05-14',
      bloodGroup: 'O+',
      notes: 'No known drug allergies. Active lifestyle & routine annual health checks.',
      ownerId: userId,
    },
  });

  // 2. Create Vishnu (Partner)
  const vishnu = await prisma.healthPerson.create({
    data: {
      name: 'Vishnu',
      relationship: 'Partner',
      gender: 'Male',
      dob: '1997-11-20',
      bloodGroup: 'B+',
      notes: 'Executive partner profile. Regular health monitoring and dental checkups.',
      ownerId: userId,
    },
  });

  // Sample Records for Adarsh - Heart / Cardiology
  await prisma.healthRecord.createMany({
    data: [
      {
        personId: adarsh.id,
        organName: 'Heart',
        departmentName: 'Cardiology',
        recordType: 'TEST_REPORT',
        testCategory: 'ECG_ECHO',
        testName: '12-Lead Electrocardiogram & 2D Doppler Echo',
        testDate: '2026-06-12',
        labName: 'Apollo Speciality Hospital Diagnostics',
        resultsSummary: 'Normal sinus rhythm, HR 72 bpm. Left ventricular ejection fraction (LVEF) 64%. No regional wall motion abnormalities.',
        status: 'NORMAL',
        attachments: JSON.stringify([
          { name: 'ECG_Echo_Report_2026.pdf', size: '1.8 MB', type: 'application/pdf' },
        ]),
      },
      {
        personId: adarsh.id,
        organName: 'Heart',
        departmentName: 'Cardiology',
        recordType: 'TEST_REPORT',
        testCategory: 'BLOOD_TEST',
        testName: 'Advanced Lipid Profile & Cardiac Biomarkers',
        testDate: '2026-06-10',
        labName: 'Dr. Lal PathLabs',
        resultsSummary: 'Total Cholesterol: 172 mg/dL, HDL: 52 mg/dL, LDL: 98 mg/dL, Triglycerides: 110 mg/dL (All within optimal reference range).',
        status: 'NORMAL',
        attachments: JSON.stringify([
          { name: 'Lipid_Panel_Certified.pdf', size: '950 KB', type: 'application/pdf' },
        ]),
      },
      {
        personId: adarsh.id,
        organName: 'Heart',
        departmentName: 'Cardiology',
        recordType: 'DOCTOR_CONSULTATION',
        doctorName: 'Dr. Rajesh Sharma',
        doctorTitle: 'MD, DM (Cardiology), FACC',
        hospitalName: 'Apollo Hospitals & Heart Institute',
        contactPhone: '+91 98450 12345',
        consultDate: '2026-06-15',
        followUpDate: '2027-06-15',
        diagnosis: 'Routine Executive Cardiac Clearance — Healthy Cardiovascular Profile',
        prescription: '1. Tab Multivitamin with Zinc — 1 tab OD after breakfast for 30 days\n2. Continue regular 45 mins brisk cardio exercise\n3. Maintain adequate hydration & balanced sodium intake',
      },
      {
        personId: adarsh.id,
        organName: 'Lungs',
        departmentName: 'Pulmonology',
        recordType: 'TEST_REPORT',
        testCategory: 'X_RAY',
        testName: 'Digital Chest X-Ray (PA View)',
        testDate: '2026-05-18',
        labName: 'Aster Medcity Radiology Dept',
        resultsSummary: 'Bilateral lung fields clear. No focal consolidation, pneumothorax, or pleural effusion. Normal broncho-vascular markings.',
        status: 'NORMAL',
        attachments: JSON.stringify([
          { name: 'Chest_XRay_Digital_PA.jpg', size: '3.4 MB', type: 'image/jpeg' },
        ]),
      },
    ],
  });

  // Sample Records for Vishnu - Bones / Orthopedics & General Medicine
  await prisma.healthRecord.createMany({
    data: [
      {
        personId: vishnu.id,
        organName: 'Bones',
        departmentName: 'Orthopedics',
        recordType: 'TEST_REPORT',
        testCategory: 'MRI_CT',
        testName: 'Right Knee High-Resolution MRI',
        testDate: '2026-07-02',
        labName: 'Manipal Hospital Imaging Center',
        resultsSummary: 'Intact anterior and posterior cruciate ligaments. Mild grade 1 medial meniscus strain without tear. Joint effusion absent.',
        status: 'NORMAL',
        attachments: JSON.stringify([
          { name: 'Right_Knee_MRI_Scan.pdf', size: '4.2 MB', type: 'application/pdf' },
        ]),
      },
      {
        personId: vishnu.id,
        organName: 'Bones',
        departmentName: 'Orthopedics',
        recordType: 'DOCTOR_CONSULTATION',
        doctorName: 'Dr. Anita Desai',
        doctorTitle: 'MS (Orthopedics), M.Ch (Joint Reconstruction)',
        hospitalName: 'Manipal Hospital Orthopedic Center',
        contactPhone: '+91 98200 67890',
        consultDate: '2026-07-05',
        followUpDate: '2026-10-05',
        diagnosis: 'Mild Muscular Strain & Patellar Tendon Overuse (Sports related)',
        prescription: '1. Tab Glucosamine + MSM — 1 tab OD for 60 days\n2. Quadriceps strengthening exercises & Physiotherapy sessions twice a week\n3. Cold compression post physical activities',
      },
      {
        personId: vishnu.id,
        organName: 'Blood',
        departmentName: 'General Medicine',
        recordType: 'TEST_REPORT',
        testCategory: 'BLOOD_TEST',
        testName: 'Complete Blood Count (CBC) & Serum Ferritin',
        testDate: '2026-08-01',
        labName: 'Metropolis Healthcare Labs',
        resultsSummary: 'Hemoglobin: 15.2 g/dL, WBC: 7,400 /mcL, Platelets: 280,000 /mcL. Normal indices.',
        status: 'NORMAL',
        attachments: JSON.stringify([
          { name: 'CBC_Report_Metropolis.pdf', size: '1.1 MB', type: 'application/pdf' },
        ]),
      },
    ],
  });
}

/**
 * Get all health persons
 */
export async function getHealthPersons(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id!;
    await ensureSeedPersons(userId);

    const persons = await prisma.healthPerson.findMany({
      include: {
        records: {
          select: {
            id: true,
            organName: true,
            departmentName: true,
            recordType: true,
            testCategory: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const enriched = persons.map((p) => {
      const testCount = p.records.filter((r) => r.recordType === 'TEST_REPORT').length;
      const doctorCount = p.records.filter((r) => r.recordType === 'DOCTOR_CONSULTATION').length;
      const uniqueOrgans = Array.from(new Set(p.records.map((r) => r.organName)));

      return {
        ...p,
        totalTests: testCount,
        totalDoctors: doctorCount,
        activeOrgans: uniqueOrgans,
      };
    });

    return res.json(enriched);
  } catch (error: any) {
    console.error('[getHealthPersons] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch health persons' });
  }
}

/**
 * Create a new health person
 */
export async function createHealthPerson(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id!;
    const { name, relationship, gender, dob, bloodGroup, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Person name is required' });
    }

    const newPerson = await prisma.healthPerson.create({
      data: {
        name: name.trim(),
        relationship: relationship || 'Family',
        gender: gender || 'Male',
        dob: dob || null,
        bloodGroup: bloodGroup || null,
        notes: notes || null,
        ownerId: userId,
      },
    });

    await logAuditEvent({
      eventType: 'HEALTH_PERSON_CREATED',
      severity: 'INFO',
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      targetType: 'HealthPerson',
      targetId: newPerson.id,
      metadata: { name: newPerson.name, relationship: newPerson.relationship },
    });

    return res.status(201).json(newPerson);
  } catch (error: any) {
    console.error('[createHealthPerson] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create health person' });
  }
}

/**
 * Delete a health person and all associated medical records
 */
export async function deleteHealthPerson(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const person = await prisma.healthPerson.findUnique({ where: { id } });
    if (!person) {
      return res.status(404).json({ error: 'Health person profile not found' });
    }

    await prisma.healthPerson.delete({ where: { id } });

    await logAuditEvent({
      eventType: 'HEALTH_PERSON_DELETED',
      severity: 'WARNING',
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      targetType: 'HealthPerson',
      targetId: id,
      metadata: { deletedName: person.name },
    });

    return res.json({ success: true, message: `Profile for ${person.name} deleted successfully` });
  } catch (error: any) {
    console.error('[deleteHealthPerson] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete health person' });
  }
}

/**
 * Get health records for a person, with optional filtering
 */
export async function getHealthRecords(req: AuthenticatedRequest, res: Response) {
  try {
    const { personId } = req.params;
    const { organName, departmentName, recordType, testCategory } = req.query;

    const whereClause: any = { personId };

    if (organName && typeof organName === 'string') {
      whereClause.organName = organName;
    }
    if (departmentName && typeof departmentName === 'string') {
      whereClause.departmentName = departmentName;
    }
    if (recordType && typeof recordType === 'string') {
      whereClause.recordType = recordType;
    }
    if (testCategory && typeof testCategory === 'string') {
      whereClause.testCategory = testCategory;
    }

    const records = await prisma.healthRecord.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const parsedRecords = records.map((r) => {
      let attachmentsList = [];
      try {
        attachmentsList = JSON.parse(r.attachments || '[]');
      } catch (e) {
        attachmentsList = [];
      }
      return {
        ...r,
        attachments: attachmentsList,
      };
    });

    return res.json(parsedRecords);
  } catch (error: any) {
    console.error('[getHealthRecords] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch health records' });
  }
}

/**
 * Create a new health record (Test Report or Doctor Consultation)
 */
export async function createHealthRecord(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      personId,
      organName,
      departmentName,
      recordType,
      // Test report fields
      testCategory,
      testName,
      testDate,
      labName,
      resultsSummary,
      status,
      attachments,
      // Doctor fields
      doctorName,
      doctorTitle,
      hospitalName,
      contactPhone,
      consultDate,
      followUpDate,
      diagnosis,
      prescription,
    } = req.body;

    if (!personId || !organName || !departmentName || !recordType) {
      return res.status(400).json({ error: 'Person, Organ, Department, and Record Type are required' });
    }

    const attachmentsStr = Array.isArray(attachments)
      ? JSON.stringify(attachments)
      : typeof attachments === 'string'
      ? attachments
      : '[]';

    const newRecord = await prisma.healthRecord.create({
      data: {
        personId,
        organName,
        departmentName,
        recordType,
        testCategory: testCategory || null,
        testName: testName || null,
        testDate: testDate || new Date().toISOString().split('T')[0],
        labName: labName || null,
        resultsSummary: resultsSummary || null,
        status: status || 'NORMAL',
        attachments: attachmentsStr,
        doctorName: doctorName || null,
        doctorTitle: doctorTitle || null,
        hospitalName: hospitalName || null,
        contactPhone: contactPhone || null,
        consultDate: consultDate || null,
        followUpDate: followUpDate || null,
        diagnosis: diagnosis || null,
        prescription: prescription || null,
      },
    });

    await logAuditEvent({
      eventType: recordType === 'TEST_REPORT' ? 'HEALTH_TEST_REPORT_ADDED' : 'HEALTH_DOCTOR_CONSULTATION_ADDED',
      severity: 'INFO',
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      targetType: 'HealthRecord',
      targetId: newRecord.id,
      metadata: {
        organ: organName,
        department: departmentName,
        title: testName || doctorName,
      },
    });

    let parsedAttachments = [];
    try {
      parsedAttachments = JSON.parse(newRecord.attachments || '[]');
    } catch (e) {}

    return res.status(201).json({
      ...newRecord,
      attachments: parsedAttachments,
    });
  } catch (error: any) {
    console.error('[createHealthRecord] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create health record' });
  }
}

/**
 * Update an existing health record
 */
export async function updateHealthRecord(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.healthRecord.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Health record not found' });
    }

    const {
      testName,
      testDate,
      labName,
      resultsSummary,
      status,
      attachments,
      doctorName,
      doctorTitle,
      hospitalName,
      contactPhone,
      consultDate,
      followUpDate,
      diagnosis,
      prescription,
    } = req.body;

    const attachmentsStr = attachments
      ? Array.isArray(attachments)
        ? JSON.stringify(attachments)
        : attachments
      : existing.attachments;

    const updated = await prisma.healthRecord.update({
      where: { id },
      data: {
        ...(testName !== undefined && { testName }),
        ...(testDate !== undefined && { testDate }),
        ...(labName !== undefined && { labName }),
        ...(resultsSummary !== undefined && { resultsSummary }),
        ...(status !== undefined && { status }),
        ...(attachmentsStr !== undefined && { attachments: attachmentsStr }),
        ...(doctorName !== undefined && { doctorName }),
        ...(doctorTitle !== undefined && { doctorTitle }),
        ...(hospitalName !== undefined && { hospitalName }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(consultDate !== undefined && { consultDate }),
        ...(followUpDate !== undefined && { followUpDate }),
        ...(diagnosis !== undefined && { diagnosis }),
        ...(prescription !== undefined && { prescription }),
      },
    });

    let parsedAttachments = [];
    try {
      parsedAttachments = JSON.parse(updated.attachments || '[]');
    } catch (e) {}

    return res.json({
      ...updated,
      attachments: parsedAttachments,
    });
  } catch (error: any) {
    console.error('[updateHealthRecord] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update health record' });
  }
}

/**
 * Delete a health record
 */
export async function deleteHealthRecord(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.healthRecord.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Health record not found' });
    }

    await prisma.healthRecord.delete({ where: { id } });

    await logAuditEvent({
      eventType: 'HEALTH_RECORD_DELETED',
      severity: 'INFO',
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      targetType: 'HealthRecord',
      targetId: id,
      metadata: { organ: existing.organName, department: existing.departmentName },
    });

    return res.json({ success: true, message: 'Health record deleted' });
  } catch (error: any) {
    console.error('[deleteHealthRecord] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete health record' });
  }
}

/**
 * Get a single health record by ID with person details
 */
export async function getSingleHealthRecord(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const record = await prisma.healthRecord.findUnique({
      where: { id },
      include: {
        person: true,
      },
    });

    if (!record) {
      return res.status(404).json({ error: 'Health record not found' });
    }

    let parsedAttachments = [];
    try {
      parsedAttachments = JSON.parse(record.attachments || '[]');
    } catch (e) {
      parsedAttachments = [];
    }

    return res.json({
      ...record,
      attachments: parsedAttachments,
    });
  } catch (error: any) {
    console.error('[getSingleHealthRecord] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch record' });
  }
}
