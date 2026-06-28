import { Bell, Coins, Download, Hash, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useBudgetStore } from "../stores/budgetStore";
import { useCurrencyStore } from "../stores/currencyStore";
import { useExpenseStore } from "../stores/expenseStore";
import { useIncomeStore } from "../stores/incomeStore";
import { usePreferencesStore, type DateFormatType, type NumberFormatType } from "../stores/preferencesStore";
import { useUserStore } from "../stores/userStore";

const SettingsPage = () => {
  const { currency, setCurrency } = useCurrencyStore();
  const {
    numberFormat, setNumberFormat,
    dateFormat, setDateFormat,
    fiscalMonthStart, setFiscalMonthStart,
    notificationsEnabled, setNotificationsEnabled
  } = usePreferencesStore();

  const { budgets, deleteAllBudgets } = useBudgetStore();
  const { expenses, deleteAllExpenses } = useExpenseStore();
  const { incomes, deleteAllIncomes } = useIncomeStore();
  const { user } = useUserStore();

  const handleNotificationToggle = async () => {
    if (!notificationsEnabled) {
      if (!("Notification" in window)) {
        toast.error("Ce navigateur ne supporte pas les notifications de bureau");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast.success("Notifications activées !");

        // Notification test
        new Notification("XPense App", {
          body: "Les notifications sont bien configurées.",
          icon: "/pwa-192x192.png"
        });
      } else {
        toast.error("Permission refusée pour les notifications");
      }
    } else {
      setNotificationsEnabled(false);
      toast.info("Notifications désactivées");
    }
  };

  const handleExportData = () => {
    try {
      const data = {
        budgets,
        expenses,
        incomes,
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `xpense_export_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Données exportées avec succès !");
    } catch (error) {
      toast.error("Erreur lors de l'exportation des données");
    }
  };

  const handleResetData = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour effectuer cette action");
      return;
    }

    const confirmation = window.confirm(
      "ATTENTION ! Vous êtes sur le point de supprimer DÉFINITIVEMENT tous vos budgets, dépenses et revenus. Cette action est irréversible. Voulez-vous vraiment continuer ?"
    );

    if (confirmation) {
      const secondConfirmation = window.prompt('Pour confirmer la suppression, tapez "SUPPRIMER"');
      if (secondConfirmation === "SUPPRIMER") {
        try {
          await deleteAllExpenses(user.id);
          await deleteAllIncomes(user.id);
          await deleteAllBudgets(user.id);
          toast.success("Toutes les données ont été supprimées");
        } catch (error) {
          console.error("Erreur de suppression:", error);
          toast.error("Échec lors de la suppression des données");
        }
      } else {
        toast.info("Suppression annulée");
      }
    }
  };

  return (
    <main className="min-h-screen px-6 py-8 text-[#1f1f1f] dark:text-neutral-100 md:px-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">Paramètres</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">
          Gérez les préférences de votre application
        </p>

        <div className="space-y-6">

          {/* Carte Préférences (Devise) */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#3170dd] bg-opacity-10 rounded-full flex items-center justify-center">
                <Coins className="w-5 h-5 text-[#3170dd]" />
              </div>
              <h2 className="text-xl font-semibold">Devise de l'application</h2>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
              Choisissez la devise préférée pour l'affichage de vos budgets, dépenses et rapports financiers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setCurrency("FCFA");
                  toast.success("Devise configurée en Franc CFA (FCFA) !");
                }}
                className={`flex items-center justify-between p-4 rounded-lg border-2 text-left transition-all duration-300 ${
                  currency === "FCFA"
                    ? "border-[#3170dd] bg-[#3170dd]/5 dark:bg-[#3170dd]/10 scale-[1.02]"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-transparent"
                }`}
              >
                <div className="flex flex-col items-start">
                  <span className="font-bold text-lg text-neutral-800 dark:text-neutral-100">Franc CFA (FCFA)</span>
                  <span className="text-xs text-neutral-500">Afrique de l'Ouest/Centrale (XOF/XAF)</span>
                </div>
                <span className={`text-2xl font-black ${currency === "FCFA" ? "text-[#3170dd]" : "text-neutral-400"}`}>FCFA</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrency("EUR");
                  toast.success("Devise configurée en Euro (€) !");
                }}
                className={`flex items-center justify-between p-4 rounded-lg border-2 text-left transition-all duration-300 ${
                  currency === "EUR"
                    ? "border-[#3170dd] bg-[#3170dd]/5 dark:bg-[#3170dd]/10 scale-[1.02]"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-transparent"
                }`}
              >
                <div className="flex flex-col items-start">
                  <span className="font-bold text-lg text-neutral-800 dark:text-neutral-100">Euro (€)</span>
                  <span className="text-xs text-neutral-500">Union Européenne (EUR)</span>
                </div>
                <span className={`text-3xl font-black ${currency === "EUR" ? "text-[#3170dd]" : "text-neutral-400"}`}>€</span>
              </button>
            </div>
          </div>

          {/* Carte Format et Affichage */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500 bg-opacity-10 rounded-full flex items-center justify-center">
                <Hash className="w-5 h-5 text-purple-500" />
              </div>
              <h2 className="text-xl font-semibold">Format et Affichage</h2>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
              Personnalisez l'affichage des données selon vos habitudes.
            </p>

            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-medium mb-2">Format des Nombres</label>
                <select
                  value={numberFormat}
                  onChange={(e) => setNumberFormat(e.target.value as NumberFormatType)}
                  className="w-full h-12 rounded-lg border-[1.8px] border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 px-4 text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all dark:text-neutral-100"
                >
                  <option value="space">Avec Espace (1 000,00)</option>
                  <option value="comma">Avec Virgule (1,000.00)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Format des Dates</label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value as DateFormatType)}
                  className="w-full h-12 rounded-lg border-[1.8px] border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 px-4 text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all dark:text-neutral-100"
                >
                  <option value="DD/MM/YYYY">Jour/Mois/Année (JJ/MM/AAAA)</option>
                  <option value="MM/DD/YYYY">Mois/Jour/Année (MM/JJ/AAAA)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Début du mois financier</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={fiscalMonthStart}
                  onChange={(e) => setFiscalMonthStart(Number(e.target.value))}
                  className="w-full h-12 rounded-lg border-[1.8px] border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 px-4 text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all dark:text-neutral-100"
                />
                <p className="text-xs text-neutral-500 mt-1">Le jour où vos budgets mensuels se réinitialisent.</p>
              </div>
            </div>
          </div>

          {/* Carte Notifications et Alertes */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500 bg-opacity-10 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-emerald-500" />
              </div>
              <h2 className="text-xl font-semibold">Notifications et Alertes</h2>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border-2 border-neutral-200 dark:border-neutral-700">
               <div>
                  <h3 className="font-bold">Notifications système</h3>
                  <p className="text-sm text-neutral-500">Recevez des alertes locales pour vos budgets.</p>
               </div>
               <button
                  onClick={handleNotificationToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${notificationsEnabled ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
               >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
               </button>
            </div>
          </div>

          {/* Carte Gestion des données */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6 border-l-4 border-l-red-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500 bg-opacity-10 rounded-full flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold">Gestion des données</h2>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
              Exportez vos données ou réinitialisez complètement votre compte.
            </p>

            <div className="flex flex-col gap-4">
               <button
                 onClick={handleExportData}
                 className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 rounded-lg font-medium transition-colors border border-neutral-300 dark:border-neutral-600"
               >
                 <Download size={18} />
                 Exporter toutes les données (JSON)
               </button>

               <button
                 onClick={handleResetData}
                 className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors border border-red-200 dark:border-red-800"
               >
                 <Trash2 size={18} />
                 Réinitialiser le compte (Supprimer les données)
               </button>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
};

export default SettingsPage;
