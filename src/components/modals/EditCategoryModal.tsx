import { Save, X } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import type { BudgetInterface, BudgetType } from '../../stores/budgetStore';
import { useBudgetStore } from '../../stores/budgetStore';
import { useUserStore } from '../../stores/userStore';

interface EditCategoryModalProps {
  budget: BudgetInterface;
  onClose: () => void;
}

const EditCategoryModal: React.FC<EditCategoryModalProps> = ({ budget, onClose }) => {
  const { updateBudget } = useBudgetStore();
  const { user } = useUserStore();

  const [name, setName] = useState(budget.name);
  const [type, setType] = useState<BudgetType>(budget.type);
  const [amount, setAmount] = useState(budget.amount?.toString() || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!name.trim()) {
      toast.error('Le nom est requis.');
      return;
    }

    if ((type === 'capped' || type === 'savings') && (!amount.trim() || isNaN(Number(amount)))) {
      toast.error("Le montant est obligatoire et doit être un nombre pour ce type de budget.");
      return;
    }

    try {
      await updateBudget(user.id, budget.id, {
        name: name.trim(),
        type,
        amount: (type === 'capped' || type === 'savings') ? Number(amount) : undefined,
      });
      toast.success('Catégorie mise à jour avec succès !');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la mise à jour de la catégorie.');
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

        <h2 className="text-2xl font-bold mb-6 text-[#1f1f1f] dark:text-neutral-100">Modifier la catégorie</h2>

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
            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as BudgetType)}
              className="w-full h-12 rounded-lg border-[1.8px] border-neutral-300 dark:border-neutral-700 bg-transparent px-4 focus:border-[#3170dd] focus:ring-1 focus:ring-[#3170dd] outline-none transition-all dark:text-white"
            >
              <option value="capped">Plafonné</option>
              <option value="tracking">Suivi</option>
              <option value="savings">Épargne</option>
            </select>
          </div>

          {(type === 'capped' || type === 'savings') && (
            <div>
              <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Montant</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full h-12 rounded-lg border-[1.8px] border-neutral-300 dark:border-neutral-700 bg-transparent px-4 focus:border-[#3170dd] focus:ring-1 focus:ring-[#3170dd] outline-none transition-all dark:text-white"
                required
              />
            </div>
          )}

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

export default EditCategoryModal;
