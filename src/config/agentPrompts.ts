import { useCurrencyStore } from '../stores/currencyStore';

export const SYSTEM_PROMPT = `Tu es l'assistant financier personnel de l'utilisateur dans l'application Xpense.
Tu as accès à toutes ses données financières : budgets, dépenses et revenus.
Ton rôle est de l'aider à mieux comprendre et gérer son argent.

RÈGLES IMPORTANTES :
- Toujours baser tes réponses sur les données réelles fournies dans le contexte
- Ne JAMAIS inventer de chiffres ou de données
- Être concis mais complet dans tes réponses
- Utiliser un ton amical et encourageant, jamais moralisateur
- Quand tu identifies un problème, proposer toujours une solution concrète
- Formater les montants avec la devise FCFA
- Utiliser des emojis pertinents pour rendre les réponses plus visuelles (mais avec modération)
- Répondre en français

TES CAPACITÉS :
- Répondre aux questions sur les finances de l'utilisateur
- Analyser les tendances et patterns de dépenses
- Donner des conseils personnalisés basés sur les données réelles
- Créer des projections et estimations de fin de mois
- Identifier les opportunités d'économie
- Détecter les anomalies et alerter l'utilisateur
- Proposer des actions (créer budget, ajouter dépense, etc.)

TES LIMITES :
- Ne pas donner de conseils financiers génériques sur l'investissement ou la bourse
- Ne pas accéder à des données bancaires externes
- Ne pas faire de modifications sans confirmation explicite de l'utilisateur
- Ne pas faire de suppositions sur des données non fournies

FORMAT DE RÉPONSE :
- Utiliser des listes à puces pour les détails
- Mettre en gras les montants importants
- Utiliser des emojis de manière pertinente (💰, 📊, ⚠️, ✅, etc.)
- Proposer des actions concrètes quand c'est pertinent

ACTIONS DISPONIBLES :
Quand l'utilisateur demande de créer, modifier ou supprimer quelque chose, tu peux proposer une action.
Format : [ACTION:type:paramètres]
Exemples :
- [ACTION:create_budget:name=Restaurants,amount=200,type=capped]
- [ACTION:add_expense:name=Restaurant,amount=45,budgetId=xxx]
- [ACTION:modify_budget:budgetId=xxx,amount=250]

L'utilisateur devra confirmer avant que l'action soit exécutée.`;

export const CONTEXT_TEMPLATE = `
CONTEXTE FINANCIER ACTUEL :
Date : {currentDate}
Jour du mois : {dayOfMonth}/{totalDaysInMonth}
Position dans le mois : {monthProgress}%

BUDGETS :
{budgets}

DÉPENSES CE MOIS :
Total : {totalExpenses} {currency} ({expenseCount} dépenses)
Moyenne par jour : {avgExpensePerDay} {currency}
Top catégories :
{topExpenseCategories}

REVENUS CE MOIS :
Total : {totalIncomes} {currency} ({incomeCount} revenus)
{topIncomeSources}

SOLDE ESTIMÉ : {balance} {currency}

HISTORIQUE (3 derniers mois) :
{historicalData}

TENDANCES :
{trends}

ALERTES :
{alerts}

HISTORIQUE DE CONVERSATION :
{conversationHistory}

QUESTION DE L'UTILISATEUR :
{userMessage}
`;

export const buildContextPrompt = (context: any, userMessage: string, history: string): string => {
  const currency = useCurrencyStore.getState().currency;
  const monthProgress = Math.round((context.dayOfMonth / context.totalDaysInMonth) * 100);
  
  // Formater les budgets
  const budgetsText = context.budgets.map((b: any) => {
    if (b.type === 'capped') {
      return `- ${b.name} (Plafonné) : ${b.spent} / ${b.amount} ${currency} (${b.percentage}%) - ${b.status === 'exceeded' ? '⚠️ DÉPASSÉ' : b.status === 'warning' ? '⚠️ Attention' : '✅ OK'}`;
    } else {
      return `- ${b.name} (Suivi) : ${b.spent} ${currency} dépensés`;
    }
  }).join('\n');

  // Top catégories de dépenses
  const topExpenseCategories = Object.entries(context.currentMonthExpenses.byCategory)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5)
    .map(([cat, amount]) => `  - ${cat} : ${amount} ${currency}`)
    .join('\n');

  // Top sources de revenus
  const topIncomeSources = Object.entries(context.currentMonthIncomes.bySources)
    .sort(([, a]: any, [, b]: any) => b - a)
    .map(([source, amount]) => `  - ${source} : ${amount} ${currency}`)
    .join('\n');

  // Historique
  const historicalData = context.historical.months
    .map((m: any) => `  - ${m.month} ${m.year} : ${m.expenses} ${currency} dépensés, ${m.incomes} ${currency} revenus (solde: ${m.balance} ${currency})`)
    .join('\n');

  // Tendances
  const trendsText = `Tendance globale : ${context.trends.overall === 'increasing' ? '📈 Hausse' : context.trends.overall === 'decreasing' ? '📉 Baisse' : '➡️ Stable'} (${context.trends.percentage > 0 ? '+' : ''}${context.trends.percentage}%)`;

  // Alertes
  const alertsText = context.alerts.length > 0
    ? context.alerts.map((a: any) => `  ${a.type === 'danger' ? '🔴' : a.type === 'warning' ? '⚠️' : 'ℹ️'} ${a.message}`).join('\n')
    : '  Aucune alerte';

  return CONTEXT_TEMPLATE
    .replace('{currentDate}', context.currentDate)
    .replace('{dayOfMonth}', context.dayOfMonth.toString())
    .replace('{totalDaysInMonth}', context.totalDaysInMonth.toString())
    .replace('{monthProgress}', monthProgress.toString())
    .replace('{budgets}', budgetsText)
    .replace(/{totalExpenses}/g, context.currentMonthExpenses.total.toLocaleString())
    .replace('{expenseCount}', context.currentMonthExpenses.count.toString())
    .replace(/{avgExpensePerDay}/g, Math.round(context.currentMonthExpenses.averagePerDay).toLocaleString())
    .replace('{topExpenseCategories}', topExpenseCategories)
    .replace(/{totalIncomes}/g, context.currentMonthIncomes.total.toLocaleString())
    .replace('{incomeCount}', context.currentMonthIncomes.count.toString())
    .replace('{topIncomeSources}', topIncomeSources)
    .replace(/{balance}/g, context.balance.toLocaleString())
    .replace('{historicalData}', historicalData)
    .replace('{trends}', trendsText)
    .replace('{alerts}', alertsText)
    .replace('{conversationHistory}', history)
    .replace(/{userMessage}/g, userMessage)
    .replace(/{currency}/g, currency);
};
