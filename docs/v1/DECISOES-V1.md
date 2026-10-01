# DECISÕES V1 — registro do que está aprovado

Só entra aqui decisão realmente aprovada (Documento Mestre, versão documental 1.0, ou
decisão explícita de produto registrada nesta etapa). O que depende de homologação está
na seção **Decisões pendentes**, sem resposta.

## Decisões aprovadas

1. **O Documento Mestre é o destino da V1.** `HOLOHACKING-V1-ESPECIFICACAO-MESTRE.pdf`
   (30/09/2026) define o comportamento pretendido. (Mestre §1.1)
2. **O AS-IS é só ponto de partida.** `ESTADO-ATUAL-COMPLETO-HOLOHACKING-AS-IS.md` é
   evidência do estado em 30/09/2026, não especificação. (Mestre §1.1, §44.1)
3. **Regra metodológica não homologada não é inventada pelo código.** Nenhum peso, faixa,
   corte, associação, regra laboratorial ou regra de sugestão é preenchido por
   aproximação, escolha do desenvolvedor, frontend, backend ou IA. (Mestre §1.2, §13)
4. **Sem dado = sem dado.** Sistema ou eixo sem resposta tem nota, carga e faixa nulas;
   resposta válida zero é resposta, não ausência; não há nota 10 por ausência nem nota
   zero por régua intocada. (Mestre §15)
5. **Nova aplicação não herda respostas.** Reaplicar o Holoscan cria aplicação nova,
   vazia; respostas anteriores não são marcadas automaticamente. (Mestre §8, §15)
6. **Nova coleta não herda resultados.** Nova coleta começa vazia; editar uma coleta é
   diferente de criar outra. (Mestre §22)
7. **Exames não alteram sistemas, Índice ou Tríada.** (Mestre §16, §24.3, §43.2)
8. **"Apagar tudo" está fora.** Removido na Rodada 08; não volta. (Mestre §33, §40.2)
9. **Backup completo está fora do escopo obrigatório da V1.** Decisão de produto
   registrada em 01/10/2026, como override explícito do critério "backup restaurado em
   teste" (Mestre §39.2, §41.3). Não se restaura o botão "Backup completo", não se
   implementa novo sistema de backup nesta etapa. As exportações existentes continuam
   tendo que ser verdadeiras e autorizadas.
10. **HOLOS AI não configurada permanece indisponível.** Nenhum provedor é integrado até
    haver configuração, contrato e validação; a jornada clínica segue operante.
    (Mestre §36.2)
11. **Duas coletas na mesma data têm identidade própria.** A identidade da coleta é o
    ID; `patient_id + data` nunca é identidade. (Mestre §22, §34.2, §43.2)
12. **Sem retorno universal automático.** Prazos de acompanhamento são definidos pela
    profissional; o automatismo de 28 dias foi neutralizado, sem número substituto.
    (Mestre §29, §33)
13. **Saída não homologada não é saída oficial.** Até existir Pacote Metodológico
    aprovado, notas dos 5 sistemas, faixas, prioridade calculada, Índice, Tríada
    numérica, combinações, sugestões e Leitura Integrada determinística aparecem
    identificadas como "em homologação". (Mestre §12, §13, §41.1)
14. **Critério mínimo de cobertura não é presumido.** O corte de 50% da Rodada 08 foi
    removido e não foi substituído. A cobertura bruta (respondidos ÷ 84) continua
    calculada e exibida. (Mestre §18)
15. **Conteúdo oculto ou retirado não sai em contexto assistivo.** CMB ocultas, regras
    REC/SEL, mapas não consolidados e rascunhos não entram no contexto da HOLOS AI.
    (Mestre §29, §35, §36.1)

## Decisões pendentes (não decididas aqui)

- **Agenda × Atendimento** — separação lógica entre agendamento e atendimento clínico
  (entidade, estados, vínculo das aplicações ao atendimento escolhido). (Mestre §6)
- **Anamnese obrigatória** — formulário estruturado previsto no Mestre §9, ausente no AS-IS.
- **Conduta obrigatória** — entidade clínica prevista no Mestre §30, ausente no AS-IS.
- **Catálogo final das 10 ferramentas** — 3 de Corpo, 3 de Mente, 4 de Espírito
  (Mestre §25-28); hoje 7 ativas, e Mapa da Rotina, Gatilhos & Respostas e Conexão &
  Pertencimento não existem.
- **Quatro estados administrativos do paciente** — cadastrado, em acompanhamento,
  acompanhamento encerrado, arquivado (Mestre §33); hoje só ativo/inativo.
- **HOLOS AI obrigatória no lançamento inicial?** (Mestre §41.4)
- **Política de data futura de coleta** — regra da Rodada 08 sem contrato no Mestre;
  separada em `supabase/migrations-pendentes/`.
- **Política de parcialidade** — denominadores, exclusões (recusa, não aplicável) e
  mínimos por sistema, eixo e Índice. (Mestre §14.3, §15, §18)
- **Pesos** — por item, por contribuição e por sistema; os pesos do AS-IS (1-3 por
  pergunta; SNT-101 e SNT-501 com pesos diferentes por sistema) não são oficiais.
- **Faixas** — limites, rótulos e mensagens; 3/6 do AS-IS não é oficial.
- **Índice** — pesos α (0,20 iguais não é decisão final), elegibilidade global,
  política de índice parcial. (Mestre §16)
- **Tríada** — escala, pesos, política de contribuição por ID, elegibilidade por eixo.
  (Mestre §17)
- **Leitura Integrada** — vínculo exame↔domínio, suficiência, janela temporal,
  unidades/referências, resultados mistos, versionamento da regra. (Mestre §24)
- **Regras de sugestão de ferramentas** — nenhuma das 23 REC nem SEL-001 é aprovada.
  (Mestre §29)
- **Conteúdo mínimo para "Concluir" uma ferramenta** — a guarda técnica da Rodada 08
  (Mapa de Crenças não conclui vazio; OQ3/PQQ não salvam vazios) fica mantida como
  guarda de aplicação vazia, pendente de decisão metodológica.
- **Réguas manuais dos 5 sistemas** — LEGADO / EM REVISÃO; fora da jornada normal,
  visíveis só em modo de homologação (`?homologacao=1`); não sincronizadas.
- **Catálogo laboratorial de 45 exames** — o banco atual tem 24 (12 iguais, 8 com outro
  nome/formato, 25 ausentes, 4 fora da lista). (Mestre §21)
