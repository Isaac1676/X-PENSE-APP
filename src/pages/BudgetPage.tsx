import { ChevronLeft, Trash, Edit } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify';
import EditCategoryModal from '../components/modals/EditCategoryModal';
import ExpenseForm from '../components/expenseForm/ExpenseForm';
import IncomeForm from '../components/incomeForm/incomeForm';
import Progressbar from '../components/progressBar/Progressbar';
import SEO from '../components/SEO';
import Table from '../components/table/Table';
import { useBudgetStore } from '../stores/budgetStore';
import { useExpenseStore } from '../stores/expenseStore';
import { useIncomeStore } from '../stores/incomeStore';
import { useUserStore } from '../stores/userStore';
import { formatCurrency } from '../utils';

const BudgetPage = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { budgetID } = useParams();
  const { expenses, getExpenseBudget, deleteExpensesByBudget } = useExpenseStore();
  const { incomes, getIncomeBudget, deleteIncomesByBudget } = useIncomeStore();
  const { getBudgetById, deleteBudget } = useBudgetStore();
  const { user } = useUserStore();
  const navigate = useNavigate();

  const budget = getBudgetById(budgetID);
  const spent = getExpenseBudget(budgetID);
  const added = getIncomeBudget(budgetID);

  if (!user) {
    return <Navigate to="/" />;
  }

  const handleDelete = async () => {
    try {
      if (!budgetID || !user) return;

      const confirmDelete = window.confirm(
        'Êtes-vous sûr de vouloir supprimer cette catégorie ? Toutes les transactions associées seront également supprimées.'
      );

      if (!confirmDelete) return;

      // Supprimer toutes les transactions liées
      await deleteExpensesByBudget(user.id, budgetID);
      await deleteIncomesByBudget(user.id, budgetID);

      // Supprimer le budget lui-même
      await deleteBudget(user.id, budgetID);

      toast.success('Catégorie et transactions supprimées');
      navigate(`/h`);
    } catch (error) {
      console.error('Erreur lors de la suppression en cascade:', error);
      toast.error('Échec lors de la suppression');
    }
  };

  if (!budget) {
    return (
      <>
        <SEO title="Chargement..." description="Chargement des détails du budget." />
        <div className="p-8 text-lg text-center">Chargement...</div>
      </>
    );
  }

  // Calculs selon le type
  const isCapped = budget.type === 'capped';
  const restant = isCapped ? (budget.amount || 0) + added - spent : 0;
  const dangerClass =
    isCapped && restant < 0 ? 'text-[#e33131] dark:text-[#e33131]' : 'dark:text-neutral-100';

  return (
    <main className="min-h-screen px-6 py-8 space-y-8 md:px-16 text-[#1f1f1f] dark:text-neutral-100 transition-colors duration-500">
      <SEO
        title={`${budget.name} - Budget`}
        description={`Suivi des dépenses pour le budget ${budget.name}.`}
      />
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-0">
          Aperçu de <span className="text-[#3170dd]">{budget.name}</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isCapped ? (
          // BUDGET PLAFONNÉ
          <div className="p-5 flex flex-col gap-4 justify-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                Budget plafonné
              </span>
            </div>
            <div className="flex justify-between items-center">
              <h3 className={`text-xl font-bold ${dangerClass}`}>{budget.name}</h3>
              <p className={`text-lg font-extrabold ${dangerClass}`}>
                {formatCurrency(budget.amount || 0)}
              </p>
            </div>
            <Progressbar
              spent={
                (budget.amount || 0) + added > 0
                  ? (spent / ((budget.amount || 0) + added)) * 100
                  : 0
              }
              state={restant > 0 ? true : false}
              even
            />
            <div className="flex justify-between text-xs">
              <div className="flex flex-col gap-1">
                <p className={`font-medium ${dangerClass}`}>{formatCurrency(spent)} dépensé</p>
                <p className={`font-medium ${dangerClass}`}>{formatCurrency(added)} ajouté</p>
              </div>
              <p className={`font-bold text-sm ${dangerClass}`}>
                {formatCurrency(restant)} restants
              </p>
            </div>
            <div className="text-center py-1.5 px-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-[10px] font-bold">
              {restant > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 uppercase">
                  Dans les limites
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400 uppercase">Budget dépassé</span>
              )}
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 cursor-pointer py-2 text-[#3170dd] hover:text-white hover:bg-[#3170dd] border border-[#3170dd] rounded-lg text-xs font-bold transition-all"
              >
                <Edit className="w-3.5 h-3.5" />
                Modifier
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-2 px-3 cursor-pointer py-2 text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded-lg text-xs font-bold transition-all"
              >
                <Trash className="w-3.5 h-3.5" />
                Supprimer
              </button>
            </div>
          </div>
        ) : budget.type === 'savings' ? (
          // BUDGET ÉPARGNE
          <div className="p-5 flex flex-col gap-4 justify-center bg-emerald-50/10 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                Objectif d'épargne
              </span>
            </div>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {budget.name}
              </h3>
              <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(budget.amount || 0)}
              </p>
            </div>

            {/* Calculs Spécifiques Épargne */}
            {(() => {
              const currentSaved = added - spent;
              const goal = budget.amount || 0;
              const percentage = goal > 0 ? (currentSaved / goal) * 100 : 0;
              const remainingToGoal = Math.max(0, goal - currentSaved);

              return (
                <>
                  <Progressbar
                    spent={percentage}
                    state={true}
                    even={false}
                    customColor="bg-emerald-500"
                  />
                  <div className="flex justify-between text-xs">
                    <div className="flex flex-col gap-1">
                      <p className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(currentSaved)} épargnés
                      </p>
                      <div className="text-[10px] text-neutral-500">
                        (+{formatCurrency(added)} / -{formatCurrency(spent)})
                      </div>
                    </div>
                    <p className="font-bold text-sm text-neutral-500 whitespace-nowrap">
                      -{formatCurrency(remainingToGoal)}
                    </p>
                  </div>
                  <div className="text-center py-1.5 px-3 rounded-lg bg-emerald-100/30 dark:bg-emerald-800/20 text-[10px] font-bold">
                    {currentSaved >= goal ? (
                      <span className="text-emerald-600 dark:text-emerald-400 uppercase">
                        Objectif atteint ! 🏆
                      </span>
                    ) : (
                      <span className="text-neutral-600 dark:text-neutral-400 uppercase">
                        Continuez comme ça !
                      </span>
                    )}
                  </div>
                </>
              );
            })()}

            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 cursor-pointer py-2 text-[#3170dd] hover:text-white hover:bg-[#3170dd] border border-[#3170dd] rounded-lg text-xs font-bold transition-all"
              >
                <Edit className="w-3.5 h-3.5" />
                Modifier
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-2 px-3 cursor-pointer py-2 text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded-lg text-xs font-bold transition-all"
              >
                <Trash className="w-3.5 h-3.5" />
                Supprimer
              </button>
            </div>
          </div>
        ) : (
          // CATÉGORIE DE SUIVI
          <div className="p-5 flex flex-col gap-4 justify-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full">
                Catégorie de suivi
              </span>
            </div>
            <h3 className="text-xl font-bold">{budget.name}</h3>

            <div className="text-center py-5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
              <p className="text-4xl font-extrabold text-[#3170dd]">{formatCurrency(spent)}</p>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">
                dépensés ce mois-ci
              </p>
            </div>

            {added > 0 && (
              <div className="text-center text-xs font-medium">
                <p className="text-emerald-600 dark:text-emerald-400">
                  + {formatCurrency(added)} ajoutés
                </p>
              </div>
            )}

            <div className="text-[10px] font-medium text-center text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/30 p-2.5 rounded-lg leading-relaxed">
              Cette catégorie sert uniquement à suivre vos flux sans limite.
            </div>

            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 cursor-pointer py-2 text-[#3170dd] hover:text-white hover:bg-[#3170dd] border border-[#3170dd] rounded-lg text-xs font-bold transition-all"
              >
                <Edit className="w-3.5 h-3.5" />
                Modifier
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-2 px-3 cursor-pointer py-2 text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded-lg text-xs font-bold transition-all"
              >
                <Trash className="w-3.5 h-3.5" />
                Supprimer
              </button>
            </div>
          </div>
        )}

        <div className="lg:col-span-1">
          <ExpenseForm budget={budget} />
        </div>
        <div className="lg:col-span-1">
          <IncomeForm budget={budget} />
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl md:text-3xl font-semibold mb-4">Transactions récentes</h2>
        <div>
          <Table
            expenses={expenses.filter(e => e.budget === budgetID)}
            incomes={incomes.filter(e => e.budget === budgetID)}
          />
          {(expenses.length > 10 || incomes.length > 10) && (
            <div className="mt-4 text-center">
              <Link
                to="/h/transactions"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#3170dd] hover:text-[#1e5bbf] transition-colors duration-200 rounded-md border border-[#3170dd] hover:bg-[#f0f5ff] dark:border-[#4a8aff] dark:text-[#4a8aff] dark:hover:bg-[#1a2236]"
              >
                Voir toutes les transactions
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 ml-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </div>

      {isEditing && budget && (
        <EditCategoryModal
          budget={budget}
          onClose={() => setIsEditing(false)}
        />
      )}
    </main>
  );
};

export default BudgetPage;
