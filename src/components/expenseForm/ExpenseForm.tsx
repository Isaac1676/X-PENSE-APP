import { CirclePlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useBudgetStore, type BudgetInterface } from '../../stores/budgetStore';
import { useExpenseStore } from '../../stores/expenseStore';
import { useUserStore } from '../../stores/userStore';
import { cleanAmountInput, formatAmountInput } from '../../utils';
import { checkExpenseTriggers } from '../notifications/checkExpenseTriggers';
import HeaderForm from '../ui/HeaderForm';

const ExpenseForm = ({ budget }: { budget: BudgetInterface | null }) => {
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    budgetId: budget ? budget.id : '',
  });
  const { addExpense } = useExpenseStore();
  const { budgets } = useBudgetStore();
  const { user } = useUserStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      newExpense.name.trim() === '' ||
      newExpense.amount.trim() === '' ||
      newExpense.budgetId.trim() === ''
    ) {
      toast.error('Veuillez entrer le nom, le montant et la catégorie de la dépense.');
      return;
    }

    try {
      const expense = {
        name: newExpense.name,
        amount: cleanAmountInput(newExpense.amount),
        budget: newExpense.budgetId,
        date: new Date().toISOString(),
      };
      await addExpense(user!.id, expense);
      await checkExpenseTriggers(user!.id, expense.budget, expense.amount);
      toast.success('Dépense ajoutée avec succès !');
      // Réinitialiser le formulaire ou mettre à jour l'interface utilisateur si nécessaire
      setNewExpense({ name: '', amount: '', budgetId: '' });
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'ajout de la dépense.");
    }
  };

  return (
    <div className="mt-8 p-6 border-2 border-dashed text-[#1f1f1f] dark:text-neutral-100 border-neutral-700 rounded-lg relative w-full">
      <form className="flex flex-col h-full justify-between gap-5" onSubmit={handleSubmit}>
        <HeaderForm title="Nouvelle dépense" />
        <input
          type="text"
          className="w-full h-12 sm:h-14 text-center placeholder-neutral-400 sm:text-left rounded border-[1.8px] border-neutral-400 bg-transparent px-4 text-base md:text-lg focus:border-none focus:ring-2 focus:ring-[#3170dd] focus:outline-none transition-all"
          value={newExpense.name}
          placeholder="Nom de dépense"
          onChange={e => setNewExpense({ ...newExpense, name: e.target.value })}
          required
        />
        <input
          type="text"
          className="w-full h-12 sm:h-14 text-center placeholder-neutral-400 sm:text-left rounded border-[1.8px] border-neutral-400 bg-transparent px-4 text-base md:text-lg focus:border-none focus:ring-2 focus:ring-[#3170dd] focus:outline-none transition-all"
          value={newExpense.amount}
          placeholder="Montant"
          onChange={e =>
            setNewExpense({ ...newExpense, amount: formatAmountInput(e.target.value) })
          }
          required
        />
        {!budget && (
          <select
            className="w-full h-12 sm:h-14 text-center placeholder-neutral-400 sm:text-left rounded border-[1.8px] border-neutral-400 bg-transparent px-4 text-base md:text-lg focus:border-none focus:ring-2 focus:ring-[#3170dd] focus:outline-none transition-all"
            value={newExpense.budgetId}
            onChange={e => setNewExpense({ ...newExpense, budgetId: e.target.value })}
          >
            <option value="" disabled>
              Sélectionner un budget
            </option>
            {budgets.map(budget => (
              <option key={budget.id} value={budget.id} className="text-[#1f1f1f]">
                {budget.name}
              </option>
            ))}
          </select>
        )}

        <button
          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1f1f1f] hover:opacity-90 text-white rounded cursor-pointer transition-colors"
          type="submit"
        >
          <CirclePlus />
          <span className="text">Ajouter dépense</span>
        </button>
      </form>
    </div>
  );
};

export default ExpenseForm;
