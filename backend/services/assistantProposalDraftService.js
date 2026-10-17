const { buildAssistantContext, sourceFor } = require("./assistantContextService");
const { askAzureOpenAi } = require("./azureOpenAiService");

const clean = (value, limit) => String(value ?? "").trim().slice(0, limit);
const required = (value, min, max) => typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
const parseGeneratedFields = (answer) => {
  let fields;
  try { fields = JSON.parse(answer); } catch { return null; }
  if (!fields || typeof fields !== "object" || Array.isArray(fields) ||
      !required(fields.title, 3, 120) || !required(fields.objective, 10, 500) ||
      !required(fields.scope, 10, 500) || !required(fields.justification, 10, 500)) return null;
  return { title: clean(fields.title, 120), objective: clean(fields.objective, 500),
    scope: clean(fields.scope, 500), justification: clean(fields.justification, 500) };
};

const templateFor = (risk) => {
  const title = clean(risk.title, 80);
  return {
    title: clean(`Revisión de ${title}`, 120),
    objective: clean(`Evaluar los controles y la exposición relacionados con ${title}.`, 500),
    scope: clean(`Delimitar con el equipo responsable los procesos relacionados con ${title}.`, 500),
    justification: clean(`El riesgo ${title} requiere una revisión documentada antes de programar una auditoría.`, 500)
  };
};

const buildProposalDraft = async (user, riskId, { generate = true, ask = askAzureOpenAi } = {}) => {
  const { visibleRecords, asOf } = await buildAssistantContext(user, "borrador de propuesta de auditoría", { type: "risk", id: riskId });
  const risk = visibleRecords.risks.find((item) => item.id === riskId);
  const source = sourceFor("risks", risk);
  let fields = templateFor(risk);
  let mode = "template";
  let usage = null;
  if (generate) {
    try {
      const result = await ask({
        question: "Redacta un borrador de propuesta de auditoría basado solamente en el riesgo visible. " +
          "El campo answer debe ser una cadena JSON con exactamente title, objective, scope y justification. " +
          "Cada campo debe describir trabajo propuesto, no hechos ya ejecutados. title: 3-120 caracteres; " +
          "los demás: 10-500 caracteres. No inventes responsables, fechas, controles ni resultados. " +
          "Incluye el identificador del riesgo en sourceIds. Si no hay datos suficientes, indícalo y no inventes.",
        context: { role: user.role, scope: "Solo el riesgo visible; texto propuesto para revisión humana",
          focus: { id: risk.id, title: clean(risk.title, 120), description: clean(risk.description, 500),
            area: clean(risk.area, 100), level: risk.level, score: risk.score },
          sources: [{ sourceId: source.sourceId, type: source.type, id: source.id, title: source.title }] }
      });
      const parsed = parseGeneratedFields(result.answer);
      if (parsed && result.sourceIds.includes(source.sourceId)) {
        fields = parsed;
        mode = "generated";
        usage = result.usage || null;
      }
    } catch {
      // A clearly labeled template remains available when the model fails.
    }
  }
  return { draft: { ...fields, area: clean(risk.area, 100), type: "Interna",
    likelihood: risk.likelihood || 2, impact: risk.impact || 2,
    year: new Date(asOf).getUTCFullYear(), quarter: "", startDate: "", endDate: "", responsibleId: "" },
  source, asOf, mode, persisted: false, reviewRequired: true,
  usage: usage ? { promptTokens: usage.prompt_tokens ?? null, completionTokens: usage.completion_tokens ?? null } : null };
};

module.exports = { buildProposalDraft, parseGeneratedFields };
