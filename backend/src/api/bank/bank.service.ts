import { prisma, Prisma } from '../../lib/prisma';
import AppError from '../../utils/AppError';

interface BankAccountInput {
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  is_primary?: boolean;
}

// Add bank account
export const addBankAccount = async (sellerId: string, data: BankAccountInput) => {
  const { bank_name, account_number, ifsc_code, is_primary } = data;

  // If marking as primary, remove primary from all others
  if (is_primary) {
    await prisma.bankAccount.updateMany({
      where: { seller_id: sellerId },
      data: { is_primary: false }
    });
  }

  return prisma.bankAccount.create({
    data: {
      seller_id: sellerId,
      bank_name,
      account_number,
      ifsc_code,
      is_primary: !!is_primary
    }
  });
};

// Get all bank accounts of the seller
export const getAllBankAccounts = async (sellerId: string) => {
  return prisma.bankAccount.findMany({
    where: { seller_id: sellerId },
    orderBy: { created_at: 'desc' }
  });
};

// Get primary bank
export const getPrimaryBank = async (sellerId: string) => {
  const bank = await prisma.bankAccount.findFirst({
    where: { seller_id: sellerId, is_primary: true }
  });

  if (!bank) throw new AppError('Primary bank account not found', 404);

  return bank;
};

// Update bank account
export const updateBankAccount = async (
  sellerId: string,
  bankId: number,
  data: Partial<BankAccountInput>
) => {
  const existing = await prisma.bankAccount.findUnique({
    where: { id: bankId }
  });

  if (!existing) throw new AppError('Bank account not found', 404);
  if (existing.seller_id !== sellerId)
    throw new AppError('Unauthorized', 403);

  // Handle new primary account
  if (data.is_primary) {
    await prisma.bankAccount.updateMany({
      where: { seller_id: sellerId },
      data: { is_primary: false }
    });
  }

  return prisma.bankAccount.update({
    where: { id: bankId },
    data: data as Prisma.BankAccountUpdateInput
  });
};

// Delete bank account
export const deleteBankAccount = async (sellerId: string, bankId: number) => {
  const existing = await prisma.bankAccount.findUnique({
    where: { id: bankId }
  });

  if (!existing) throw new AppError('Bank account not found', 404);
  if (existing.seller_id !== sellerId)
    throw new AppError('Unauthorized', 403);

  await prisma.bankAccount.delete({ where: { id: bankId } });
  return { message: 'Bank account deleted successfully' };
};
export const getBankAccount = async (sellerId: string, bankId: number) => {
  const account = await prisma.bankAccount.findUnique({
    where: { id: bankId }
  });

  if (!account) throw new AppError("Bank account not found", 404);
  if (account.seller_id !== sellerId) throw new AppError("Unauthorized", 403);

  return account;
};
