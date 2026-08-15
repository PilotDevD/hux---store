import "server-only";

export type NfItem = {
  description: string;
  brand: string;
  type: string;
  gender: string;
  size: string;
  color: string;
  qty: number;
  unitCost: number; // reais
};

export type NfResult =
  | { ok: true; supplier: string; items: NfItem[] }
  | { ok: false; error: string; aiUnavailable?: boolean };

const PROMPT = `Você é um assistente que lê notas fiscais de compra de vestuário esportivo.
Extraia os dados da imagem e responda APENAS com JSON válido (sem markdown, sem comentários) neste formato exato:
{"supplier":"nome do fornecedor","items":[{"description":"...","brand":"HAUSS|HOUND|SNUGG|HUX ou vazio","type":"CAMISA|REGATA|TOP|LEGGING|SHORT|JAQUETA|MOLETOM|MEIA|ACESSORIO","gender":"MASCULINO|FEMININO|UNISSEX","size":"PP|P|M|G|GG|XG|UNICO","color":"cor","qty":number,"unitCost":number}]}
unitCost é o custo unitário em reais (número, ex 49.90). Se algum campo não estiver claro, use "" (ou 0 para números). Não invente itens.`;

/** Sends the invoice image to an LLM vision model and returns structured items. */
export async function parseInvoice(base64: string, mediaType: string): Promise<NfResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, aiUnavailable: true, error: "Leitura por IA não configurada. Preencha os itens manualmente." };
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `A IA retornou erro ${res.status}. ${body.slice(0, 120)}` };
    }
    const data = await res.json();
    const text: string = (data?.content?.[0]?.text ?? "").trim();
    const jsonStr = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(jsonStr);
    const items: NfItem[] = (parsed.items ?? []).map((i: Record<string, unknown>) => ({
      description: String(i.description ?? ""),
      brand: String(i.brand ?? ""),
      type: String(i.type ?? ""),
      gender: String(i.gender ?? "UNISSEX"),
      size: String(i.size ?? ""),
      color: String(i.color ?? ""),
      qty: Number(i.qty ?? 1) || 1,
      unitCost: Number(i.unitCost ?? 0) || 0,
    }));
    return { ok: true, supplier: String(parsed.supplier ?? ""), items };
  } catch {
    return { ok: false, error: "Não consegui interpretar a nota. Preencha/ajuste os itens manualmente." };
  }
}
