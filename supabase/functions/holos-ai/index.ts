import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { corsHeaders, jsonResponse, errorResponse } from "./cors.ts";

const GEMINI_MODEL = "gemini-2.0-flash";
const MAX_HISTORY = 20;
const SYSTEM_PROMPT_VERSION = "1.1.0";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse(401, "Token ausente.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return errorResponse(401, "Sessão inválida.");

    const uid = user.id;
    const body = await req.json();
    const { action } = body;

    if (action === "list_threads") {
      return await listThreads(supabase, uid, body.patient_id);
    }
    if (action === "create_thread") {
      return await createThread(supabase, uid, body.patient_id, body.titulo);
    }
    if (action === "send_message") {
      return await sendMessage(supabase, uid, body.thread_id, body.content);
    }
    if (action === "get_messages") {
      return await getMessages(supabase, uid, body.thread_id);
    }
    if (action === "delete_thread") {
      return await deleteThread(supabase, uid, body.thread_id);
    }

    return errorResponse(400, "Ação desconhecida: " + action);
  } catch (e) {
    console.error("holos-ai error:", e);
    return errorResponse(500, "Erro interno.");
  }
});


async function listThreads(
  supabase: ReturnType<typeof createClient>,
  uid: string,
  patientId: string,
) {
  if (!patientId) return errorResponse(400, "patient_id obrigatório.");

  const ok = await verifyOwnership(supabase, uid, patientId);
  if (!ok) return errorResponse(403, "Paciente não pertence a este nutricionista.");

  const { data, error } = await supabase
    .from("ai_threads")
    .select("id, titulo, created_at, updated_at")
    .eq("nutritionist_id", uid)
    .eq("patient_id", patientId)
    .order("updated_at", { ascending: false });

  if (error) return errorResponse(500, error.message);
  return jsonResponse({ threads: data });
}


async function createThread(
  supabase: ReturnType<typeof createClient>,
  uid: string,
  patientId: string,
  titulo?: string,
) {
  if (!patientId) return errorResponse(400, "patient_id obrigatório.");

  const ok = await verifyOwnership(supabase, uid, patientId);
  if (!ok) return errorResponse(403, "Paciente não pertence a este nutricionista.");

  const { data, error } = await supabase
    .from("ai_threads")
    .insert({
      nutritionist_id: uid,
      patient_id: patientId,
      titulo: titulo || "Nova conversa",
    })
    .select("id, titulo, created_at")
    .single();

  if (error) return errorResponse(500, error.message);
  return jsonResponse({ thread: data });
}


async function deleteThread(
  supabase: ReturnType<typeof createClient>,
  uid: string,
  threadId: string,
) {
  if (!threadId) return errorResponse(400, "thread_id obrigatório.");

  const { error } = await supabase
    .from("ai_threads")
    .delete()
    .eq("id", threadId)
    .eq("nutritionist_id", uid);

  if (error) return errorResponse(500, error.message);
  return jsonResponse({ ok: true });
}


async function getMessages(
  supabase: ReturnType<typeof createClient>,
  uid: string,
  threadId: string,
) {
  if (!threadId) return errorResponse(400, "thread_id obrigatório.");

  const thread = await verifyThreadOwnership(supabase, uid, threadId);
  if (!thread) return errorResponse(403, "Thread não pertence a este nutricionista.");

  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, role, content, metadata, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) return errorResponse(500, error.message);
  return jsonResponse({ messages: data });
}


async function sendMessage(
  supabase: ReturnType<typeof createClient>,
  uid: string,
  threadId: string,
  content: string,
) {
  if (!threadId) return errorResponse(400, "thread_id obrigatório.");
  if (!content?.trim()) return errorResponse(400, "content obrigatório.");

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return errorResponse(503, "GEMINI_API_KEY não configurada no servidor.");

  const thread = await verifyThreadOwnership(supabase, uid, threadId);
  if (!thread) return errorResponse(403, "Thread não pertence a este nutricionista.");

  const patientId = thread.patient_id;

  // 1. Save user message
  const { error: insertErr } = await supabase
    .from("ai_messages")
    .insert({ thread_id: threadId, role: "user", content: content.trim() });
  if (insertErr) return errorResponse(500, insertErr.message);

  // 2. Assemble patient context
  const contexto = await montarContextoPaciente(supabase, uid, patientId);

  // 3. Load conversation history
  const { data: history } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(MAX_HISTORY);

  // 4. Build Gemini request
  const systemPrompt = buildSystemPrompt(contexto);
  const geminiContents = buildGeminiContents(systemPrompt, history || []);

  // 5. Call Gemini
  const geminiUrl =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`;

  const geminiResp = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: geminiContents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.95,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    }),
  });

  if (!geminiResp.ok) {
    const errBody = await geminiResp.text();
    console.error("Gemini error:", geminiResp.status, errBody);
    return errorResponse(502, "Erro ao consultar a IA.");
  }

  const geminiData = await geminiResp.json();
  const assistantText =
    geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Não consegui gerar uma resposta. Tente novamente.";

  // 6. Save assistant message
  const { error: saveErr } = await supabase
    .from("ai_messages")
    .insert({
      thread_id: threadId,
      role: "assistant",
      content: assistantText,
      metadata: {
        model: GEMINI_MODEL,
        prompt_version: SYSTEM_PROMPT_VERSION,
        tokens: {
          prompt: geminiData?.usageMetadata?.promptTokenCount,
          completion: geminiData?.usageMetadata?.candidatesTokenCount,
        },
      },
    });
  if (saveErr) console.error("Failed to save assistant message:", saveErr);

  // 7. Update thread timestamp
  await supabase
    .from("ai_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  return jsonResponse({
    message: {
      role: "assistant",
      content: assistantText,
      metadata: { model: GEMINI_MODEL, prompt_version: SYSTEM_PROMPT_VERSION },
    },
  });
}


// --- Helpers ----------------------------------------------------------------

async function verifyOwnership(
  supabase: ReturnType<typeof createClient>,
  uid: string,
  patientId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("nutritionist_id", uid)
    .maybeSingle();
  return !!data;
}

async function verifyThreadOwnership(
  supabase: ReturnType<typeof createClient>,
  uid: string,
  threadId: string,
) {
  const { data } = await supabase
    .from("ai_threads")
    .select("id, patient_id, nutritionist_id")
    .eq("id", threadId)
    .eq("nutritionist_id", uid)
    .maybeSingle();
  return data;
}


async function montarContextoPaciente(
  supabase: ReturnType<typeof createClient>,
  uid: string,
  patientId: string,
) {
  const [
    patientRes,
    applicationsRes,
    scoresRes,
    labRes,
    toolsRes,
    consultationsRes,
  ] = await Promise.all([
    supabase
      .from("patients")
      .select("nome, nascimento, sexo, queixa, inicio, status")
      .eq("id", patientId)
      .eq("nutritionist_id", uid)
      .maybeSingle(),

    supabase
      .from("holoscan_applications")
      .select(
        "id, quando, indice, indice_maximo, avaliavel, nota_media, triada, cobertura, combinacoes, aprofundamentos, interpretacao_texto",
      )
      .eq("patient_id", patientId)
      .eq("nutritionist_id", uid)
      .order("quando", { ascending: false })
      .limit(3),

    supabase
      .from("holoscan_system_scores")
      .select("application_id, sistema, nome, nota, carga, faixa, respondidos, total_marcadores, avaliavel")
      .eq("application_id", patientId) // will be filtered below
      .limit(100),

    supabase
      .from("lab_collections")
      .select(`
        id, coletado_em, laboratorio, observacao,
        lab_results ( exame_id, valor, nome_exame_no_momento, unidade_no_momento, ideal_min_no_momento, ideal_max_no_momento, sistema_no_momento )
      `)
      .eq("patient_id", patientId)
      .eq("nutritionist_id", uid)
      .order("coletado_em", { ascending: false })
      .limit(2),

    supabase
      .from("tool_applications")
      .select("ferramenta_id, dados, concluido_em")
      .eq("patient_id", patientId)
      .eq("nutritionist_id", uid)
      .order("concluido_em", { ascending: false })
      .limit(10),

    supabase
      .from("consultations")
      .select("data, hora, tipo, duracao, nota")
      .eq("patient_id", patientId)
      .eq("nutritionist_id", uid)
      .order("data", { ascending: false })
      .limit(5),
  ]);

  const patient = patientRes.data;
  const applications = applicationsRes.data || [];

  // Fetch scores for the applications we actually got
  let scores: Record<string, unknown[]> = {};
  if (applications.length > 0) {
    const appIds = applications.map((a: { id: string }) => a.id);
    const { data: scoreData } = await supabase
      .from("holoscan_system_scores")
      .select("application_id, sistema, nome, nota, carga, faixa, respondidos, total_marcadores, avaliavel")
      .in("application_id", appIds);
    if (scoreData) {
      for (const s of scoreData) {
        const key = s.application_id as string;
        (scores[key] = scores[key] || []).push(s);
      }
    }
  }

  return {
    paciente: patient,
    aplicacoes: applications.map((a: Record<string, unknown>) => ({
      ...a,
      sistemas: scores[a.id as string] || [],
    })),
    exames: labRes.data || [],
    ferramentas: toolsRes.data || [],
    consultas: consultationsRes.data || [],
  };
}


function buildSystemPrompt(contexto: Record<string, unknown>): string {
  const pac = contexto.paciente as Record<string, unknown> | null;
  const apps = contexto.aplicacoes as Record<string, unknown>[];
  const exames = contexto.exames as Record<string, unknown>[];
  const ferramentas = contexto.ferramentas as Record<string, unknown>[];
  const consultas = contexto.consultas as Record<string, unknown>[];

  let ctx = "";

  if (pac) {
    ctx += `\n## Paciente\n`;
    ctx += `Nome: ${pac.nome}\n`;
    if (pac.nascimento) ctx += `Nascimento: ${pac.nascimento}\n`;
    if (pac.sexo) ctx += `Sexo: ${pac.sexo === "F" ? "Feminino" : "Masculino"}\n`;
    if (pac.queixa) ctx += `Queixa principal: ${pac.queixa}\n`;
    if (pac.inicio) ctx += `Início do acompanhamento: ${pac.inicio}\n`;
  }

  if (apps.length > 0) {
    ctx += `\n## Aplicações HOLOSCAN (${apps.length} mais recentes)\n`;
    for (const app of apps) {
      ctx += `\n### Aplicação de ${app.quando}\n`;
      ctx += `- Índice HOLOS: ${app.indice} de ${app.indice_maximo}\n`;
      ctx += `- Nota média: ${app.nota_media}\n`;
      const triada = app.triada as Record<string, number>;
      if (triada) {
        ctx += `- Tríade: Físico ${triada.fisico?.toFixed?.(1) ?? triada.fisico}, Mental ${triada.mental?.toFixed?.(1) ?? triada.mental}, Espiritual ${triada.espiritual?.toFixed?.(1) ?? triada.espiritual}\n`;
      }
      const sistemas = app.sistemas as Record<string, unknown>[];
      if (sistemas?.length) {
        ctx += `- Sistemas:\n`;
        for (const s of sistemas) {
          ctx += `  - ${s.nome}: nota ${s.nota} (${s.faixa}), carga ${s.carga}, respondidos ${s.respondidos}/${s.total_marcadores}\n`;
        }
      }
      if (app.interpretacao_texto) {
        ctx += `- Interpretação profissional: ${app.interpretacao_texto}\n`;
      }
    }
  }

  if (exames.length > 0) {
    ctx += `\n## Exames laboratoriais\n`;
    for (const col of exames) {
      const c = col as Record<string, unknown>;
      ctx += `\n### Coleta${c.coletado_em ? " de " + c.coletado_em : ""}\n`;
      const results = c.lab_results as Record<string, unknown>[];
      if (results?.length) {
        for (const r of results) {
          const status = (r.valor as number) >= (r.ideal_min_no_momento as number) &&
              (r.valor as number) <= (r.ideal_max_no_momento as number)
            ? "dentro da faixa"
            : "fora da faixa";
          ctx += `- ${r.nome_exame_no_momento}: ${r.valor} ${r.unidade_no_momento} (ref: ${r.ideal_min_no_momento}–${r.ideal_max_no_momento}) — ${status}\n`;
        }
      }
    }
  }

  if (ferramentas.length > 0) {
    ctx += `\n## Ferramentas aplicadas (${ferramentas.length})\n`;
    for (const f of ferramentas) {
      ctx += `- ${f.ferramenta_id} (concluída em ${f.concluido_em || "?"})\n`;
    }
  }

  if (consultas.length > 0) {
    ctx += `\n## Consultas recentes (${consultas.length})\n`;
    for (const c of consultas) {
      ctx += `- ${c.data} às ${c.hora} — ${c.tipo || "Consulta"}${c.nota ? ": " + c.nota : ""}\n`;
    }
  }

  return `Você é o HOLOS AI, assistente profissional de apoio à nutricionista que utiliza o método HoloHacking de Nutrição Holística.

REGRAS FUNDAMENTAIS — NUNCA VIOLAR:
1. Você NÃO diagnostica. Você NÃO prescreve. Você NÃO substitui a nutricionista.
2. Você apoia o raciocínio clínico: correlaciona dados, levanta hipóteses de investigação, identifica padrões.
3. Se o dado não existe no contexto abaixo, diga que não tem essa informação. NUNCA invente dados clínicos.
4. Não altere índices, notas, resultados de exames ou pontuações do HOLOSCAN. Esses são calculados pelo motor oficial.
5. Não sugira medicamentos. Não faça diagnósticos médicos. Isso está fora do escopo do método.
6. Use linguagem profissional e respeitosa. Trate o paciente por nome quando mencioná-lo.
7. Responda em português brasileiro.
8. Quando não souber, diga claramente. Transparência é mais valiosa que certeza inventada.
9. Mantenha suas respostas concisas e focadas. Evite textos longos demais.
10. Prefira "hipóteses de investigação" em vez de "hipóteses clínicas". Prefira "prioridades possíveis com base nos dados disponíveis" em vez de "a prioridade é...". Você sugere caminhos, não decide por quem atende.

O MÉTODO HOLOHACKING — HOLOSCAN (Sistema de Leitura Integral do Paciente):

O HOLOSCAN é estruturado em 4 pilares:

1. MAPEAR (Mapeamento Integral)
   - O Mapa HOLOS avalia 5 sistemas (Fúngico, Ácido-Inflamatório, Metabólico, Detox+Linfático, Mental-Emocional-Espiritual) com base nas respostas do paciente.
   - O Índice HOLOS é um indicador geral de sobrecarga (quanto menor, mais sobrecarregado).
   - A Tríade (Físico, Mental, Espiritual) dá a leitura dos 3 eixos do paciente.

2. CONFRONTAR (Camada Laboratorial)
   - Cruza o Mapa HOLOS com exames laboratoriais.
   - Identifica convergências (relato e lab concordam) e divergências (relato e lab discordam).

3. INTEGRAR (Leitura Integrada)
   - Convergências e divergências entre os dados.
   - Dados ausentes que merecem investigação.
   - Pontos para aprofundar.

4. ACOMPANHAR (Evolução)
   - Histórico de aplicações do HOLOSCAN ao longo do tempo.
   - Comparação entre Mapas HOLOS para visualizar a evolução do paciente.
   - As 30 ferramentas de Corpo, Mente e Espírito são condutas clínicas, não diagnósticos.
   - A reavaliação acontece a cada 4 semanas.

CONTEXTO DO PACIENTE (dados reais do prontuário, montados pelo servidor):
${ctx || "\nNenhum dado disponível para este paciente ainda."}

Responda com base EXCLUSIVAMENTE nos dados acima. Se algo não aparece, não existe neste prontuário.`;
}


function buildGeminiContents(
  systemPrompt: string,
  history: { role: string; content: string }[],
) {
  const contents: { role: string; parts: { text: string }[] }[] = [];

  // System instruction as first user message (Gemini convention)
  contents.push({
    role: "user",
    parts: [{ text: systemPrompt }],
  });
  contents.push({
    role: "model",
    parts: [{ text: "Entendido. Estou pronto para auxiliar com base nos dados do paciente. Como posso ajudar?" }],
  });

  for (const msg of history) {
    const geminiRole = msg.role === "assistant" ? "model" : "user";
    contents.push({ role: geminiRole, parts: [{ text: msg.content }] });
  }

  return contents;
}
