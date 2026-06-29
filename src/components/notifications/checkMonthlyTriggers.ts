import { useBudgetStore } from '../../stores/budgetStore';
import { type ExpenseInterface } from '../../stores/expenseStore';
import { type IncomeInterface } from '../../stores/incomeStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { formatCurrency } from '../../utils';
import { calculateTrackingTrend } from '../../utils/budgetTrends';

export const checkMonthlyTriggers = async (
  userId: string,
  expenses: ExpenseInterface[],
  incomes: IncomeInterface[]
) => {
  const { addNotifications } = useNotificationStore.getState();
  const { notifications } = useNotificationStore.getState();
  const { budgets } = useBudgetStore.getState();

  const now = new Date();
  
  // Helper to prevent duplicates on the same day
  const isSentToday = (msgContent: string) => {
    return notifications.some(n => 
      n.message.includes(msgContent) && 
      new Date(n.date).toDateString() === now.toDateString()
    );
  };
  const month = now.getMonth();
  const year = now.getFullYear();
  const day = now.getDate();

  // Mois précédent (pour le résumé du 1er du mois)
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;

  // Filtrage des données du mois courant (pour les notifs de mi-mois, top cat, etc.)
  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const currentMonthIncomes = incomes.filter(i => {
    const d = new Date(i.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const totalExpenses = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncomes = currentMonthIncomes.reduce((sum, i) => sum + i.amount, 0);

  // Filtrage des données du mois précédent (pour le résumé du 1er)
  const prevMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });
  const prevMonthIncomes = incomes.filter(i => {
    const d = new Date(i.date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });

  const prevTotalExpenses = prevMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const prevTotalIncomes = prevMonthIncomes.reduce((sum, i) => sum + i.amount, 0);

  // Résumé mensuel intermédiaire (le 15, seulement si activité)
  if (day === 15 && (totalExpenses > 0 || totalIncomes > 0)) {
    const monthName = now.toLocaleString('fr-FR', { month: 'long' });
    const balance = totalIncomes - totalExpenses;
    const midSummary = `📊 Résumé mi-${monthName}: ${formatCurrency(totalExpenses)} de dépenses, ${formatCurrency(totalIncomes)} de revenus. Solde: ${formatCurrency(balance)} ${balance >= 0 ? '✅' : '⚠️'}`;

    if (!isSentToday(`Résumé mi-${monthName}`)) {
      await addNotifications(userId, {
        message: midSummary,
        type: 'alert',
        date: now.toISOString(),
        read: false,
      });
    }
  }

  // Rappel d'inactivité (le 15)
  if (day === 15 && totalIncomes === 0 && totalExpenses === 0) {
    const midMonthReminder = `Aucune activité détectée ce mois-ci. N'oubliez pas de saisir vos revenus ou dépenses.`;
    if (!isSentToday("Aucune activité détectée ce mois-ci")) {
      await addNotifications(userId, {
        message: midMonthReminder,
        type: 'alert',
        date: now.toISOString(),
        read: false,
      });
    }
  }

  // ✅ Résumé mensuel final (le 1er du mois suivant = bilan du mois écoulé)
  if (day === 1 && (prevTotalExpenses > 0 || prevTotalIncomes > 0)) {
    const prevMonthName = new Date(prevYear, prevMonth, 1).toLocaleString('fr-FR', {
      month: 'long',
    });

    if (isSentToday(`Résumé final de ${prevMonthName}`)) {
      return; // Stop tout le bloc du résumé final
    }

    const finalSummary = `Résumé final de ${prevMonthName} : ${formatCurrency(prevTotalExpenses)} de dépenses, ${formatCurrency(prevTotalIncomes)} de revenus.`;

    await addNotifications(userId, {
      message: finalSummary,
      type: 'alert',
      date: now.toISOString(),
      read: false,
    });

    // Résumé par type de budget
    const cappedBudgets = budgets.filter(b => b.type === 'capped');
    const savingsBudgets = budgets.filter(b => b.type === 'savings');
    const trackingBudgets = budgets.filter(b => b.type === 'tracking');
    console.log({ cappedBudgets, savingsBudgets, trackingBudgets });

    // Résumé budgets plafonnés (basé sur mois précédent)
    if (cappedBudgets.length > 0) {
      const budgetSummary = cappedBudgets
        .map(budget => {
          const spent = prevMonthExpenses
            .filter(e => e.budget === budget.id)
            .reduce((sum, e) => sum + e.amount, 0);
          const added = prevMonthIncomes
            .filter(i => i.budget === budget.id)
            .reduce((sum, i) => sum + i.amount, 0);
          const netSpent = spent - added;
          const limit = budget.amount || 0;
          const percentage = limit > 0 ? (netSpent / limit) * 100 : 0;
          const status =
            percentage > 100 ? '⚠️ Dépassé' : percentage > 80 ? '⚠️ Limite proche' : '✅ Respecté';
          return `${budget.name}: ${status} (${percentage.toFixed(0)}%)`;
        })
        .join(', ');

      await addNotifications(userId, {
        message: `📊 Bilan des plafonds (${prevMonthName}) : ${budgetSummary}`,
        type: 'alert',
        date: now.toISOString(),
        read: false,
      });
    }

    // Résumé budgets épargne (basé sur mois précédent)
    if (savingsBudgets.length > 0) {
      for (const budget of savingsBudgets) {
        const savedIncomes = prevMonthIncomes
          .filter(i => i.budget === budget.id)
          .reduce((sum, i) => sum + i.amount, 0);
        const savedExpenses = prevMonthExpenses
          .filter(e => e.budget === budget.id)
          .reduce((sum, e) => sum + e.amount, 0);
        const netSaved = savedIncomes - savedExpenses;
        const goal = budget.amount || 0;
        const percentage = goal > 0 ? Math.min((netSaved / goal) * 100, 100) : 0;
        const status =
          netSaved >= goal
            ? `🎉 Objectif atteint ! (${formatCurrency(netSaved)} / ${formatCurrency(goal)})`
            : `💰 ${formatCurrency(netSaved)} épargnés sur ${formatCurrency(goal)} (${percentage.toFixed(0)}%)`;

        await addNotifications(userId, {
          message: `🏦 Épargne ${prevMonthName} • ${budget.name} : ${status}`,
          type: 'income',
          date: now.toISOString(),
          read: false,
        });
      }
    }

    // Résumé catégories de suivi avec tendances (basé sur mois précédent)
    if (trackingBudgets.length > 0) {
      for (const budget of trackingBudgets) {
        const trend = calculateTrackingTrend(budget.id, expenses, prevMonth, prevYear);
        if (trend.currentMonth > 0) {
          const trendText =
            trend.trend === 'up'
              ? '📈 en hausse'
              : trend.trend === 'down'
                ? '📉 en baisse'
                : '➡️ stable';
          await addNotifications(userId, {
            message: `📝 Suivi ${prevMonthName} • ${budget.name} : ${formatCurrency(trend.currentMonth)} (${trendText})`,
            type: 'expense',
            date: now.toISOString(),
            read: false,
          });
        }
      }
    }

    // Notif rapport disponible
    const reportMessage = `Votre rapport PDF pour ${prevMonthName} est disponible dans le tableau de bord.`;
    await addNotifications(userId, {
      message: reportMessage,
      type: 'alert',
      date: now.toISOString(),
      read: false,
    });
  }

  // Catégorie dominante (le 20)
  const categories: Record<string, number> = {};
  currentMonthExpenses.forEach(e => {
    categories[e.name] = (categories[e.name] || 0) + e.amount;
  });
  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];

  if (day === 20 && topCategory) {
    const categoryMessage = `Vous avez principalement dépensé dans ${topCategory[0]} ce mois-ci.`;
    if (!isSentToday("principalement dépensé dans")) {
      await addNotifications(userId, {
        message: categoryMessage,
        type: 'expense',
        date: now.toISOString(),
        read: false,
      });
    }
  }

  // Rappel le 1er si aucun revenu
  if (day === 1 && totalIncomes === 0) {
    const reminderMessage = `N’oubliez pas d’ajouter vos revenus mensuels pour ${now.toLocaleString(
      'fr-FR',
      { month: 'long' }
    )}.`;
    if (!isSentToday("vos revenus mensuels pour")) {
      await addNotifications(userId, {
        message: reminderMessage,
        type: 'income',
        date: now.toISOString(),
        read: false,
      });
    }
  }

  // Rappel le 1er si aucune dépense
  if (day === 1 && totalExpenses === 0) {
    const reminderMessage = `N’oubliez pas d’ajouter vos dépenses tout au long du mois de ${now.toLocaleString(
      'fr-FR',
      { month: 'long' }
    )}.`;
    if (!isSentToday("vos dépenses tout au long du mois")) {
      await addNotifications(userId, {
        message: reminderMessage,
        type: 'expense',
        date: now.toISOString(),
        read: false,
      });
    }
  }
};
