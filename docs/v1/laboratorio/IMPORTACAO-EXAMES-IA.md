# Importação de exames por leitura automática (fase 2) — desenho

Status: **desenho, não implementado**. Fase 1 entregue: lançar os valores de um laudo já enviado,
com o laudo aberto ao lado (DECISOES-V1, item 168).

## O que a fase 2 faz

1. Na lista de documentos, um laudo (PDF ou foto) ganha o botão **"Ler valores automaticamente"**.
2. Uma edge function `lab-extrair` recebe só o `document_id`.
   - Baixa o arquivo do bucket `patient-documents` com o token de quem pediu. O RLS garante que é
     dela.
   - Envia o arquivo a um modelo de IA com visão, com instrução de **transcrever** (nunca
     interpretar).
   - Devolve JSON no formato de `results[]` de `salvar_coleta_laboratorial`: nome do exame como
     está no laudo, valor como texto, unidade, referência do laudo (texto, mínimo e máximo),
     material e método quando houver, data da coleta e laboratório.
3. No navegador:
   - Cada nome passa por `LabCatalogo.porNomeExato`. O que não casar, ou casar com mais de um,
     fica marcado **"escolha o exame"**: quem escolhe é a nutricionista, não há casamento
     aproximado (regra do catálogo).
   - Cada valor passa por `LabMotor.interpretarValor` (numérico, censurado ou qualitativo).
   - O **mesmo editor de coleta da fase 1** abre já preenchido, com o laudo ao lado. A coleta tem
     `source = 'extracted_draft'`, cada resultado tem `origin = 'extracted_draft'`, e o estado é
     `rascunho`.
4. Só vira coleta válida quando a nutricionista confere linha a linha e clica em **"Salvar
   coleta"**. Rascunho e `extracted_draft` nunca entram na Leitura Integrada (DECISAO-04; já
   aplicado na tela desde a fase 1).

## Regras

- A IA nunca salva sozinha e nunca classifica (dentro/fora). A classificação continua sendo do
  `LabMotor` contra a referência do próprio laudo.
- Valor ilegível volta vazio e marcado, nunca "adivinhado".
- O texto devolvido pela IA é dado, não instrução: é escapado e validado contra o esquema antes
  de entrar no editor.
- Nenhum dado do paciente além do arquivo vai ao provedor (sem nome, sem histórico).

## Pré-requisitos (decisão e configuração da responsável)

- **Chave de API** do provedor de IA, configurada como **segredo da edge function** no painel do
  Supabase. Nunca no código, no repositório nem no chat.
- **Decisão de privacidade:** enviar laudos de paciente a um provedor externo (LGPD). Isso inclui
  o consentimento do paciente, o texto no termo e o provedor/região.
- Ajustes técnicos já mapeados:
  - O caminho de UPDATE de `salvar_coleta_laboratorial` força `source = 'manual'`
    (`20261001220000`, linha ≈639). É preciso decidir se uma coleta extraída e depois editada
    continua `extracted_draft` até ser consolidada.
  - O servidor de `salvar_leitura_integrada` ainda não recusa coletas em rascunho. Hoje só a
    tela filtra; o ideal é recusar também no banco.
