import type {BudgetAnalysis} from './budgetAnalysis';
import {formatMoney, toCents} from './money';
import type {BudgetSettings} from './types';

/** Fee reserves are not recorded spending. */
export function budgetWarning(
  analysis: BudgetAnalysis,
  settings: BudgetSettings,
) {
  const spent = toCents(analysis.totalSpent),
    budget = toCents(settings.amount);
  const level = spent >= budget ? 2 : spent >= Math.ceil(budget * 0.8) ? 1 : 0;
  if (!level) return null;
  const period = settings.period;
  const label = period[0].toUpperCase() + period.slice(1);
  return {
    level,
    start: analysis.start.getTime(),
    id: `budget-${period}-${analysis.start.getTime()}-${level}`,
    title: `${label} budget ${level === 1 ? 'running low' : 'used up'}`,
    body:
      analysis.overBudget > 0
        ? `${formatMoney(analysis.overBudget)} over budget.`
        : `${formatMoney(
            Math.max(0, analysis.remainingBudget),
          )} left · ${Math.floor(analysis.budgetUsed * 100)}% used.`,
    detail: `${formatMoney(analysis.totalSpent)} of ${formatMoney(
      settings.amount,
    )} spent.\nResets ${analysis.end.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
    })}.`,
  };
}
