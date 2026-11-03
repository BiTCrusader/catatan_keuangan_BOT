import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';

export const transactionService = {
  /**
   * Retrieves or creates a user by telegramId
   */
  async getOrCreateUser(telegramId, profile = {}) {
    const stringId = String(telegramId);
    let user = await prisma.user.findUnique({
      where: { telegramId: stringId },
      include: { settings: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: stringId,
          username: profile.username || null,
          firstName: profile.firstName || null,
          lastName: profile.lastName || null,
          settings: {
            create: {
              timezone: 'Asia/Makassar',
              currency: 'IDR',
            },
          },
        },
        include: { settings: true },
      });
    }

    return user;
  },

  /**
   * Set or update user initial balance
   */
  async setInitialBalance(userId, amount) {
    const decimalAmount = new Prisma.Decimal(amount);
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        initialBalance: decimalAmount,
        isRegistered: true,
      },
    });
    return updatedUser;
  },

  /**
   * Calculates the exact user balance using atomic database aggregation:
   * currentBalance = initialBalance + totalIncome - totalExpense
   */
  async getBalance(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { initialBalance: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const incomeAgg = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'INCOME',
        isDeleted: false,
      },
      _sum: {
        amount: true,
      },
    });

    const expenseAgg = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'EXPENSE',
        isDeleted: false,
      },
      _sum: {
        amount: true,
      },
    });

    const initial = user.initialBalance ? Number(user.initialBalance) : 0;
    const totalIncome = incomeAgg._sum.amount ? Number(incomeAgg._sum.amount) : 0;
    const totalExpense = expenseAgg._sum.amount ? Number(expenseAgg._sum.amount) : 0;
    const currentBalance = initial + totalIncome - totalExpense;

    return {
      initialBalance: initial,
      totalIncome,
      totalExpense,
      currentBalance,
    };
  },

  /**
   * Creates a new financial transaction (INCOME or EXPENSE) inside a DB transaction
   */
  async createTransaction({ userId, type, category, amount, description, transactionDate }) {
    if (!amount || Number(amount) <= 0) {
      throw new Error('Nominal transaksi harus lebih besar dari 0');
    }

    const decimalAmount = new Prisma.Decimal(amount);
    const date = transactionDate ? new Date(transactionDate) : new Date();

    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type,
          category: category || 'LAIN_LAIN',
          amount: decimalAmount,
          description: description || (type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'),
          transactionDate: date,
        },
      });

      return transaction;
    });
  },

  /**
   * Fetches paginated transaction history
   */
  async getHistory(userId, { page = 1, limit = 5 } = {}) {
    const skip = (page - 1) * limit;

    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId,
          isDeleted: false,
        },
        orderBy: {
          transactionDate: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.transaction.count({
        where: {
          userId,
          isDeleted: false,
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      transactions,
      page,
      limit,
      totalCount,
      totalPages,
    };
  },

  /**
   * Get single transaction by ID ensuring ownership
   */
  async getTransactionById(transactionId, userId) {
    return await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });
  },

  /**
   * Update transaction details
   */
  async updateTransaction(transactionId, userId, data) {
    const existing = await this.getTransactionById(transactionId, userId);
    if (!existing) {
      throw new Error('Transaksi tidak ditemukan atau Anda tidak memiliki akses');
    }

    const updatePayload = {};
    if (data.amount !== undefined) updatePayload.amount = new Prisma.Decimal(data.amount);
    if (data.category !== undefined) updatePayload.category = data.category;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.transactionDate !== undefined) updatePayload.transactionDate = new Date(data.transactionDate);

    return await prisma.transaction.update({
      where: { id: transactionId },
      data: updatePayload,
    });
  },

  /**
   * Soft-delete / cancel a transaction
   */
  async deleteTransaction(transactionId, userId) {
    const existing = await this.getTransactionById(transactionId, userId);
    if (!existing) {
      throw new Error('Transaksi tidak ditemukan atau Anda tidak memiliki akses');
    }

    return await prisma.transaction.update({
      where: { id: transactionId },
      data: { isDeleted: true },
    });
  },
};
