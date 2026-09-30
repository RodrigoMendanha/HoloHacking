# Regras de exclusão (rodada 08)

O que pode ser apagado, por quem, e o que nunca é apagado pela tela.

| O quê | Pode excluir? | Como |
|---|---|---|
| Carteira inteira ("Apagar tudo") | **Não existe mais** | Nenhuma tela destrói todos os dados de uma vez. |
| Paciente **sem** registro clínico | Sim | Pacientes → menu → Remover (ou em lote). Confirmação com o nome. |
| Paciente **com** registro clínico (consulta, HOLOSCAN, coleta, documento, ferramenta) | **Não** — só arquivar | O modal lista quem ficou de fora e por quê. Se a contagem no servidor falhar, conta como "com histórico". |
| Coleta de exames | Sim, uma por vez | Ficha → Documentos → Coletas registradas → Excluir coleta. Sai a coleta e os resultados dela; as outras não mudam. |
| Documento | Sim, um por vez | Ficha → Documentos, ou tela Documentos. Sai a linha e o arquivo do armazenamento; se só o arquivo falhar, a tela diz. |
| Imagem do perfil (foto, logo, assinatura, carimbo) | Sim, uma por vez | Perfil → remover. Confirmação; só some da tela depois que o servidor confirmou. |
| Consulta agendada | Sim (desmarcar) | Agenda → consulta → Desmarcar. |
| **Registro clínico concluído** (HOLOSCAN aplicado, aplicação de ferramenta concluída/revisada, interpretação) | **Não pela tela** | É prontuário. Corrige-se com uma aplicação nova ou editando a aberta; o histórico fica. Nenhum botão apaga um registro concluído. |
| Qualquer escrita em paciente **arquivado** | Não | Reative antes. O servidor também recusa (migration 20260930150000). |

Sem conta (modo local de desenvolvimento, só em `localhost`) a exclusão de
paciente continua em cascata local, porque ali não há prontuário no servidor
a preservar — e o modal mostra tudo o que vai junto.
