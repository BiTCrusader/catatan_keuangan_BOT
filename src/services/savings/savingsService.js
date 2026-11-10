import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import { formatIDR } from '../../utils/currency.js';
import { escapeHtml } from '../../utils/format.js';

export const savingsService = {
  /**
   * Create a new savings goal
   */
  async createGoal(userId, { name, targetAmount, deadline }) {
    const target = new Prisma.Decimal(targetAmount);

    return await prisma.savingsGoal.create({
      data: {
        userId,
        name,
        targetAmount: target,
        currentAmount: new Prisma.Decimal(0),
        deadline: deadline ? new Date(deadline) : null,
      },
    });
  },

  /**
   * List all goals for a user
   */
  async getGoals(userId) {
    const goals = await prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        contributions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    return goals.map((g) => {
      const target = Number(g.targetAmount);
      const current = Number(g.currentAmount);
      const remaining = Math.max(0, target - current);
      const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

      return {
        ...g,
        numericTarget: target,
        numericCurrent: current,
        remaining,
        progress,
      };
    });
  },

  /**
   * Add contribution to an existing goal
   */
  async contribute(userId, { goalId, goalName, amount, note }) {
    const numericAmount = Number(amount);
    if (numericAmount <= 0) {
      throw new Error('Nominal tabungan harus lebih besar dari 0');
    }

    let goal;
    if (goalId) {
      goal = await prisma.savingsGoal.findFirst({
        where: { id: goalId, userId },
      });
    } else if (goalName) {
      // Find goal matching name case-insensitively
      goal = await prisma.savingsGoal.findFirst({
        where: {
          userId,
          name: { contains: goalName, mode: 'insensitive' },
        },
      });
    }

    // If no specific goal found, pick first active goal
    if (!goal) {
      goal = await prisma.savingsGoal.findFirst({
        where: { userId, isCompleted: false },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!goal) {
      throw new Error('Target tabungan tidak ditemukan. Buat target terlebih dahulu!');
    }

    const contributionDecimal = new Prisma.Decimal(numericAmount);

    return await prisma.$transaction(async (tx) => {
      const contribution = await tx.savingsContribution.create({
        data: {
          savingsGoalId: goal.id,
          userId,
          amount: contributionDecimal,
          note: note || 'Setoran tabungan',
        },
      });

      const newCurrentAmount = Prisma.Decimal.add(goal.currentAmount, contributionDecimal);
      const isCompleted = newCurrentAmount.greaterThanOrEqualTo(goal.targetAmount);

      const updatedGoal = await tx.savingsGoal.update({
        where: { id: goal.id },
        data: {
          currentAmount: newCurrentAmount,
          isCompleted,
        },
      });

      return {
        contribution,
        goal: updatedGoal,
      };
    });
  },

  /**
   * Format goals into Telegram friendly message
   */
  formatGoalsMessage(goals) {
    if (!goals || goals.length === 0) {
      return (
        '🎯 <b>TARGET TABUNGAN</b>\n\n' +
        'Anda belum memiliki target tabungan.\n\n' +
        '💡 Buat sekarang dengan mengirim pesan:\n' +
        '<i>"Buat target tabungan Laptop 8 juta"</i>\n' +
        'atau klik tombol di bawah!'
      );
    }

    let msg = '🎯 <b>DAFTAR TARGET TABUNGAN ANDA</b>\n\n';
    for (const g of goals) {
      const statusIcon = g.isCompleted ? '✅' : '⏳';
      msg += `${statusIcon} <b>${escapeHtml(g.name)}</b>\n`;
      msg += `• Target: ${formatIDR(g.numericTarget)}\n`;
      msg += `• Terkumpul: ${formatIDR(g.numericCurrent)} (${g.progress}%)\n`;
      msg += `• Sisa: ${formatIDR(g.remaining)}\n`;

      // Progress bar visualization
      const filledBars = Math.round(g.progress / 10);
      const emptyBars = 10 - filledBars;
      const bar = '🟩'.repeat(filledBars) + '⬜'.repeat(emptyBars);
      msg += `[${bar}]\n\n`;
    }

    return msg;
  },
};
