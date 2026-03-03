const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export type BudgetAiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const FALLBACK_REPLY =
  "Je suis l’IA KashUP. Pour optimiser vos gains, concentrez vos boosts sur les catégories les plus dynamiques (restaurants, culture) et transformez vos dépenses récurrentes en bons d’achat pour augmenter votre cashback.";

export async function getBudgetAiAdvice(messages: BudgetAiMessage[]): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    return FALLBACK_REPLY;
  }

  try {
    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            "Tu es l'IA KashUP, experte en analyse des dépenses, cashback et stratégies de boosts. Tes réponses sont courtes, actionnables et orientées business (entrées, sorties, récurrences, réseau KashUP).",
        },
        ...messages,
      ],
      temperature: 0.3,
      max_tokens: 220,
    };

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('OpenAI error', await response.text());
      return FALLBACK_REPLY;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ?? FALLBACK_REPLY;
  } catch (error) {
    console.warn('OpenAI fetch failed', error);
    return FALLBACK_REPLY;
  }
}

