import OpenAI from "openai";
import type { AnalysisResponse } from "@/lib/types";

export async function rewriteAnalysisWithLlm({
  prompt,
  draft
}: {
  prompt: string;
  draft: AnalysisResponse;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return draft;
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  const completion = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are a geoscience prospecting assistant. Refine the provided heuristic analysis into concise, safety-aware prospecting guidance. Do not invent legal permissions or guarantee success. Return JSON only."
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({ prompt, draft })
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "prospecting_analysis",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string" },
            warnings: {
              type: "array",
              items: { type: "string" }
            },
            candidateNotes: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  id: { type: "string" },
                  reasoning: {
                    type: "array",
                    items: { type: "string" }
                  },
                  risks: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["id", "reasoning", "risks"]
              }
            }
          },
          required: ["summary", "warnings", "candidateNotes"]
        }
      }
    }
  });

  const payload = JSON.parse(completion.output_text) as {
    summary: string;
    warnings: string[];
    candidateNotes: Array<{ id: string; reasoning: string[]; risks: string[] }>;
  };

  return {
    ...draft,
    method: "llm" as const,
    summary: payload.summary,
    warnings: payload.warnings,
    candidates: draft.candidates.map((candidate) => {
      const patch = payload.candidateNotes.find((item) => item.id === candidate.id);
      return patch
        ? {
            ...candidate,
            reasoning: patch.reasoning,
            risks: patch.risks
          }
        : candidate;
    })
  };
}
