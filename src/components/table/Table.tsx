import { Calendar, Tag, Trash, Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useBudgetStore } from '../../stores/budgetStore';
import { useExpenseStore, type ExpenseInterface } from '../../stores/expenseStore';

import { useIncomeStore, type IncomeInterface } from '../../stores/incomeStore';
import { useUserStore } from '../../stores/userStore';
import { formatCurrency, formatDateDisplay } from '../../utils';
import EditTransactionModal, { type TransactionType } from '../modals/EditTransactionModal';

interface TableProps {
  expenses: ExpenseInterface[];
  incomes: IncomeInterface[];
  showCategory?: boolean;
  showActions?: boolean;
}

const Table = ({ expenses, incomes, showCategory = true, showActions = true }: TableProps) => {
  const { deleteExpense } = useExpenseStore();
  const { deleteIncome } = useIncomeStore();
  const { getBudgetById } = useBudgetStore();
  const { user } = useUserStore();

  const [editingTransaction, setEditingTransaction] = useState<{ transaction: ExpenseInterface | IncomeInterface, type: TransactionType } | null>(null);

  const transactions = [
    ...expenses.map(e => ({ ...e, type: 'expense' }) as const),
    ...incomes.map(i => ({ ...i, type: 'income' }) as const),
  ];

  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const handleDelete = async (id: string, type: 'expense' | 'income') => {
    if (!user) return;

    try {
      if (type === 'expense') {
        await deleteExpense(user.id, id);
        toast.success('Dépense supprimée');
      } else {
        await deleteIncome(user.id, id);
        toast.success('Revenu supprimé');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Échec lors de la suppression');
    }
  };

  return (
    <div className="w-full">
      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {sortedTransactions.map(transaction => {
          const budget = getBudgetById(transaction.budget || '');
          return (
            <div
              key={`${transaction.type}-${transaction.id}`}
              className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col gap-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                    {transaction.type === 'expense' ? 'Dépense' : 'Revenu'}
                  </span>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {transaction.name}
                  </p>
                </div>
                <p
                  className={`font-bold text-lg ${transaction.type === 'expense' ? 'text-neutral-900 dark:text-neutral-100' : 'text-blue-600 dark:text-blue-400'}`}
                >
                  {transaction.type === 'expense' ? '-' : '+'} {formatCurrency(transaction.amount)}
                </p>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-neutral-100 dark:border-neutral-800 text-sm">
                <div className="flex flex-col gap-2">
                  {showCategory && (
                    <div className="flex items-center gap-2 text-neutral-500">
                      <Tag size={14} className="text-blue-500" />
                      <span>{budget?.name || 'Non catégorisé'}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-neutral-500">
                    <Calendar size={14} className="text-neutral-400" />
                    <span>{formatDateDisplay(transaction.date)}</span>
                  </div>
                </div>
                {showActions && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingTransaction({ transaction, type: transaction.type as TransactionType })}
                      className="p-2 bg-blue-50 dark:bg-blue-900/20 text-[#3170dd] rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      aria-label="Modifier"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(transaction.id, transaction.type)}
                      className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      aria-label="Supprimer"
                    >
                      <Trash className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <table className="min-w-full text-[#1f1f1f] dark:text-neutral-100 text-base">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
              <th className="text-left px-6 py-4 font-semibold text-neutral-600 dark:text-neutral-400">
                Nom
              </th>
              <th className="text-left px-6 py-4 font-semibold text-neutral-600 dark:text-neutral-400">
                Montant
              </th>
              {showCategory && (
                <th className="text-left px-6 py-4 font-semibold text-neutral-600 dark:text-neutral-400">
                  Catégorie
                </th>
              )}
              <th className="text-left px-6 py-4 font-semibold text-neutral-600 dark:text-neutral-400">
                Date
              </th>
              <th className="text-left px-6 py-4 font-semibold text-neutral-600 dark:text-neutral-400">
                Type
              </th>
              {showActions && (
                <th className="text-center px-6 py-4 font-semibold text-neutral-600 dark:text-neutral-400">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
            {sortedTransactions.map(transaction => {
              const budget = getBudgetById(transaction.budget || '');
              return (
                <tr
                  key={`${transaction.type}-${transaction.id}`}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium">{transaction.name}</td>
                  <td
                    className={`px-6 py-4 font-bold ${transaction.type === 'expense' ? 'text-neutral-900 dark:text-neutral-100' : 'text-blue-600 dark:text-blue-400'}`}
                  >
                    {transaction.type === 'expense' ? '-' : '+'}{' '}
                    {formatCurrency(transaction.amount)}
                  </td>
                  {showCategory && (
                    <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">
                      {budget?.name || 'Non catégorisé'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                    {formatDateDisplay(transaction.date)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.type === 'expense'
                          ? 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}
                    >
                      {transaction.type === 'expense' ? 'Dépense' : 'Revenu'}
                    </span>
                  </td>
                  {showActions && (
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditingTransaction({ transaction, type: transaction.type as TransactionType })}
                          className="text-[#3170dd] hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          aria-label="Modifier"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id, transaction.type)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          aria-label="Supprimer"
                        >
                          <Trash className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction.transaction}
          type={editingTransaction.type}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  );
};

export default Table;
