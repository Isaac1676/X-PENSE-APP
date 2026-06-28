import type { FinancialContext, BudgetSummary, ExpenseSummary, IncomeSummary, HistoricalData, TrendAnalysis, Alert, MonthData } from '../../types/agent';
import { useBudgetStore } from '../../stores/budgetStore';
import { useExpenseStore } from '../../stores/expenseStore';
import { useIncomeStore } from '../../stores/incomeStore';
import { formatCurrency } from '../../utils';

/**
 * Construit le contexte financier complet pour l'agent IA
 */
export const buildFinancialContext = async (): Promise<FinancialContext> => {
  const budgetStore = useBudgetStore.getState();
  const expenseStore = useExpenseStore.getState();
  const incomeStore = useIncomeStore.getState();

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const dayOfMonth = currentDate.getDate();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Récupérer les données
  const budgets = budgetStore.budgets;
  const expenses = expenseStore.expenses;
  const incomes = incomeStore.incomes;

  // Construire les résumés
  const budgetSummaries = buildBudgetSummaries(budgets, expenses, incomes);
  const expenseSummary = buildExpenseSummary(expenses, budgets, currentMonth, currentYear);
  const incomeSummary = buildIncomeSummary(incomes, budgets, currentMonth, currentYear);
  const balance = incomeSummary.total - expenseSummary.total;
  const historical = buildHistoricalData(expenses, incomes, budgets, currentMonth, currentYear);
  const trends = buildTrendAnalysis(expenseSummary, historical);
  const alerts = buildAlerts(budgetSummaries, expenseSummary, dayOfMonth, totalDaysInMonth);

  return {
    currentDate: currentDate.toLocaleDateString('fr-FR'),
    dayOfMonth,
    totalDaysInMonth,
    budgets: budgetSummaries,
    currentMonthExpenses: expenseSummary,
    currentMonthIncomes: incomeSummary,
    balance,
    historical,
    trends,
    alerts
  };
};

/**
 * Construit les résumés de budgets
 */
const buildBudgetSummaries = (budgets: any[], expenses: any[], incomes: any[]): BudgetSummary[] => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return budgets.map(budget => {
    // Calculer dépenses du mois pour ce budget
    const budgetExpenses = expenses.filter(exp => 
      exp.budget === budget.id &&
      new Date(exp.date).getMonth() === currentMonth &&
      new Date(exp.date).getFullYear() === currentYear
    );
    const spent = budgetExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Calculer revenus ajoutés du mois pour ce budget
    const budgetIncomes = incomes.filter(inc => 
      inc.budget === budget.id &&
      new Date(inc.date).getMonth() === currentMonth &&
      new Date(inc.date).getFullYear() === currentYear
    );
    const added = budgetIncomes.reduce((sum, inc) => sum + inc.amount, 0);

    let status: 'ok' | 'warning' | 'exceeded' = 'ok';
    let percentage = 0;
    let remaining = 0;

    if (budget.type === 'capped' && budget.amount) {
      const totalAvailable = budget.amount + added;
      remaining = totalAvailable - spent;
      percentage = Math.round((spent / totalAvailable) * 100);

      if (remaining < 0) {
        status = 'exceeded';
      } else if (percentage >= 80) {
        status = 'warning';
      }
    }

    return {
      id: budget.id,
      name: budget.name,
      type: budget.type,
      amount: budget.amount,
      spent,
      added,
      remaining: budget.type === 'capped' ? remaining : undefined,
      percentage: budget.type === 'capped' ? percentage : undefined,
      status
    };
  });
};

/**
 * Construit le résumé des dépenses
 */
const buildExpenseSummary = (expenses: any[], budgets: any[], month: number, year: number): ExpenseSummary => {
  const monthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === month && expDate.getFullYear() === year;
  });

  const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const count = monthExpenses.length;

  // Par catégorie
  const byCategory: Record<string, number> = {};
  monthExpenses.forEach(exp => {
    const budget = budgets.find(b => b.id === exp.budget);
    const category = budget?.name || 'Autre';
    byCategory[category] = (byCategory[category] || 0) + exp.amount;
  });

  // Top dépenses
  const topExpenses = monthExpenses
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map(exp => {
      const budget = budgets.find(b => b.id === exp.budget);
      return {
        id: exp.id,
        name: exp.name,
        amount: exp.amount,
        category: budget?.name || 'Autre',
        date: new Date(exp.date)
      };
    });

  const dayOfMonth = new Date().getDate();
  const averagePerDay = dayOfMonth > 0 ? total / dayOfMonth : 0;

  return {
    total,
    count,
    byCategory,
    topExpenses,
    averagePerDay
  };
};

/**
 * Construit le résumé des revenus
 */
const buildIncomeSummary = (incomes: any[], budgets: any[], month: number, year: number): IncomeSummary => {
  const monthIncomes = incomes.filter(inc => {
    const incDate = new Date(inc.date);
    return incDate.getMonth() === month && incDate.getFullYear() === year;
  });

  const total = monthIncomes.reduce((sum, inc) => sum + inc.amount, 0);
  const count = monthIncomes.length;

  // Par source
  const bySources: Record<string, number> = {};
  monthIncomes.forEach(inc => {
    const budget = budgets.find(b => b.id === inc.budget);
    const source = budget?.name || inc.name;
    bySources[source] = (bySources[source] || 0) + inc.amount;
  });

  // Top revenus
  const topIncomes = monthIncomes
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map(inc => {
      const budget = budgets.find(b => b.id === inc.budget);
      return {
        id: inc.id,
        name: inc.name,
        amount: inc.amount,
        budgetName: budget?.name || 'Autre',
        date: new Date(inc.date)
      };
    });

  return {
    total,
    count,
    bySources,
    topIncomes
  };
};

/**
 * Construit les données historiques (3 derniers mois)
 */
const buildHistoricalData = (expenses: any[], incomes: any[], budgets: any[], currentMonth: number, currentYear: number): HistoricalData => {
  const months: MonthData[] = [];
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  // Récupérer les 3 derniers mois (sans le mois en cours)
  for (let i = 1; i <= 3; i++) {
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

    const monthIncomes = incomes.filter(inc => {
      const incDate = new Date(inc.date);
      return incDate.getMonth() === month && incDate.getFullYear() === year;
    });

    const totalExpenses = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncomes = monthIncomes.reduce((sum, inc) => sum + inc.amount, 0);

    // Trouver la catégorie la plus dépensée
    const byCategory: Record<string, number> = {};
    monthExpenses.forEach(exp => {
      const budget = budgets.find(b => b.id === exp.budget);
      const category = budget?.name || 'Autre';
      byCategory[category] = (byCategory[category] || 0) + exp.amount;
    });

    const topCategory = Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0]?.[0] || 'Aucune';

    months.unshift({
      month: monthNames[month],
      year,
      expenses: totalExpenses,
      incomes: totalIncomes,
      balance: totalIncomes - totalExpenses,
      topCategory
    });
  }

  // Calculer les moyennes
  const avgExpenses = months.reduce((sum, m) => sum + m.expenses, 0) / (months.length || 1);
  const avgIncomes = months.reduce((sum, m) => sum + m.incomes, 0) / (months.length || 1);
  const avgBalance = months.reduce((sum, m) => sum + m.balance, 0) / (months.length || 1);

  return {
    months,
    averages: {
      expenses: avgExpenses,
      incomes: avgIncomes,
      balance: avgBalance
    }
  };
};

/**
 * Construit l'analyse des tendances
 */
const buildTrendAnalysis = (currentExpenses: ExpenseSummary, historical: HistoricalData): TrendAnalysis => {
  const avgHistoricalExpenses = historical.averages.expenses;
  const currentTotal = currentExpenses.total;

  let overall: 'increasing' | 'decreasing' | 'stable' = 'stable';
  let percentage = 0;

  if (avgHistoricalExpenses > 0) {
    percentage = Math.round(((currentTotal - avgHistoricalExpenses) / avgHistoricalExpenses) * 100);
    
    if (percentage > 10) {
      overall = 'increasing';
    } else if (percentage < -10) {
      overall = 'decreasing';
    }
  }

  // Tendances par catégorie (simplifié)
  const byCategory: Record<string, any> = {};
  Object.keys(currentExpenses.byCategory).forEach(cat => {
    const current = currentExpenses.byCategory[cat];
    byCategory[cat] = {
      direction: 'stable' as const,
      percentage: 0,
      comparison: `${formatCurrency(current)} ce mois`
    };
  });

  return {
    overall,
    percentage,
    byCategory
  };
};

/**
 * Construit les alertes
 */
const buildAlerts = (budgets: BudgetSummary[], expenses: ExpenseSummary, dayOfMonth: number, totalDaysInMonth: number): Alert[] => {
  const alerts: Alert[] = [];

  // Alertes pour budgets dépassés ou en warning
  budgets.forEach(budget => {
    if (budget.status === 'exceeded') {
      alerts.push({
        type: 'danger',
        category: budget.name,
        message: `Budget "${budget.name}" dépassé : ${formatCurrency(budget.spent)} dépensés sur ${formatCurrency(budget.amount || 0)}`,
        value: budget.spent,
        threshold: budget.amount
      });
    } else if (budget.status === 'warning') {
      alerts.push({
        type: 'warning',
        category: budget.name,
        message: `Budget "${budget.name}" à ${budget.percentage}% : attention au dépassement`,
        value: budget.spent,
        threshold: budget.amount
      });
    }
  });

  // Alerte si rythme de dépense trop élevé
  const monthProgress = dayOfMonth / totalDaysInMonth;
  const totalBudget = budgets
    .filter(b => b.type === 'capped' && b.amount)
    .reduce((sum, b) => sum + (b.amount || 0), 0);
  
  if (totalBudget > 0 && expenses.total > totalBudget * monthProgress * 1.2) {
    alerts.push({
      type: 'warning',
      category: 'Général',
      message: `Rythme de dépense élevé : vous êtes à ${Math.round(monthProgress * 100)}% du mois mais avez dépensé ${Math.round((expenses.total / totalBudget) * 100)}% de vos budgets`
    });
  }

  return alerts;
};
