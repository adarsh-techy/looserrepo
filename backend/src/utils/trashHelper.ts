import { prisma } from '../prisma/client';

export interface MoveToTrashParams {
  originalId: string;
  itemType: 'WORK' | 'MONEY' | 'PAYMENT' | 'BUSINESS' | 'FUTURE_PLAN' | 'DAY_TO_DAY' | 'VAULT' | 'SHARED_NOTE' | 'SECRET_NOTE' | 'DOCUMENT';
  title: string;
  subtitle?: string | null;
  deleteReason?: string | null;
  itemData: any;
  deletedById: string;
}

export async function moveToTrash({
  originalId,
  itemType,
  title,
  subtitle,
  deleteReason,
  itemData,
  deletedById,
}: MoveToTrashParams) {
  try {
    return await prisma.trashItem.create({
      data: {
        originalId,
        itemType,
        title: title || 'Untitled Item',
        subtitle: subtitle || null,
        deleteReason: deleteReason || null,
        itemData: typeof itemData === 'string' ? itemData : JSON.stringify(itemData),
        deletedById,
      },
    });
  } catch (error) {
    console.error('Failed to record trash item snapshot:', error);
    return null;
  }
}

