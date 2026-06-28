import { create } from 'zustand';
import { addDoc, collection, db, deleteDoc, doc, getDocs, updateDoc } from '../firebase';

export interface ExpenseInterface {
  id: string;
  name: string;
  amount: number;
  budget: string;
  date: string;
}

interface ExpenseStore {
  expenses: ExpenseInterface[];
  addExpense: (userId: string, expense: Omit<ExpenseInterface, 'id'>) => Promise<void>;
  getAllExpenses: (userId: string) => Promise<void>;
  deleteExpense: (userId: string, expenseId: string) => Promise<void>;
  updateExpense: (userId: string, expenseId: string, expense: Partial<Omit<ExpenseInterface, 'id'>>) => Promise<void>;
  deleteAllExpenses: (userId: string) => Promise<void>;
  deleteExpensesByBudget: (userId: string, budgetId: string) => Promise<void>;
  getExpensesByBudget: (budgetId: string | undefined) => ExpenseInterface[];
  getExpenseBudget: (budgetId: string | undefined) => number;
}

export const useExpenseStore = create<ExpenseStore>((set, get) => ({
  expenses: [],

  addExpense: async (userId, expense) => {
    try {
      const expensesRef = collection(db, 'users', userId, 'expenses');
      const docRef = await addDoc(expensesRef, expense);

      set(state => ({
        expenses: [...state.expenses, { ...expense, id: docRef.id }],
      }));
    } catch (error) {
      console.error('Error adding expense:', error);
      throw new Error('Could not add expense');
    }
  },

  getAllExpenses: async userId => {
    try {
      const expensesSnapshot = await getDocs(collection(db, 'users', userId, 'expenses'));
      const expenses = expensesSnapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as ExpenseInterface
      );
      set({ expenses });
    } catch (error) {
      console.error('Erreur lors du chargement des dépenses:', error);
    }
  },

  deleteExpense: async (userId, expenseId) => {
    try {
      const expenseRef = doc(db, 'users', userId, 'expenses', expenseId);
      await deleteDoc(expenseRef);

      set(state => ({
        expenses: state.expenses.filter(expense => expense.id !== expenseId),
      }));
    } catch (error) {
      console.error('Erreur lors de la suppression de la dépense:', error);
      throw error;
    }
  },

  updateExpense: async (userId, expenseId, updatedExpense) => {
    try {
      const expenseRef = doc(db, 'users', userId, 'expenses', expenseId);
      await updateDoc(expenseRef, updatedExpense);

      set(state => ({
        expenses: state.expenses.map(expense =>
          expense.id === expenseId ? { ...expense, ...updatedExpense } : expense
        ),
      }));
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la dépense:', error);
      throw error;
    }
  },

  deleteAllExpenses: async userId => {
    try {
      const expensesSnapshot = await getDocs(collection(db, 'users', userId, 'expenses'));
      const batchPromises = expensesSnapshot.docs.map(docItem =>
        deleteDoc(doc(db, 'users', userId, 'expenses', docItem.id))
      );

      await Promise.all(batchPromises);
      set({ expenses: [] });
    } catch (error) {
      console.error('Erreur lors de la suppression de toutes les dépenses:', error);
      throw new Error('Erreur lors de la suppression de toutes les dépenses');
    }
  },

  deleteExpensesByBudget: async (userId, budgetId) => {
    try {
      const { expenses } = get();
      const budgetExpenses = expenses.filter(exp => exp.budget === budgetId);

      const batchPromises = budgetExpenses.map(expense =>
        deleteDoc(doc(db, 'users', userId, 'expenses', expense.id))
      );

      await Promise.all(batchPromises);

      set(state => ({
        expenses: state.expenses.filter(expense => expense.budget !== budgetId),
      }));
    } catch (error) {
      console.error('Erreur lors de la suppression des dépenses par budget:', error);
      throw error;
    }
  },

  getExpensesByBudget: budgetId => {
    if (!budgetId) return [];
    return get().expenses.filter(expense => expense.budget === budgetId);
  },

  getExpenseBudget: budgetId => {
    if (!budgetId) return 0;
    const filteredExpenses = get().expenses.filter(expense => expense.budget === budgetId);
    return filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  },
}));
