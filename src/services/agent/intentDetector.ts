import type { Intent, IntentType } from "../../types/agent";
import { IntentType as IntentTypeEnum } from "../../types/agent";

/**
 * Détecte l'intention de l'utilisateur à partir de son message
 */
export const detectIntent = (message: string): Intent => {
  const lowerMessage = message.toLowerCase().trim();

  // Mots-clés pour chaque type d'intention
  const patterns = {
    // Salutations et messages de base
    greeting: [
      "bonjour",
      "salut",
      "coucou",
      "hello",
      "hey",
      "bonsoir",
      "bon matin",
      "comment ça va",
      "ça va",
      "bienvenue",
      "salutations",
      "yo",
      "hi",
      "hey",
      "salut",
      "comment allez-vous",
      "comment vas-tu",
    ],
    // Intentions financières
    query_data: [
      "combien",
      "quel",
      "quelle",
      "quels",
      "quelles",
      "montant",
      "total",
      "dépensé",
      "reste",
      "restant",
      "budget",
      "catégorie",
      "revenus",
      "dépenses",
      "où en suis",
      "situation",
      "solde",
      "compte",
      "portefeuille",
    ],
    analysis: [
      "analyse",
      "analyser",
      "résumé",
      "bilan",
      "comment vont",
      "état",
      "tendance",
      "évolution",
      "comparaison",
      "comparer",
      "différence",
      "statistique",
      "bilan",
    ],
    advice: [
      "conseil",
      "conseille",
      "aide",
      "aider",
      "économiser",
      "épargner",
      "optimiser",
      "améliorer",
      "comment faire",
      "que faire",
      "suggestion",
      "recommandation",
      "astuce",
    ],
    prediction: [
      "prédiction",
      "prévoir",
      "estimer",
      "projection",
      "finir le mois",
      "fin de mois",
      "à ce rythme",
      "si je continue",
      "dans 6 mois",
      "futur",
      "prévision",
      "estimation",
    ],
    action_create: [
      "créer",
      "crée",
      "ajouter",
      "ajoute",
      "nouveau",
      "nouvelle",
      "enregistrer",
      "enregistre",
      "ajout",
      "création",
      "nouvel",
      "nouveaux",
    ],
    action_modify: [
      "modifier",
      "modifie",
      "changer",
      "change",
      "augmenter",
      "augmente",
      "diminuer",
      "diminue",
      "mettre à jour",
      "update",
      "ajuster",
      "mets à jour",
      "maj",
    ],
    action_delete: [
      "supprimer",
      "supprime",
      "effacer",
      "efface",
      "retirer",
      "retire",
      "enlever",
      "enlève",
      "efface",
      "retire",
      "suppression",
    ],
  };

  // Compter les correspondances pour chaque intention
  const scores: Record<IntentType, number> = {
    greeting: 0,
    query_data: 0,
    analysis: 0,
    advice: 0,
    prediction: 0,
    action_create: 0,
    action_modify: 0,
    action_delete: 0,
    general_chat: 0,
  };

  // Calculer les scores
  Object.entries(patterns).forEach(([intent, keywords]) => {
    keywords.forEach((keyword) => {
      if (lowerMessage.includes(keyword)) {
        scores[intent as IntentType] += 1;
      }
    });
  });

  // Trouver l'intention avec le score le plus élevé
  let maxScore = 0;
  let detectedIntent: IntentType = IntentTypeEnum.GENERAL_CHAT;

  Object.entries(scores).forEach(([intent, score]) => {
    if (score > maxScore) {
      maxScore = score;
      detectedIntent = intent as IntentType;
    }
  });

  // Si c'est une salutation, priorité maximale
  if (scores.greeting > 0) {
    detectedIntent = IntentTypeEnum.GREETING;
    maxScore = scores.greeting;
  }

  // Si aucun mot-clé trouvé ou si le score est trop bas, c'est du chat général
  const confidence = maxScore > 0 ? Math.min(maxScore / 3, 1) : 0.1;

  // Extraire les paramètres si c'est une action
  const parameters = extractParameters(lowerMessage, detectedIntent);

  return {
    type: detectedIntent,
    confidence,
    parameters,
  };
};

/**
 * Extrait les paramètres d'une demande d'action
 */
const extractParameters = (
  message: string,
  intent: IntentType
): Record<string, any> | undefined => {
  const params: Record<string, any> = {};

  // Pour les actions de création
  if (intent === IntentTypeEnum.ACTION_CREATE) {
    // Extraire le type (budget, dépense, revenu)
    if (message.includes("budget")) {
      params.type = "budget";
    } else if (message.includes("dépense")) {
      params.type = "expense";
    } else if (message.includes("revenu")) {
      params.type = "income";
    }

    // Extraire le montant (chercher un nombre suivi de FCFA ou EUR/€)
    const amountMatch = message.match(/(\d+(?:\s?\d+)*)\s*(?:fcfa|€|eur|euros?)/i);
    if (amountMatch) {
      params.amount = parseInt(amountMatch[1].replace(/\s/g, ""));
    }

    // Extraire le nom (après "budget", "dépense", "revenu")
    const namePatterns = [
      /budget\s+([a-zàâäéèêëïîôùûüç\s]+?)(?:\s+de|\s+à|\s+pour|$)/i,
      /dépense\s+([a-zàâäéèêëïîôùûüç\s]+?)(?:\s+de|\s+à|\s+pour|$)/i,
      /revenu\s+([a-zàâäéèêëïîôùûüç\s]+?)(?:\s+de|\s+à|\s+pour|$)/i,
    ];

    for (const pattern of namePatterns) {
      const nameMatch = message.match(pattern);
      if (nameMatch) {
        params.name = nameMatch[1].trim();
        break;
      }
    }
  }

  // Pour les actions de modification
  if (intent === IntentTypeEnum.ACTION_MODIFY) {
    // Extraire le montant (support FCFA, EUR, €)
    const amountMatch = message.match(/(\d+(?:\s?\d+)*)\s*(?:fcfa|€|eur|euros?)/i);
    if (amountMatch) {
      params.newAmount = parseInt(amountMatch[1].replace(/\s/g, ""));
    }

    // Détecter augmentation ou diminution
    if (message.includes("augment")) {
      params.operation = "increase";
    } else if (message.includes("diminu") || message.includes("rédui")) {
      params.operation = "decrease";
    }
  }

  return Object.keys(params).length > 0 ? params : undefined;
};

/**
 * Détermine si un message nécessite une confirmation avant action
 */
export const requiresConfirmation = (intent: Intent): boolean => {
  return [
    IntentTypeEnum.ACTION_CREATE,
    IntentTypeEnum.ACTION_MODIFY,
    IntentTypeEnum.ACTION_DELETE,
  ].includes(intent.type);
};
