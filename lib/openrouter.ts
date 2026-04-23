// Minimal OpenRouter client (OpenAI-compatible API).
// Used for natural-language conflict explanations.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

export async function explainConflictFr(params: {
  summary: string
  events: Array<{ title: string; start_at: string; end_at: string; calendar: string }>
  type: string
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    // Graceful fallback if no key configured.
    return fallbackExplanation(params)
  }

  const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini"

  const prompt = [
    `Tu es l'assistant de Constellation Lite, un copilote de planification.`,
    `Explique ce conflit en français, en 2 phrases courtes, ton sobre et précis.`,
    `Type de conflit : ${params.type}.`,
    `Événements concernés :`,
    ...params.events.map((e) => `- « ${e.title} » (${e.calendar}) du ${e.start_at} au ${e.end_at}`),
    `Contexte : ${params.summary}`,
  ].join("\n")

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://constellation.app",
        "X-Title": "Constellation Lite",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Tu réponds toujours en français, de façon concise et factuelle." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 180,
      }),
    })
    if (!res.ok) {
      console.log("[v0] OpenRouter error:", res.status, await res.text())
      return fallbackExplanation(params)
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content?.trim()
    return content && content.length > 0 ? content : fallbackExplanation(params)
  } catch (err) {
    console.log("[v0] OpenRouter fetch failed:", err)
    return fallbackExplanation(params)
  }
}

function fallbackExplanation(params: { summary: string; type: string }): string {
  const labels: Record<string, string> = {
    strict_overlap: "Ces événements se chevauchent dans le temps.",
    buffer_violation: "L'intervalle entre ces événements est trop court.",
    school_holiday_violation: "Cet événement tombe pendant une période de vacances scolaires.",
    working_hours_violation: "Cet événement est planifié en dehors des heures de travail.",
    priority_violation: "La priorité des événements en conflit pose problème.",
  }
  return `${labels[params.type] ?? params.summary} Vérifiez l'agenda pour arbitrer.`
}
