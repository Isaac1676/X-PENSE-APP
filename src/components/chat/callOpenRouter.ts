import { formatCurrency } from "../../utils";

export async function callOpenRouter(
  userInput: string,
  balance: number,
  totalIncomes: number,
  totalExpenses: number
) {
  try {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    const baseInstructions = `Tu es un assistant amical spécialisé en finance personnelle et gestion budgétaire.
Tu aides l’utilisateur à analyser ses revenus, ses dépenses et son solde.
Tu fournis des recommandations pratiques, bienveillantes et adaptées au contexte.
Tu privilégies les sujets financiers, mais tu peux aussi répondre brièvement aux questions naturelles sur toi ou ton rôle si elles sont posées.
Réponds uniquement en français.`;

    const now = new Date();
    const monthName = now.toLocaleString("fr-FR", { month: "long" });

    const userPrompt = `
Voici mes données pour ${monthName} :
- Revenus : ${formatCurrency(totalIncomes)}
- Dépenses : ${formatCurrency(totalExpenses)}
- Solde : ${formatCurrency(balance)}

${userInput}`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistralai/mistral-small-3.2-24b-instruct:free",
          messages: [
            { role: "system", content: baseInstructions },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Erreur API : ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error("Aucune réponse valide reçue du modèle.");
    }

    return reply;
  } catch (error) {
    console.error("Erreur lors de l'appel OpenRouter :", error);
    throw error;
  }
}
