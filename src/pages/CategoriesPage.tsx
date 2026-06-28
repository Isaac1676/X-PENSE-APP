import { ArrowRight, ChevronLeft, Filter, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import Progressbar from '../components/progressBar/Progressbar';
import type { BudgetType } from '../stores/budgetStore';
import { useBudgetStore } from '../stores/budgetStore';
import { useExpenseStore } from '../stores/expenseStore';
import { useIncomeStore } from '../stores/incomeStore';
import { useUserStore } from '../stores/userStore';
import { formatCurrency } from '../utils';

const CategoriesPage = () => {
  const navigate = useNavigate();
  const { budgets, deleteBudget } = useBudgetStore();
  const { getExpenseBudget } = useExpenseStore();
  const { getIncomeBudget } = useIncomeStore();
  const { user } = useUserStore();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<BudgetType | 'all'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, budgetId: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteBudget(user.id, budgetId);
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const filteredBudgets = useMemo(() => {
    return budgets
      .filter(b => {
        const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase());
        const matchesType = filterType === 'all' || b.type === filterType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [budgets, search, filterType]);

  const typeLabels: Record<BudgetType, string> = {
    capped: 'Plafonné',
    tracking: 'Suivi',
    savings: 'Épargne',
  };

  return (
    <main className="min-h-screen px-6 py-8 text-[#1f1f1f] dark:text-neutral-100 md:px-16 transition-colors duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Catégories</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gérez et suivez toutes vos catégories
          </p>
        </div>
      </div>

      {/* Filtres et Recherche */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher une catégorie..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-[#3170dd] focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          {(['all', 'capped', 'tracking', 'savings'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                filterType === type
                  ? 'bg-[#3170dd] text-white shadow-md shadow-blue-500/20'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {type === 'all' ? 'Tout' : typeLabels[type as BudgetType]}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des catégories */}
      <div className="grid grid-cols-1 gap-4">
        {filteredBudgets.length > 0 ? (
          filteredBudgets.map(budget => {
            const spent = getExpenseBudget(budget.id);
            const added = getIncomeBudget(budget.id);

            return (
              <div
                key={budget.id}
                onClick={() => navigate(`/h/budgets/${budget.id}`)}
                className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all cursor-pointer group"
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          budget.type === 'capped'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : budget.type === 'savings'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
                        }`}
                      >
                        {typeLabels[budget.type]}
                      </span>
                      <h3 className="text-xl font-bold group-hover:text-[#3170dd] transition-colors">
                        {budget.name}
                      </h3>
                    </div>

                    {budget.type !== 'tracking' && (
                      <div className="mt-4">
                        <Progressbar
                          spent={
                            (budget.amount || 0) + added > 0
                              ? Math.min(100, (spent / ((budget.amount || 0) + added)) * 100)
                              : 0
                          }
                          state={
                            budget.type === 'savings'
                              ? true
                              : (budget.amount || 0) + added > 0
                                ? spent / ((budget.amount || 0) + added) < 0.8
                                : true
                          }
                          even={true}
                        />
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-neutral-500 dark:text-neutral-500 mb-1">Dépensé</p>
                        <p className="font-semibold">{formatCurrency(spent)}</p>
                      </div>
                      {budget.type !== 'tracking' && (
                        <>
                          <div>
                            <p className="text-neutral-500 dark:text-neutral-500 mb-1">Budget</p>
                            <p className="font-semibold text-[#3170dd]">
                              {formatCurrency(budget.amount || 0)}
                            </p>
                          </div>
                          <div className="col-span-2 sm:col-auto">
                            <p className="text-neutral-500 dark:text-neutral-500 mb-1">Restant</p>
                            <p
                              className={`font-semibold ${(budget.amount || 0) - spent + added < 0 ? 'text-red-500' : 'text-emerald-500'}`}
                            >
                              {formatCurrency((budget.amount || 0) - spent + added)}
                            </p>
                          </div>
                        </>
                      )}
                      {budget.type === 'tracking' && added > 0 && (
                        <div>
                          <p className="text-neutral-500 dark:text-neutral-500 mb-1">Revenus</p>
                          <p className="font-semibold text-emerald-500">
                            {formatCurrency(added)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-2">
                    {confirmDeleteId === budget.id ? (
                      <div className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 rounded-full p-1 border border-red-200 dark:border-red-800">
                        <button
                          onClick={e => handleDelete(e, budget.id)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 rounded-full transition-colors"
                          title="Confirmer la suppression"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="p-1.5 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors"
                          title="Annuler"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setConfirmDeleteId(budget.id);
                        }}
                        className="p-2.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                        title="Supprimer la catégorie"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                    <div className="w-10 h-10 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                      <ArrowRight
                        size={20}
                        className="text-neutral-400 group-hover:text-[#3170dd] transition-all group-hover:translate-x-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20">
            <Filter className="mx-auto text-neutral-300 mb-4" size={48} />
            <p className="text-neutral-500">Aucune catégorie ne correspond à votre recherche.</p>
            <button
              onClick={() => {
                setSearch('');
                setFilterType('all');
              }}
              className="mt-4 text-[#3170dd] font-semibold hover:underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>
    </main>
  );
};

export default CategoriesPage;
