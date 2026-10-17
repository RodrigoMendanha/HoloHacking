# Fluxo clínico V1: jornada completa (atualizado 10/10, item 180)

**Legenda:** 🟢 dado da paciente · 🔵 cálculo do sistema · 🟣 metodologia homologada · 🟠 decisão da nutricionista · ⚪ pendência metodológica.

| # | Etapa | O que acontece | Natureza |
|---|---|---|---|
| 1 | Nutricionista cria a paciente | nome, telefone, e-mail | 🟠 |
| 2 | Gera a anamnese pré-consulta | link com token (só o hash fica no banco), validade de 7 dias, WhatsApp | 🟠 |
| 3 | Paciente preenche | 8 etapas no celular, rascunho no servidor, envio congelado | 🟢 relato da paciente |
| 4 | Nutricionista revisa | "Ver resposta" e "Levar para a anamnese do atendimento", que cria um rascunho V2 com origem `relato_paciente` | 🟢 + 🟠 (revisão) |
| 5 | Consulta | atendimento, anamnese salva e revisada | 🟠 |
| 6 | HOLOSCAN | respostas 🟢 → notas, faixas, Índice e Tríade pelo HOLOS-V1@2 | 🔵 + 🟣 |
| 6b | Próximos Passos HOLOS | sistema → ferramenta, catálogo HOLOS-RECOMENDACOES-V1 (1 principal + até 2 complementares, nada obrigatório) | 🟣 (snapshot) |
| 7 | Ferramentas | respostas 🟢 + **resultado estruturado** (descritivo, não é score; Momentum = estado escolhido pela nutricionista) | 🟢 + 🟠 |
| 7b | Mapa do Propósito | OQ³ + PQQ → Mapa do Propósito (opcional; única relação ferramenta → ferramenta homologada) | 🟣 |
| 8 | Resultado HOLOS | snapshot imutável (template 2 congela os Próximos Passos e o compartilhamento); **Síntese HOLOS** determinística | 🔵 🟣 🟠 |
| — | Conclusão integrada | **não existe fórmula** (PM-07); a Síntese organiza, não conclui | ⚪ |
| 9 | Conduta | estratégia, ações, acordos | 🟠 |
| 10 | Resultado final para a paciente | **emissão imutável** (Resultado + Conduta + Perfil + imagens congelados, RF-1); Modelo B: Próximos Passos só se compartilhados | composição congelada |
| 11 | PDF e compartilhamento | PDF, imprimir e WhatsApp só de uma emissão (sempre o mesmo conteúdo) | exibição |
| 12 | Retorno | novo atendimento; anamnese de retorno (pode ser outro link, tipo "retorno"); novo HOLOSCAN; nova versão do Resultado | 🟢 🔵 🟣 🟠 |

## Regras que valem em toda a jornada

- **Exames** são só arquivos; não entram em nenhum cálculo, resultado, IA ou conduta automática. A Leitura Integrada está fora.
- **Nenhuma inferência vira fato:** o que não tem regra homologada aparece como pendência, nunca como texto do sistema.
- **O relato da paciente nunca vira** diagnóstico, nota, sistema ou conduta.
- **Conta não liberada** não grava nada clínico (trava no servidor, 20261013100000).

## Pendências metodológicas (aguardando Rodrigo/Daniel)

As PM-01 a PM-05 de 09/10 foram decididas no item 180 (ver `RESULTADO-FINAL-DECISOES-APROVADAS.md`). Continuam abertas:

| ID | Pendência |
|---|---|
| PM-06 | Diferença pequena / grande na Tríade |
| PM-07 | Fórmula integrada Corpo + Mente + Espírito |
| PM-08 | Mapeamento concluído e suficiência automática de informação |
| PM-09 | Outras transições ferramenta → ferramenta |
| PM-10 | Taxonomia automática de crenças |
| PM-11 | Padrão automático em Gatilhos & Respostas |
| PM-12 | Intervalo automático de reaplicação do HOLOSCAN |
| PM-13 | Conduta automática |
| PM-14 | Conteúdo da Carta ao Futuro Eu para a paciente (consentimento) |
