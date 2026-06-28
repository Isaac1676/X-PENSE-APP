import type { Action, ActionResult } from '../../types/agent';
import { ActionType } from '../../types/agent';
import { useBudgetStore } from '../../stores/budgetStore';
import { useExpenseStore } from '../../stores/expenseStore';
import { useIncomeStore } from '../../stores/incomeStore';
import { formatCurrency } from '../../utils';

/**
 * Exécute une action détectée par l'agent
 */
export const executeAction = async (action: Action, userId: string): Promise<ActionResult> => {
  try {
    switch (action.type) {
      case ActionType.CREATE_BUDGET:
        return await createBudget(action.parameters, userId);
      
      case ActionType.ADD_EXPENSE:
        return await addExpense(action.parameters, userId);
      
      case ActionType.ADD_INCOME:
        return await addIncome(action.parameters, userId);
      
      case ActionType.MODIFY_BUDGET:
        return await modifyBudget(action.parameters, userId);
      
      case ActionType.DELETE_BUDGET:
        return await deleteBudget(action.parameters, userId);
      
      default:
        return {
          success: false,
          message: 'Type d\'action non reconnu',
          error: `Unknown action type: ${action.type}`
        };
    }
  } catch (error: any) {
    console.error('Error executing action:', error);
    return {
      success: false,
      message: 'Erreur lors de l\'exécution de l\'action',
      error: error.message
    };
  }
};

/**
 * Crée un nouveau budget
 */
const createBudget = async (params: Record<string, any>, userId: string): Promise<ActionResult> => {
  const { name, amount, type } = params;

  if (!name) {
    return {
      success: false,
      message: 'Le nom du budget est requis',
      error: 'Missing name parameter'
    };
  }

  const budgetStore = useBudgetStore.getState();

  // Vérifier si le budget existe déjà
  const existingBudgetNames = budgetStore.verifyBudgetName();
  const exists = existingBudgetNames.some(
    budgetName => budgetName.toLowerCase() === name.toLowerCase()
  );
  
  if (exists) {
    return {
      success: false,
      message: `Un budget nommé "${name}" existe déjà`,
      error: 'Budget already exists'
    };
  }

  // Créer le budget
  const budgetData: any = {
    name,
    type: type === 'tracking' ? 'tracking' : 'capped',
    userId
  };

  if (type !== 'tracking' && amount) {
    budgetData.amount = parseFloat(amount);
  }

  try {
    await budgetStore.addBudget(userId, budgetData);
    return {
      success: true,
      message: `✅ Budget "${name}" créé avec succès !`,
      data: budgetData
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Erreur lors de la création du budget',
      error: error.message
    };
  }
};

/**
 * Ajoute une dépense
 */
const addExpense = async (params: Record<string, any>, userId: string): Promise<ActionResult> => {
  const { name, amount, budget: budgetId } = params;

  if (!name || !amount) {
    return {
      success: false,
      message: 'Le nom et le montant sont requis',
      error: 'Missing required parameters'
    };
  }

  const expenseStore = useExpenseStore.getState();
  const budgetStore = useBudgetStore.getState();

  // Si pas de budgetId fourni, utiliser le premier budget disponible
  let targetBudgetId = budgetId;
  if (!targetBudgetId) {
    const budgets = budgetStore.budgets;
    if (budgets.length === 0) {
      return {
        success: false,
        message: 'Aucun budget disponible. Créez d\'abord un budget.',
        error: 'No budgets available'
      };
    }
    targetBudgetId = budgets[0].id;
  }

  const expenseData = {
    name,
    amount: parseFloat(amount),
    budget: targetBudgetId,
    date: new Date().toISOString()
  };

  try {
    await expenseStore.addExpense(userId, expenseData);
    return {
      success: true,
      message: `✅ Dépense "${name}" de ${formatCurrency(parseFloat(amount))} ajoutée !`,
      data: expenseData
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Erreur lors de l\'ajout de la dépense',
      error: error.message
    };
  }
};

/**
 * Ajoute un revenu
 */
const addIncome = async (params: Record<string, any>, userId: string): Promise<ActionResult> => {
  const { name, amount, budget: budgetId } = params;

  if (!name || !amount) {
    return {
      success: false,
      message: 'Le nom et le montant sont requis',
      error: 'Missing required parameters'
    };
  }

  const incomeStore = useIncomeStore.getState();
  const budgetStore = useBudgetStore.getState();

  // Si pas de budgetId fourni, utiliser le premier budget disponible
  let targetBudgetId = budgetId;
  if (!targetBudgetId) {
    const budgets = budgetStore.budgets;
    if (budgets.length === 0) {
      return {
        success: false,
        message: 'Aucun budget disponible. Créez d\'abord un budget.',
        error: 'No budgets available'
      };
    }
    targetBudgetId = budgets[0].id;
  }

  const incomeData = {
    name,
    amount: parseFloat(amount),
    budget: targetBudgetId,
    date: new Date().toISOString()
  };

  try {
    await incomeStore.addIncome(userId, incomeData);
    return {
      success: true,
      message: `✅ Revenu "${name}" de ${formatCurrency(parseFloat(amount))} ajouté !`,
      data: incomeData
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Erreur lors de l\'ajout du revenu',
      error: error.message
    };
  }
};

/**
 * Modifie un budget
 * Note: updateBudget n'existe pas dans budgetStore, donc on retourne une erreur pour l'instant
 */
const modifyBudget = async (_params: Record<string, any>, _userId: string): Promise<ActionResult> => {
  // TODO: Implémenter updateBudget dans budgetStore
  return {
    success: false,
    message: 'La modification de budget n\'est pas encore implémentée',
    error: 'Not implemented'
  };
  
  /* Code à réactiver quand updateBudget sera implémenté
  const { budgetId, amount, name } = params;

  if (!budgetId) {
    return {
      success: false,
      message: 'L\'ID du budget est requis',
      error: 'Missing budgetId parameter'
    };
  }

  const budgetStore = useBudgetStore.getState();
  const budget = budgetStore.budgets.find(b => b.id === budgetId);

  if (!budget) {
    return {
      success: false,
      message: 'Budget non trouvé',
      error: 'Budget not found'
    };
  }

  const updates: any = {};
  if (amount) updates.amount = parseFloat(amount);
  if (name) updates.name = name;

  try {
    await budgetStore.updateBudget(budgetId, updates);
    return {
      success: true,
      message: `✅ Budget modifié avec succès !`,
      data: updates
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Erreur lors de la modification du budget',
      error: error.message
    };
  }
  */
};

/**
 * Supprime un budget
 */
const deleteBudget = async (params: Record<string, any>, userId: string): Promise<ActionResult> => {
  const { budgetId, name } = params;

  const budgetStore = useBudgetStore.getState();
  
  // Trouver le budget par ID ou par nom
  let targetBudgetId = budgetId;
  if (!targetBudgetId && name) {
    const budget = budgetStore.budgets.find(b => b.name.toLowerCase() === name.toLowerCase());
    if (budget) {
      targetBudgetId = budget.id;
    }
  }

  if (!targetBudgetId) {
    return {
      success: false,
      message: 'Budget non trouvé',
      error: 'Budget not found'
    };
  }

  try {
    await budgetStore.deleteBudget(userId, targetBudgetId);
    return {
      success: true,
      message: `✅ Budget supprimé avec succès !`
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Erreur lors de la suppression du budget',
      error: error.message
    };
  }
};
