import { savingsService } from '../../services/savings/savingsService.js';
import { menuKeyboards } from '../keyboards/menuKeyboards.js';

export async function handleTabungan(ctx) {
  const user = ctx.state.user;
  const goals = await savingsService.getGoals(user.id);
  const text = savingsService.formatGoalsMessage(goals);

  return await ctx.reply(text, {
    parse_mode: 'HTML',
    ...menuKeyboards.savingsMenu(),
  });
}
