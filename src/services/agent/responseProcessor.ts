import type { Action, ActionButton, FormattedMessage } from "../../types/agent";
import { ActionType } from "../../types/agent";
import { formatCurrency } from "../../utils";

/**
 * Traite la réponse brute de l'IA et la formate
 */
export const processResponse = (
  rawResponse: string,
): { formatted: FormattedMessage; actions: Action[] } => {
  // Détecter les actions dans la réponse
  const actions = detectActions(rawResponse);

  // Nettoyer la réponse des marqueurs d'action
  let cleanedResponse = rawResponse;
  actions.forEach((_action) => {
    const actionPattern = /\[ACTION:[^\]]+\]/g;
    cleanedResponse = cleanedResponse.replace(actionPattern, "");
  });

  // Formater la réponse
  const formatted = formatMessage(cleanedResponse.trim(), actions);

  return {
    formatted,
    actions,
  };
};

/**
 * Détecte les actions dans la réponse de l'IA
 * Format: [ACTION:type:param1=value1,param2=value2]
 */
const detectActions = (response: string): Action[] => {
  const actions: Action[] = [];
  const actionPattern = /\[ACTION:([^:]+):([^\]]+)\]/g;

  let match;
  while ((match = actionPattern.exec(response)) !== null) {
    const actionType = match[1];
    const paramsString = match[2];

    // Parser les paramètres
    const parameters: Record<string, any> = {};
    paramsString.split(",").forEach((param) => {
      const [key, value] = param.split("=");
      if (key && value) {
        parameters[key.trim()] = value.trim();
      }
    });

    // Convertir le type d'action
    let type: ActionType;
    switch (actionType) {
      case "create_budget":
        type = ActionType.CREATE_BUDGET;
        break;
      case "add_expense":
        type = ActionType.ADD_EXPENSE;
        break;
      case "add_income":
        type = ActionType.ADD_INCOME;
        break;
      case "modify_budget":
        type = ActionType.MODIFY_BUDGET;
        break;
      case "delete_budget":
        type = ActionType.DELETE_BUDGET;
        break;
      default:
        continue;
    }

    const action: Action = {
      id: crypto.randomUUID(),
      type,
      parameters,
      requiresConfirmation: true,
      confirmationMessage: buildConfirmationMessage(type, parameters),
      status: "pending",
    };

    actions.push(action);
  }

  return actions;
};

/**
 * Construit un message de confirmation pour une action
 */
const buildConfirmationMessage = (
  type: ActionType,
  params: Record<string, any>,
): string => {
  switch (type) {
    case ActionType.CREATE_BUDGET:
      return `Créer un budget "${params.name}" de ${formatCurrency(params.amount)} (${params.type === "capped" ? "plafonné" : "suivi"}) ?`;

    case ActionType.ADD_EXPENSE:
      return `Ajouter une dépense "${params.name}" de ${formatCurrency(params.amount)} ?`;

    case ActionType.ADD_INCOME:
      return `Ajouter un revenu "${params.name}" de ${formatCurrency(params.amount)} ?`;

    case ActionType.MODIFY_BUDGET:
      return `Modifier le budget avec un nouveau montant de ${formatCurrency(params.amount)} ?`;

    case ActionType.DELETE_BUDGET:
      return `Supprimer le budget "${params.name}" ?`;

    default:
      return "Confirmer cette action ?";
  }
};

/**
 * Formate le message pour l'affichage
 */
const formatMessage = (text: string, actions: Action[]): FormattedMessage => {
  // Convertir markdown basique en HTML
  let html = text
    // Gras
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // Italique
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    // Listes à puces
    .replace(/^[•\-]\s+(.+)$/gm, "<li>$1</li>")
    // Sauts de ligne
    .replace(/\n/g, "<br>");

  // Wrapper les listes
  if (html.includes("<li>")) {
    html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");
  }

  // Créer les boutons d'action
  const actionButtons: ActionButton[] = actions.map((action) => ({
    id: action.id,
    label: getActionButtonLabel(action.type),
    action,
    variant: getActionButtonVariant(action.type),
  }));

  return {
    text,
    html,
    actionButtons: actionButtons.length > 0 ? actionButtons : undefined,
  };
};

/**
 * Retourne le label du bouton pour un type d'action
 */
const getActionButtonLabel = (type: ActionType): string => {
  switch (type) {
    case ActionType.CREATE_BUDGET:
      return "Créer ce budget";
    case ActionType.ADD_EXPENSE:
      return "Ajouter cette dépense";
    case ActionType.ADD_INCOME:
      return "Ajouter ce revenu";
    case ActionType.MODIFY_BUDGET:
      return "Modifier";
    case ActionType.DELETE_BUDGET:
      return "Supprimer";
    default:
      return "Confirmer";
  }
};

/**
 * Retourne la variante du bouton pour un type d'action
 */
const getActionButtonVariant = (
  type: ActionType,
): "primary" | "secondary" | "danger" => {
  switch (type) {
    case ActionType.DELETE_BUDGET:
    case ActionType.DELETE_EXPENSE:
      return "danger";
    case ActionType.MODIFY_BUDGET:
    case ActionType.MODIFY_EXPENSE:
      return "secondary";
    default:
      return "primary";
  }
};

/**
 * Extrait les données structurées d'une réponse (montants, pourcentages, etc.)
 */
export const extractStructuredData = (
  response: string,
): Record<string, any> => {
  const data: Record<string, any> = {};

  // Extraire les montants (supporte FCFA, EUR et €)
  const amountMatches = response.matchAll(/(\d+(?:\s?\d+)*)\s*(?:FCFA|EUR|€)/gi);
  const amounts: number[] = [];
  for (const match of amountMatches) {
    amounts.push(parseInt(match[1].replace(/\s/g, "")));
  }
  if (amounts.length > 0) {
    data.amounts = amounts;
  }

  // Extraire les pourcentages
  const percentMatches = response.matchAll(/(\d+)%/g);
  const percentages: number[] = [];
  for (const match of percentMatches) {
    percentages.push(parseInt(match[1]));
  }
  if (percentages.length > 0) {
    data.percentages = percentages;
  }

  return data;
};
