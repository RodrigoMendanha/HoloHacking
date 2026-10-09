# Fluxo clínico V1: jornada completa (09/10)

**Legenda:** 🟢 dado da paciente · 🔵 cálculo do sistema · 🟣 metodologia homologada · 🟠 decisão da nutricionista · ⚪ pendência metodológica.

| # | Etapa | O que acontece | Natureza |
|---|---|---|---|
| 1 | Nutricionista cria a paciente | nome, telefone, e-mail | 🟠 |
| 2 | Gera a anamnese pré-consulta | link com token (só o hash fica no banco), validade de 7 dias, WhatsApp | 🟠 |
| 3 | Paciente preenche | 8 etapas no celular, rascunho no servidor, envio congelado | 🟢 relato da paciente |
| 4 | Nutricionista revisa | "Ver resposta" e "Levar para a anamnese do atendimento", que cria um rascunho V2 com origem `relato_paciente` | 🟢 + 🟠 (revisão) |
| 5 | Consulta | atendimento, anamnese salva e revisada | 🟠 |
| 6 | HOLOSCAN | respostas 🟢 → notas, faixas, Índice e Tríade pelo HOLOS-V1@2 | 🔵 + 🟣 |
| 6b | Próximos Passos HOLOS | sistema → ferramenta, catálogo HOLOS-RECOMENDACOES-V1 | 🟣 (snapshot) |
| 7 | Ferramentas | respostas 🟢 + leitura, prioridade e próximo passo | 🟢 + 🟠 |
| 8 | Resultado HOLOS | snapshot imutável; **resumo estruturado**: fatos 🔵, "Por onde investigar" 🟣, Próximos Passos registrados 🟣, registros da nutricionista 🟠, pendências ⚪ | 🔵 🟣 🟠 ⚪ |
| — | Conclusão integrada | **não existe regra** (PM-01) | ⚪ |
| 9 | Conduta | estratégia, ações, acordos | 🟠 |
| 10 | Resultado final para a paciente | página Resultado: snapshot (visão da paciente) + Conduta vigente + Perfil | composição |
| 11 | PDF e compartilhamento | html2pdf, imprimir, WhatsApp | exibição |
| 12 | Retorno | novo atendimento; anamnese de retorno (pode ser outro link, tipo "retorno"); novo HOLOSCAN; nova versão do Resultado | 🟢 🔵 🟣 🟠 |

## Regras que valem em toda a jornada

- **Exames** são só arquivos; não entram em nenhum cálculo, resultado, IA ou conduta automática. A Leitura Integrada está fora.
- **Nenhuma inferência vira fato:** o que não tem regra homologada aparece como pendência, nunca como texto do sistema.
- **O relato da paciente nunca vira** diagnóstico, nota, sistema ou conduta.
- **Conta não liberada** não grava nada clínico (trava no servidor, 20261013100000).

## Pendências metodológicas (aguardando Rodrigo/Daniel)

| ID | Pendência |
|---|---|
| PM-01 | Conclusão integrada Corpo, Mente e Espírito |
| PM-02 | Fechamento por ferramenta (regra de "resultado" de cada uma) |
| PM-03 | Ferramenta → próxima ferramenta (matriz de indicação a partir do resultado de uma ferramenta) |
| PM-04 | Prioridade e gravidade além da ordem "Por onde investigar" |
| PM-05 | O que a paciente vê: "Por onde investigar" e Próximos Passos; frase dirigida à profissional na mensagem oficial de faixa para a paciente |
