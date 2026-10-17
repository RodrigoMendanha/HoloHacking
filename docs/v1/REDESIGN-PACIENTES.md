# Redesign do módulo Pacientes (12/10)

Este redesign é só visual e de organização. Os dados, as regras e os handlers continuam os mesmos.

**O que não mudou:** metodologia, HOLOSCAN, perguntas, scores, faixas, Índice, Tríade, snapshots, Resultado HOLOS, Resultado Final, banco, RLS, triggers, RPCs, arquivamento, exclusão e as regras do Atendimento Ativo.

**Sem deploy.**

## 1. Lista

| Antes | Agora |
|---|---|
| Um cartão largo por paciente | **Tabela** no desktop: Paciente (avatar, nome, telefone e e-mail) · Status · Último contato · Próximo passo · Próxima consulta · `···` |
| Clicar no telefone ou e-mail também abria a ficha | Telefone e e-mail abrem só o discador ou o e-mail |
| Linha só pelo mouse | A linha inteira abre a ficha, com o mouse ou com o teclado (Tab até a linha, depois Enter ou Espaço) |
| Botão ▾ com o menu | Botão `···` com o mesmo menu e as mesmas ações. Esc fecha o menu |
| Chips grandes | Filtros compactos, como abas: os mesmos 6, com as mesmas regras |
| Barra de lote simples | Barra verde com Arquivar, Reativar e Remover (as mesmas ações) |

- **Coluna Status:** só estados que já existem:
  - Ativo ou Arquivado (`patients.status`);
  - Novo, Sem contato, Ficha vazia ou Aguardando mapa (`Panorama.situacao`).
- **Coluna Próximo passo:** usa a mesma regra de antes (`proximoPasso` / `Panorama.alertas`).
- **Abaixo de 1180px**, a tabela vira cartões com nome, status, próximo passo, próxima consulta e `···`. Nessa largura a área útil não comporta as 6 colunas.

## 2. Ficha

**Cabeçalho compacto**, numa área só:
- avatar, nome, status, telefone e e-mail, "Cadastrado em", idade e Detalhes;
- **faixa** com Próxima consulta (agora sem os segundos), Último HOLOSCAN e Etapa atual (a mesma regra do Dashboard).

**Ações do cabeçalho:**

| Tipo | Ação |
|---|---|
| Principal | **Aplicar HOLOSCAN** |
| Secundária | **Nova consulta** |
| Menu **Mais ações** | Editar cadastro, Adicionar arquivo, Exportar dados |

- O menu tem teclado (setas e Esc) e fecha ao clicar fora.
- **Arquivado:** as regras são as mesmas de antes. Aplicar HOLOSCAN, Nova consulta e Adicionar arquivo ficam desabilitados, aparece Reativar e o aviso continua.

**Saíram da faixa:**
- "Em aberto" (pendências), trocado por **Etapa atual**;
- "Documentos e exames". O número de arquivos continua na Visão Geral e na aba.

**Atendimento ativo**
- O bloco não foi removido, porque é lógica crítica: o Mapeamento Holístico, a conduta e o HOLOSCAN dependem dele.
- Virou uma barra de uma linha: "Atendimento ativo · data · [Selecionar] [Novo atendimento] [Soltar]". As mesmas funções de `atendimento.js`.

## 3. Jornada clínica horizontal

Cinco passos: MAPEAR → INTEGRAR → CONSOLIDAR → APRESENTAR → ACOMPANHAR.

**Estados:**
- ✓ concluído (verde);
- ● etapa atual (dourado): é o primeiro passo ainda não feito;
- ○ ainda não (apagado).

**Quando cada passo conta como feito** (só com dado real, via `JornadaPaciente.passos`):

| Passo | Dado real |
|---|---|
| Mapear | HOLOSCAN salvo |
| Integrar | 1 ou mais ferramentas concluídas ou revisadas |
| Consolidar | Resultado HOLOS vigente salvo ou revisado |
| Apresentar | Resultado Final emitido |
| Acompanhar | 2 ou mais HOLOSCANs salvos |

**Destinos de cada passo:**

| Passo | Abre |
|---|---|
| Mapear | seção HOLOSCAN |
| Integrar | Corpo (ferramentas) |
| Consolidar | aba Resultado HOLOS |
| Apresentar | página Resultado |
| Acompanhar | aba **Evolução** (antes abria a Visão Geral: bug corrigido) |

A jornada não tem porcentagem, pendência nem gravidade.

## 4. Abas

- **As 11 continuam.** Têm indicador sólido e rolagem lateral com uma pista visível: barra fina, esmaecido na borda e setas ‹ › quando há abas escondidas.
- **Teclado:** setas, Home e End. Essa navegação já existia no `arquivos.js` e continua igual.
- **Ficam fixas (sticky)** logo abaixo do topo global, que é medido no carregamento. Não há sticky duplicado.

## 5. Visão Geral em duas colunas

| Coluna | Largura | Conteúdo |
|---|---|---|
| Esquerda | ~58% | Mapa HOLOS (Índice, Tríade, selo de origem, "Mais baixos"), os **cinco sistemas**, Interpretação, "Desde a última consulta" e Atendimento clínico |
| Direita | ~42% | **Linha do tempo** (filtros num controle compacto) e Documentos recentes |

- As duas colunas viram uma só abaixo de 1100px.
- **Barras dos sistemas:**
  - antes: trilho de 5px;
  - agora: 12px, com o nome, o valor e a faixa oficial perto da barra (faixa e cobertura também no celular).
  - Os valores e a ordem são os mesmos.
  - Uma cor só, sem rótulo novo ("atenção", "estável" e afins não existem).
- **Duplicações removidas:**
  - os chips estáticos de continuidade (a jornada os substitui);
  - a "Próxima consulta marcada" repetida no Atendimento clínico (ela fica no cabeçalho e na aba Atendimentos).
- **Linha do tempo:** clicar em um evento de Ferramenta agora abre a aba Ferramentas. Antes não fazia nada (bug corrigido).

## 6. Identidade visual

- A casca da ficha já era verde-floresta nos dois temas. Dentro dela, as superfícies agora são verdes um pouco mais claros, com texto creme e dourado como destaque.
- Poucas bordas; a elevação vem do contraste de fundo.
- Títulos em serif e dados em sans-serif.
- Sem vermelho de alerta sem erro real.
- A lista segue o tema da aplicação: claro com superfícies creme, escuro com superfícies verdes.

## 7. Antes × depois (1440×900, mesmo paciente fictício)

| Medida | Antes | Depois |
|---|---|---|
| Altura em que as abas começam | y = 1132 | **y = 624** (−45%) |
| Altura da Visão Geral | 1434px | **1064px** (−26%) |
| Elementos com contorno acima da dobra | 19 | **14** |
| Botões acessíveis acima da dobra | 16 | 37 (as abas e a jornada passam a estar visíveis sem rolar) |
| Linhas da lista visíveis sem rolar | 3 | **4** |

As capturas estão em `docs/v1/pacientes/`:
- `antes-*.png` e `depois-*.png`;
- `lista-desktop-1440`, `lista-768`, `lista-1024`, `lista-390`;
- `ficha-topo-1440`, `ficha-visao-1440`, `ficha-jornada`, `ficha-atendimento`, `ficha-abas`, `ficha-mapa-sistemas`, `ficha-timeline`, `ficha-768`, `ficha-390`.

Todas usam dados fictícios.

## 8. Arquivos

| Arquivo | O que mudou |
|---|---|
| `app.js` | linha da tabela (`cardPaciente`) com os mesmos ganchos; teclado na linha; telefone e e-mail não abrem a ficha; menu "Mais ações"; `window.irAtalho` (o mesmo destino dos atalhos) |
| `index.html` | cabeçalho da ficha, contêiner da jornada, caixa das abas com setas, subtítulo da lista |
| `ficha.js` | faixa; jornada; Visão em duas colunas; sem chips duplicados; setas das abas e sticky; alias formularios → ferramentas |
| `atendimento.js` | rótulos curtos da barra (os `aria-label` dizem o nome completo) |
| `dashboard.js` | `window.JornadaPaciente` (etapa atual e passos da jornada), com a mesma leitura do Dashboard, sem consulta nova; "Respondido pelo paciente" |
| `style.css` | bloco novo escopado em `#secao-pacientes` (não afeta outras telas) |

## 9. Testes

**Novo: `testes/testar-pacientes-redesign.mjs`.** Cobre:
- **Lista:** tabela e cartão; filtros, busca, clique na linha, teclado, telefone, menu `···`, lote; XSS no nome e no e-mail.
- **Ficha:** cabeçalho, Mais ações, faixa, atendimento ativo, arquivado.
- **Jornada:** estados reais e destinos.
- **Abas:** as 11, teclado e setas.
- **Visão Geral:** duas colunas e barras de 12px.
- **Larguras** 1920, 1440, 1024, 768 e 390, sem rolagem lateral.
- **Banco:** intocado pelo redesign.

**Ajustados à estrutura nova** (as mesmas garantias de antes):

| Teste | Ajuste |
|---|---|
| `testar-lista-pacientes.mjs` | o campo de contato é achado pelo texto |
| `testar-ficha-abas.mjs` | ordem das ações, faixa nova, jornada nova |
| `testar-ficha.mjs` | faixa sem documentos, com Último HOLOSCAN |
| `testar-correcoes-jornada.mjs` | rótulo "Mapeamento Holístico" e a ordem nova da Visão |

## 10. Riscos e observações

- **Próximos Passos:** abrir a ficha desenha a seção HOLOSCAN, e isso registra o snapshot dos Próximos Passos. Esse comportamento já existia antes (auditoria) e não foi mudado. O teste novo não conta essa tabela.
- **Etapa atual e jornada:** dependem da leitura de convites, Resultados HOLOS e emissões que o Dashboard já faz. Se a ficha abrir antes dessa leitura, ela é disparada uma vez (com o mesmo limite de 5 segundos) e a faixa se atualiza quando os dados chegam.
- **Tablets de 1024px:** recebem cartões em vez da tabela.
- **Outras abas** (Atendimentos, Mapeamento, Conduta, Resultado, Documentos, Relatório): mantêm o visual atual dentro da casca. Harmonizar o interior delas fica para uma próxima etapa.
- **Banco e metodologia:** nada foi alterado. Não há migration e o banco real não foi tocado.
