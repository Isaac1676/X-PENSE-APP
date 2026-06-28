import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import MessageInput from "../components/chat/MessageInput";
import { useChatStore } from "../stores/chatStore";
import { useUserStore } from "../stores/userStore";
import { useCurrencyStore } from "../stores/currencyStore";

const ChatBotPage = () => {
  const { user } = useUserStore();
  const { currency } = useCurrencyStore();
  const {
    messages,
    getAllChats,
    isLoading,
    sendMessage,
    confirmAction,
    cancelAction,
  } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fonction pour envoyer une suggestion
  const handleSuggestion = (message: string) => {
    if (user) {
      sendMessage(message, user.id);
    }
  };

  // Charger les messages à la première utilisation
  useEffect(() => {
    if (user) getAllChats(user.id);
  }, [user, getAllChats]);

  // Scroll automatique vers le bas quand messages changent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen dark:bg-neutral-900 transition-colors duration-500">
      <header className="flex-shrink-0 px-6 py-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700">
        <h1 className="text-3xl md:text-4xl font-bold text-[#1f1f1f] dark:text-neutral-100">
          Bot – Assistant Financier
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
          Posez vos questions sur vos finances personnelles
        </p>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-6 py-4 md:px-8">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#3170dd] rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
                  Commencez une conversation
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
                  Posez des questions sur vos finances, demandez des analyses ou
                  des conseils personnalisés.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() =>
                      handleSuggestion("Combien j'ai dépensé ce mois ?")
                    }
                    disabled={isLoading}
                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Combien j'ai dépensé ce mois ?
                  </button>
                  <button
                    onClick={() => handleSuggestion("Analyse mes finances")}
                    disabled={isLoading}
                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Analyse mes finances
                  </button>
                  <button
                    onClick={() =>
                      handleSuggestion(
                        currency === "EUR"
                          ? "Comment économiser 200 € ?"
                          : "Comment économiser 200 FCFA ?"
                      )
                    }
                    disabled={isLoading}
                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Comment économiser {currency === "EUR" ? "200 €" : "200 FCFA"} ?
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] md:max-w-[60%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#3170dd] text-white rounded-br-md"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-md"
                    }`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>
                        {msg.formatted?.text || msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Boutons d'action si présents */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.actions.map((action) => (
                          <div
                            key={action.id}
                            className="flex items-center gap-2"
                          >
                            <button
                              onClick={() =>
                                user && confirmAction(action.id, user.id)
                              }
                              disabled={isLoading}
                              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Check size={14} />
                              Confirmer
                            </button>
                            <button
                              onClick={() => cancelAction(action.id)}
                              disabled={isLoading}
                              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <X size={14} />
                              Annuler
                            </button>
                            <span className="text-xs text-neutral-600 dark:text-neutral-400">
                              {action.confirmationMessage}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      className={`text-xs mt-2 opacity-70 ${
                        msg.role === "user"
                          ? "text-blue-100"
                          : "text-neutral-500 dark:text-neutral-400"
                      }`}
                    >
                      {new Date(msg.date).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="px-6 py-4 md:px-8">
          <MessageInput />
        </div>
      </div>
    </div>
  );
};

export default ChatBotPage;
