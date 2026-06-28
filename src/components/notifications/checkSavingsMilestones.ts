import { type BudgetInterface } from '../../stores/budgetStore';
import { type ExpenseInterface } from '../../stores/expenseStore';
import { type IncomeInterface } from '../../stores/incomeStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { formatCurrency } from '../../utils';

/**
 * Checks if a savings budget has reached key milestones (50%, 100%)
 * Should be called after adding an income to a savings budget.
 */
export const checkSavingsMilestones = async (
  userId: string,
  budget: BudgetInterface,
  expenses: ExpenseInterface[],
  incomes: IncomeInterface[]
) => {
  if (budget.type !== 'savings' || !budget.amount) return;

  const { addNotifications } = useNotificationStore.getState();

  // Calculate current savings for this budget
  // Note: We need ALL time data for savings, not just current month,
  // unless savings are reset monthly?
  // Based on dashboardStore logic (getBudgetUsage), it filters by budgetId but doesn't seem to filter by month for the total?
  // checking dashboardStore again...
  // In dashboardStore:
  // const totalIncomes = incomes.filter((inc) => inc.budget === budget.id)...
  // It takes ALL incomes/expenses for that budget ID. So it's a cumulative lifetime goal (like "Voyage") or monthly?
  // The budget object doesn't have a date range. It seems to be cumulative.

  const totalIncomes = incomes
    .filter(inc => inc.budget === budget.id)
    .reduce((sum, inc) => sum + inc.amount, 0);

  const totalExpenses = expenses
    .filter(exp => exp.budget === budget.id)
    .reduce((sum, exp) => sum + exp.amount, 0);

  const currentSaved = totalIncomes - totalExpenses;
  const goal = budget.amount;
  const percentage = (currentSaved / goal) * 100;

  // Milestone: 100% (Success)
  if (percentage >= 100) {
    // Check if we already notified for this?
    // For simplicity, we notify. Ideally we'd store "milestone reached" in local storage or on the budget doc.
    // To avoid spam, we can check if the LAST transaction made it cross the line.
    // But since we are calling this RIGHT AFTER adding an income, it's likely relevant.
    await addNotifications(userId, {
      message: `Félicitations ! Vous avez atteint votre objectif d'épargne pour "${budget.name}" (${formatCurrency(currentSaved)}).`,
      type: 'income',
      date: new Date().toISOString(),
      read: false,
    });
  }
  // Milestone: 50% (Halfway)
  else if (percentage >= 50 && percentage < 55) {
    // Narrow range to avoid spamming if hovering around 50%
    await addNotifications(userId, {
      message: `Bravo ! Vous avez dépassé 50% de votre objectif pour "${budget.name}". Continuez comme ça !`,
      type: 'income',
      date: new Date().toISOString(),
      read: false,
    });
    // Milestone: 75% (Almost there)
  } else if (percentage >= 75 && percentage < 80) {
    // Narrow range to avoid spamming if hovering around 50%
    await addNotifications(userId, {
      message: `Bravo ! Vous avez dépassé 75% de votre objectif pour "${budget.name}". Continuez comme ça !`,
      type: 'income',
      date: new Date().toISOString(),
      read: false,
    });
  }
};
