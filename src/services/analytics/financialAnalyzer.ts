import { useBudgetStore } from '../../stores/budgetStore';
import { useExpenseStore } from '../../stores/expenseStore';
import { useIncomeStore } from '../../stores/incomeStore';
import type { Opportunity, Pattern, Prediction, TrendAnalysis } from '../../types/agent';
import { formatCurrency } from '../../utils';

/**
 * Calcule les tendances de dépenses sur plusieurs mois
 */
export const calculateTrends = (months: number = 3): TrendAnalysis => {
  const expenseStore = useExpenseStore.getState();
  const budgetStore = useBudgetStore.getState();
  const expenses = expenseStore.expenses;
  const budgets = budgetStore.budgets;

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Calculer les dépenses du mois en cours
  const currentMonthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  });
  const currentTotal = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Calculer la moyenne des mois précédents
  let totalPreviousMonths = 0;
  let countMonths = 0;

  for (let i = 1; i <= months; i++) {
    let month = currentMonth - i;
    let year = currentYear;

    if (month < 0) {
      month += 12;
      year -= 1;
    }

    const monthExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === month && expDate.getFullYear() === year;
    });

    totalPreviousMonths += monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    countMonths++;
  }

  const avgPrevious = countMonths > 0 ? totalPreviousMonths / countMonths : 0;

  // Calculer la tendance globale
  let overall: 'increasing' | 'decreasing' | 'stable' = 'stable';
  let percentage = 0;

  if (avgPrevious > 0) {
    percentage = Math.round(((currentTotal - avgPrevious) / avgPrevious) * 100);

    if (percentage > 10) {
      overall = 'increasing';
    } else if (percentage < -10) {
      overall = 'decreasing';
    }
  }

  // Tendances par catégorie
  const byCategory: Record<string, any> = {};

  budgets.forEach(budget => {
    const currentCategoryExpenses = currentMonthExpenses.filter(exp => exp.budget === budget.id);
    const currentCategoryTotal = currentCategoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Moyenne des mois précédents pour cette catégorie
    let totalPreviousCat = 0;
    let countCat = 0;

    for (let i = 1; i <= months; i++) {
      let month = currentMonth - i;
      let year = currentYear;

      if (month < 0) {
        month += 12;
        year -= 1;
      }

      const monthCatExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return (
          exp.budget === budget.id && expDate.getMonth() === month && expDate.getFullYear() === year
        );
      });

      totalPreviousCat += monthCatExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      countCat++;
    }

    const avgPreviousCat = countCat > 0 ? totalPreviousCat / countCat : 0;
    let catPercentage = 0;
    let direction: 'up' | 'down' | 'stable' = 'stable';

    if (avgPreviousCat > 0) {
      catPercentage = Math.round(((currentCategoryTotal - avgPreviousCat) / avgPreviousCat) * 100);

      if (catPercentage > 10) {
        direction = 'up';
      } else if (catPercentage < -10) {
        direction = 'down';
      }
    }

    byCategory[budget.name] = {
      direction,
      percentage: catPercentage,
      comparison: `${formatCurrency(currentCategoryTotal)} ce mois vs ${formatCurrency(Math.round(avgPreviousCat))} en moyenne`,
    };
  });

  return {
    overall,
    percentage,
    byCategory,
  };
};

/**
 * Détecte les patterns de dépenses
 */
export const detectSpendingPatterns = (): Pattern[] => {
  const expenseStore = useExpenseStore.getState();
  const budgetStore = useBudgetStore.getState();
  const expenses = expenseStore.expenses;
  const budgets = budgetStore.budgets;

  const patterns: Pattern[] = [];
  const currentDate = new Date();

  // Détecter les dépenses récurrentes (même nom, montant similaire)
  const expensesByName: Record<string, any[]> = {};
  expenses.forEach(exp => {
    const key = exp.name.toLowerCase();
    if (!expensesByName[key]) {
      expensesByName[key] = [];
    }
    expensesByName[key].push(exp);
  });

  Object.entries(expensesByName).forEach(([name, exps]) => {
    if (exps.length >= 3) {
      // Vérifier si les montants sont similaires (±20%)
      const amounts = exps.map(e => e.amount);
      const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      const similar = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.2);

      if (similar) {
        const budget = budgets.find(b => b.id === exps[0].budget);
        patterns.push({
          type: 'recurring',
          category: budget?.name || 'Autre',
          description: `Dépense récurrente "${name}" d'environ ${formatCurrency(Math.round(avgAmount))}`,
          frequency: `${exps.length} fois`,
          amount: avgAmount,
        });
      }
    }
  });

  // Détecter les pics de dépenses (montant inhabituel)
  budgets.forEach(budget => {
    const budgetExpenses = expenses.filter(exp => exp.budget === budget.id);
    if (budgetExpenses.length < 5) return;

    const amounts = budgetExpenses.map(e => e.amount);
    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length
    );

    // Trouver les dépenses qui dépassent 2 écarts-types
    const spikes = budgetExpenses.filter(exp => exp.amount > avgAmount + 2 * stdDev);

    spikes.forEach(spike => {
      const spikeDate = new Date(spike.date);
      const daysDiff = Math.floor(
        (currentDate.getTime() - spikeDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff <= 30) {
        patterns.push({
          type: 'spike',
          category: budget.name,
          description: `Dépense inhabituelle "${spike.name}" de ${formatCurrency(spike.amount)} (moyenne: ${formatCurrency(Math.round(avgAmount))})`,
          amount: spike.amount,
        });
      }
    });
  });

  return patterns;
};

/**
 * Identifie les opportunités d'économie
 */
export const identifySavingsOpportunities = (): Opportunity[] => {
  const budgetStore = useBudgetStore.getState();
  const expenseStore = useExpenseStore.getState();
  const budgets = budgetStore.budgets;
  const expenses = expenseStore.expenses;

  const opportunities: Opportunity[] = [];
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Analyser chaque budget
  budgets.forEach(budget => {
    // Calculer les dépenses des 3 derniers mois
    const last3MonthsExpenses: number[] = [];

    for (let i = 0; i < 3; i++) {
      let month = currentMonth - i;
      let year = currentYear;

      if (month < 0) {
        month += 12;
        year -= 1;
      }

      const monthExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return (
          exp.budget === budget.id && expDate.getMonth() === month && expDate.getFullYear() === year
        );
      });

      const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      last3MonthsExpenses.push(total);
    }

    const avgSpending = last3MonthsExpenses.reduce((sum, a) => sum + a, 0) / 3;

    // Si c'est un budget de suivi avec dépenses élevées
    if (budget.type === 'tracking' && avgSpending > 50000) {
      const suggestedTarget = Math.round(avgSpending * 0.8);
      opportunities.push({
        category: budget.name,
        currentSpending: avgSpending,
        suggestedTarget,
        potentialSavings: avgSpending - suggestedTarget,
        confidence: 0.7,
        reasoning: `Catégorie sans limite. En réduisant de 20%, vous économiseriez ${formatCurrency(avgSpending - suggestedTarget)}/mois`,
      });
    }

    // Si c'est un budget plafonné régulièrement dépassé
    if (budget.type === 'capped' && budget.amount) {
      const exceedCount = last3MonthsExpenses.filter(exp => exp > (budget.amount || 0)).length;

      if (exceedCount >= 2) {
        const suggestedTarget = Math.round(avgSpending * 1.1);
        opportunities.push({
          category: budget.name,
          currentSpending: avgSpending,
          suggestedTarget,
          potentialSavings: 0,
          confidence: 0.9,
          reasoning: `Budget régulièrement dépassé (${exceedCount}/3 mois). Augmentez le plafond à ${formatCurrency(suggestedTarget)} ou réduisez vos dépenses`,
        });
      }
    }

    // Si c'est un budget épargne en retard sur son objectif
    if (budget.type === 'savings' && budget.amount) {
      const incomeStore = useIncomeStore.getState();
      const totalSavedIncomes = incomeStore.incomes
        .filter(inc => inc.budget === budget.id)
        .reduce((sum, inc) => sum + inc.amount, 0);
      const totalSavedExpenses = expenses
        .filter(exp => exp.budget === budget.id)
        .reduce((sum, exp) => sum + exp.amount, 0);
      const netSaved = totalSavedIncomes - totalSavedExpenses;
      const goal = budget.amount;
      const progress = goal > 0 ? (netSaved / goal) * 100 : 0;

      if (progress < 50) {
        const monthlyNeeded = Math.round((goal - netSaved) / 3);
        opportunities.push({
          category: budget.name,
          currentSpending: netSaved,
          suggestedTarget: monthlyNeeded,
          potentialSavings: goal - netSaved,
          confidence: 0.8,
          reasoning: `Épargne "${budget.name}" à ${Math.round(progress)}% de l'objectif. Épargnez ${formatCurrency(monthlyNeeded)}/mois pour atteindre ${formatCurrency(goal)} d'ici 3 mois`,
        });
      }
    }
  });

  return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
};

/**
 * Prédit la situation en fin de mois
 */
export const predictMonthEnd = (): Prediction => {
  const expenseStore = useExpenseStore.getState();
  const incomeStore = useIncomeStore.getState();
  const budgetStore = useBudgetStore.getState();

  const expenses = expenseStore.expenses;
  const incomes = incomeStore.incomes;
  const budgets = budgetStore.budgets;

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const dayOfMonth = currentDate.getDate();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Dépenses et revenus du mois en cours
  const currentMonthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  });

  const currentMonthIncomes = incomes.filter(inc => {
    const incDate = new Date(inc.date);
    return incDate.getMonth() === currentMonth && incDate.getFullYear() === currentYear;
  });

  const currentExpensesTotal = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const currentIncomesTotal = currentMonthIncomes.reduce((sum, inc) => sum + inc.amount, 0);

  // Calculer le rythme de dépense
  const dailyRate = dayOfMonth > 0 ? currentExpensesTotal / dayOfMonth : 0;
  const daysRemaining = totalDaysInMonth - dayOfMonth;
  const estimatedEndOfMonthExpenses = currentExpensesTotal + dailyRate * daysRemaining;

  // Revenus estimés (on suppose qu'ils ne changeront pas beaucoup)
  const estimatedBalance = currentIncomesTotal - estimatedEndOfMonthExpenses;

  // Budgets à risque
  const budgetsAtRisk: string[] = [];

  budgets.forEach(budget => {
    // Budget plafonné : risque de dépassement
    if (budget.type === 'capped' && budget.amount) {
      const budgetExpenses = currentMonthExpenses.filter(exp => exp.budget === budget.id);
      const currentSpent = budgetExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const budgetDailyRate = dayOfMonth > 0 ? currentSpent / dayOfMonth : 0;
      const estimatedTotal = currentSpent + budgetDailyRate * daysRemaining;

      if (estimatedTotal > budget.amount) {
        budgetsAtRisk.push(budget.name);
      }
    }

    // Budget épargne : risque de ne pas atteindre l'objectif ce mois
    if (budget.type === 'savings' && budget.amount) {
      const incomeStore = useIncomeStore.getState();
      const savedIncomes = incomeStore.incomes
        .filter(
          inc =>
            inc.budget === budget.id &&
            (() => {
              const d = new Date(inc.date);
              return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })()
        )
        .reduce((sum, inc) => sum + inc.amount, 0);
      const savedExpenses = currentMonthExpenses
        .filter(exp => exp.budget === budget.id)
        .reduce((sum, exp) => sum + exp.amount, 0);
      const netSaved = savedIncomes - savedExpenses;
      const progress = (netSaved / budget.amount) * 100;

      // À risque si moins de 50% de l'objectif atteint et il reste peu de jours
      if (progress < 50 && daysRemaining < 10) {
        budgetsAtRisk.push(`${budget.name} (épargne)`);
      }
    }
  });

  // Confiance basée sur la régularité des dépenses
  const confidence = dayOfMonth > 15 ? 0.8 : 0.6;

  return {
    estimatedEndOfMonthExpenses: Math.round(estimatedEndOfMonthExpenses),
    estimatedBalance: Math.round(estimatedBalance),
    budgetsAtRisk,
    confidence,
    projectedDate: new Date(currentYear, currentMonth + 1, 0),
  };
};

/**
 * Compare deux périodes
 */
export const comparePeriods = (
  period1Start: Date,
  period1End: Date,
  period2Start: Date,
  period2End: Date
): any => {
  const expenseStore = useExpenseStore.getState();
  const expenses = expenseStore.expenses;

  const period1Expenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate >= period1Start && expDate <= period1End;
  });

  const period2Expenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate >= period2Start && expDate <= period2End;
  });

  const total1 = period1Expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const total2 = period2Expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const difference = total2 - total1;
  const percentageChange = total1 > 0 ? Math.round((difference / total1) * 100) : 0;

  return {
    period1: {
      start: period1Start,
      end: period1End,
      total: total1,
      count: period1Expenses.length,
    },
    period2: {
      start: period2Start,
      end: period2End,
      total: total2,
      count: period2Expenses.length,
    },
    difference,
    percentageChange,
    trend: difference > 0 ? 'increasing' : difference < 0 ? 'decreasing' : 'stable',
  };
};
