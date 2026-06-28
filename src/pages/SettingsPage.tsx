import { useState, useEffect } from "react";
import { Key, Save, Eye, EyeOff, Coins } from "lucide-react";
import { toast } from "react-toastify";
import { initializeGroqClient } from "../services/agent/groqClient";
import { useCurrencyStore } from "../stores/currencyStore";

const SettingsPage = () => {
  const { currency, setCurrency } = useCurrencyStore();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Charger la clé API depuis localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem("groq_api_key");
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error("Veuillez entrer une clé API");
      return;
    }

    setIsSaving(true);

    try {
      // Sauvegarder dans localStorage
      localStorage.setItem("groq_api_key", apiKey.trim());

      // Initialiser le client Groq
      initializeGroqClient();

      toast.success("Clé API sauvegardée avec succès !");
    } catch (error) {
      console.error("Error saving API key:", error);
      toast.error("Erreur lors de la sauvegarde de la clé API");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-8 text-[#1f1f1f] dark:text-neutral-100 md:px-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">Paramètres</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">
          Configurez votre assistant IA financier
        </p>

        <div className="space-y-6">
          {/* Carte Configuration API */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#3170dd] bg-opacity-10 rounded-full flex items-center justify-center">
                <Key className="w-5 h-5 text-[#3170dd]" />
              </div>
              <h2 className="text-xl font-semibold">Clé API Groq</h2>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Pour utiliser l'assistant IA, vous devez configurer votre clé API Groq.
              Obtenez-en une gratuitement sur{" "}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#3170dd] hover:underline"
              >
                console.groq.com
              </a>
            </p>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full h-12 rounded border-[1.8px] border-neutral-400 dark:border-neutral-600 bg-transparent px-4 pr-12 text-base focus:border-[#3170dd] focus:ring-2 focus:ring-[#3170dd] focus:outline-none transition-all"
                  placeholder="gsk_..."
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-800 rounded p-3 text-sm text-blue-800 dark:text-blue-200">
                ℹ️ Votre clé API est stockée localement dans votre navigateur et n'est jamais envoyée à nos serveurs.
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving || !apiKey.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[#3170dd] text-white rounded hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Sauvegarder</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Carte Préférences */}
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

          {/* Carte Informations */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
            <h2 className="text-xl font-semibold mb-4">À propos de l'assistant IA</h2>
            
            <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
              <div>
                <strong className="text-neutral-800 dark:text-neutral-200">Modèle :</strong> Llama 3.1 70B (via Groq)
              </div>
              <div>
                <strong className="text-neutral-800 dark:text-neutral-200">Capacités :</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Analyse de vos finances en temps réel</li>
                  <li>Conseils personnalisés basés sur vos données</li>
                  <li>Détection de tendances et anomalies</li>
                  <li>Prédictions de fin de mois</li>
                  <li>Création de budgets et dépenses par commande vocale</li>
                </ul>
              </div>
              <div>
                <strong className="text-neutral-800 dark:text-neutral-200">Exemples de questions :</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>"Combien j'ai dépensé ce mois ?"</li>
                  <li>"Analyse mes finances"</li>
                  <li>"Comment économiser 200€ par mois ?"</li>
                  <li>"Crée un budget restaurants de 300€"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default SettingsPage;
