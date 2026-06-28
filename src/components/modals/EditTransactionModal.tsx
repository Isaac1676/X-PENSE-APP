import { Save, X } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useBudgetStore } from '../../stores/budgetStore';
import { useExpenseStore, type ExpenseInterface } from '../../stores/expenseStore';
import { useIncomeStore, type IncomeInterface } from '../../stores/incomeStore';
import { useUserStore } from '../../stores/userStore';
import { cleanAmountInput } from '../../utils';

export type TransactionType = 'expense' | 'income';

interface EditTransactionModalProps {
  transaction: ExpenseInterface | IncomeInterface;
  type: TransactionType;
  onClose: () => void;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ transaction, type, onClose }) => {
  const { updateExpense } = useExpenseStore();
  const { updateIncome } = useIncomeStore();
  const { budgets } = useBudgetStore();
  const { user } = useUserStore();

  const [name, setName] = useState(transaction.name);
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [budgetId, setBudgetId] = useState(transaction.budget);
  
  // Convert ISO string to YYYY-MM-DDTHH:mm format for datetime-local input
  const dateObj = new Date(transaction.date);
  const tzOffset = dateObj.getTimezoneOffset() * 60000;
  const localISOTime = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);
  const [date, setDate] = useState(localISOTime);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!name.trim() || !amount.trim() || !budgetId.trim() || !date) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }

    try {
      const updatedData = {
        name: name.trim(),
        amount: cleanAmountInput(amount),
        budget: budgetId,
        date: new Date(date).toISOString(),
      };

      if (type === 'expense') {
        await updateExpense(user.id, transaction.id, updatedData);
        toast.success('Dépense mise à jour avec succès !');
      } else {
        await updateIncome(user.id, transaction.id, updatedData);
        toast.success('Revenu mis à jour avec succès !');
      }
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la mise à jour de la transaction.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-md p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-[#1f1f1f] dark:text-neutral-100">
          Modifier {type === 'expense' ? 'la dépense' : 'le revenu'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Nom</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full h-12 rounded-lg border-[1.8px] border-neutral-300 dark:border-neutral-700 bg-transparent px-4 focus:border-[#3170dd] focus:ring-1 focus:ring-[#3170dd] outline-none transition-all dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Montant</label>
            <input
              type="text"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full h-12 rounded-lg border-[1.8px] border-neutral-300 dark:border-neutral-700 bg-transparent px-4 focus:border-[#3170dd] focus:ring-1 focus:ring-[#3170dd] outline-none transition-all dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Catégorie</label>
            <select
              value={budgetId}
              onChange={e => setBudgetId(e.target.value)}
              className="w-full h-12 rounded-lg border-[1.8px] border-neutral-300 dark:border-neutral-700 bg-transparent px-4 focus:border-[#3170dd] focus:ring-1 focus:ring-[#3170dd] outline-none transition-all dark:text-white"
              required
            >
              <option value="" disabled>Sélectionner une catégorie</option>
              {budgets.map(b => (
                <option key={b.id} value={b.id} className="text-[#1f1f1f]">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Date</label>
            <input
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full h-12 rounded-lg border-[1.8px] border-neutral-300 dark:border-neutral-700 bg-transparent px-4 focus:border-[#3170dd] focus:ring-1 focus:ring-[#3170dd] outline-none transition-all dark:text-white"
              required
            />
          </div>

          <button
            type="submit"
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#3170dd] hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
          >
            <Save size={20} />
            Enregistrer les modifications
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditTransactionModal;
