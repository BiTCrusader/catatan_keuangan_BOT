import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

export async function dedupMiddleware(ctx, next) {
  const updateId = ctx.update?.update_id ? String(ctx.update.update_id) : null;

  if (!updateId) {
    return await next();
  }

  try {
    // Attempt to record the updateId atomically
    // Using upsert or create with catch unique constraint
    const existing = await prisma.processedTelegramUpdate.findUnique({
      where: { updateId },
    });

    if (existing) {
      logger.info(`Duplicate Telegram update detected and skipped: ${updateId}`);
      return; // Already processed!
    }

    await prisma.processedTelegramUpdate.create({
      data: { updateId },
    });

    return await next();
  } catch (error) {
    // If unique constraint violation occurred concurrently
    if (error.code === 'P2002') {
      logger.info(`Duplicate Telegram update collision skipped: ${updateId}`);
      return;
    }
    logger.error('Error in dedupMiddleware:', error.message);
    // Continue processing if dedup table issue occurs so we don't block user
    return await next();
  }
}
