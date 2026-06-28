import { SYSTEM_PROMPT, buildContextPrompt } from "../../config/agentPrompts";
import type { AgentResponse, ChatMessage } from "../../types/agent";
import { IntentType } from "../../types/agent";
import { buildFinancialContext } from "./contextBuilder";
import { getGroqClient } from "./groqClient";
import { detectIntent } from "./intentDetector";
import { processResponse } from "./responseProcessor";
import { useCurrencyStore } from "../../stores/currencyStore";

/**
 * Orchestre le traitement complet d'un message utilisateur
 */
export const handleUserMessage = async (
  message: string,
  _userId: string, // Keeping for backward compatibility
  conversationHistory: ChatMessage[] = []
): Promise<AgentResponse> => {
  const startTime = Date.now();

  try {
    // 1. Détecter l'intention
    const intent = detectIntent(message);

    // 2. Si c'est une salutation, répondre immédiatement sans appeler l'IA
    if (intent.type === IntentType.GREETING) {
      const greetings = [
        "Bonjour ! Comment puis-je vous aider avec vos finances aujourd'hui ? 😊",
        "Salut ! Je suis là pour vous aider à gérer vos finances. Que puis-je faire pour vous ? 💰",
        "Bonjour ! Comment puis-je vous assister dans la gestion de votre budget ? 📊",
        "Salut ! Prêt(e) à faire le point sur vos finances ? 💡",
      ];

      const randomGreeting =
        greetings[Math.floor(Math.random() * greetings.length)];

      return {
        message: randomGreeting,
        formatted: {
          text: randomGreeting,
          html: `<p>${randomGreeting}</p>`,
        },
        metadata: {
          intent,
          processingTime: Date.now() - startTime,
        },
      };
    }

    // 3. Si c'est une intention non financière, répondre poliment
    if (intent.type === "general_chat" && intent.confidence < 0.3) {
      const responses = [
        "Je suis désolé, je suis principalement conçu pour vous aider avec vos finances. Pouvez-vous me poser une question sur votre budget, vos dépenses ou vos revenus ? 💰",
        "Je suis spécialisé dans l'aide financière. Pouvez-vous me poser une question sur la gestion de votre argent ? 💵",
        "Je peux vous aider avec vos questions financières. Essayez de me demander quelque chose sur vos dépenses, vos budgets ou vos revenus. 📊",
      ];

      const response = responses[Math.floor(Math.random() * responses.length)];

      return {
        message: response,
        formatted: {
          text: response,
          html: `<p>${response}</p>`,
        },
        metadata: {
          intent,
          processingTime: Date.now() - startTime,
        },
      };
    }

    // 4. Pour les requêtes financières, continuer avec le traitement normal
    const financialContext = await buildFinancialContext();
    const historyText = formatConversationHistory(conversationHistory);
    const contextPrompt = buildContextPrompt(
      financialContext,
      message,
      historyText
    );
    const response = await callAI(contextPrompt, message);
    const { formatted, actions } = processResponse(response.content);
    const processingTime = Date.now() - startTime;

    return {
      message: response.content,
      formatted,
      actions: actions?.length > 0 ? actions : undefined,
      metadata: {
        intent,
        processingTime,
        tokensUsed: response.tokensUsed,
      },
    };
  } catch (error: any) {
    console.error("Error in agent orchestrator:", error);

    // Retourner une réponse d'erreur plus claire
    const errorMessage =
      "Je suis spécialisé dans les questions financières uniquement. N'hésitez pas à me poser des questions sur vos finances, votre budget, vos dépenses ou vos économies !";

    return {
      message: errorMessage,
      formatted: {
        text: errorMessage,
        html: `<p>${errorMessage}</p>`,
      },
      metadata: {
        intent: { type: "general_chat" as any, confidence: 0 },
        processingTime: Date.now() - startTime,
      },
    };
  }
};

/**
 * Appelle l'IA avec le contexte
 */
const callAI = async (
  contextPrompt: string,
  userMessage: string
): Promise<{ content: string; tokensUsed?: number }> => {
  const groqClient = getGroqClient();

  // Créer le message système avec le contexte et la devise active
  const currency = useCurrencyStore.getState().currency;
  const activeSystemPrompt = SYSTEM_PROMPT.replace(/FCFA/g, currency);
  const systemMessage = groqClient.createSystemMessage(
    activeSystemPrompt,
    contextPrompt
  );

  // Créer le message utilisateur
  const messages = [
    systemMessage,
    {
      role: "user" as const,
      content: userMessage,
    },
  ];

  // Appeler l'API
  return await groqClient.sendMessage(messages);
};

/**
 * Formate l'historique de conversation pour le contexte
 */
const formatConversationHistory = (history: ChatMessage[]): string => {
  if (history.length === 0) {
    return "Aucun historique (première interaction)";
  }

  // Prendre les 5 derniers messages
  const recentHistory = history.slice(-5);

  return recentHistory
    .map((msg) => {
      const role = msg.role === "user" ? "Utilisateur" : "Assistant";
      return `${role}: ${msg.content}`;
    })
    .join("\n");
};

/**
 * Traite un message avec streaming (pour future implémentation)
 */
export const handleUserMessageStream = async (
  message: string,
  userId: string,
  conversationHistory: ChatMessage[] = [],
  onChunk: (chunk: string) => void
): Promise<AgentResponse> => {
  // Pour l'instant, on utilise la version non-streaming
  // TODO: Implémenter le streaming avec Groq
  const response = await handleUserMessage(
    message,
    userId,
    conversationHistory
  );
  onChunk(response.message);
  return response;
};

/**
 * Vérifie si l'agent est prêt à fonctionner
 */
export const isAgentReady = (): boolean => {
  try {
    const groqClient = getGroqClient();
    return groqClient.isConfigured();
  } catch {
    return false;
  }
};
