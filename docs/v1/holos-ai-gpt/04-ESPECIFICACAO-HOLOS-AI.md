# Especificação HOLOS AI (texto extraído do PDF original, sem alterações de conteúdo)

HOLOHACKING · NUTRICAO HOLISTICA
HOLOS AI
Especificacao estrategica, metodologica e tecnica para construcao da camada de
inteligencia do HoloHacking
Documento para o Gestor de IA
Objetivo central
Transformar os dados do acompanhamento em compreensao organizada,
direcionamentos, estrategias e acompanhamento da evolucao, sem substituir a decisao
profissional da nutricionista.
Versao de especificacao inicial · Outubro de 2026

1. Resumo executivo
A HOLOS AI deve colocar o conhecimento operacional da Nutricao Holistica a
disposicao da nutricionista dentro de cada atendimento. Ela nao substitui a
profissional: organiza, conecta, sugere e acelera.
A proposta e construir uma camada de inteligencia especializada, alimentada pela base oficial do metodo
(livros, aulas, regras, ferramentas, direcionamentos, estrategias e playbooks) e conectada ao HoloHacking. No
MVP inicial, sem custo de API, a nutricionista usara a HOLOS AI via ChatGPT com um pacote padronizado
gerado pelo HoloHacking. A resposta retornara em formato estruturado para ser importada ou colada de volta
no sistema.
No futuro, o mesmo contrato de entrada e saida podera ser conectado via API, sem mudar a logica
metodologica. Essa separacao permite validar a qualidade da IA antes de investir na integracao nativa.
Principio operacional:
“O sistema organiza. O metodo orienta. A IA sugere. A nutricionista
interpreta. A nutricionista decide.”
O que precisa estar pronto para a IA funcionar bem
Base de Conhecimento HOLOS organizada e versionada.
Catalogo de direcionamentos homologados.
Catalogo de estrategias com limites de uso.
Playbooks que conectam sinais, sistemas, ferramentas, direcionamentos, estrategias e acompanhamento.
Contratos estruturados para Mapeamento, HOLOSCAN, ferramentas, Resultado e retorno.
RAG/retrieval para recuperar somente o conhecimento relevante em cada tarefa.
Prompts especializados, versionados e testados.
Guardrails metodologicos para impedir diagnosticos, causalidades e prescricoes indevidas.
Golden cases para avaliar qualidade antes de publicar mudancas.
Contrato tecnico HOLOS AI ↔ HoloHacking, a validar com Claude Code.

2. Visao e problema que a HOLOS AI resolve
O HoloHacking organiza a jornada da Nutricao Holistica, mas parte das nutricionistas ainda nao domina
profundamente os cinco sistemas, todas as ferramentas, as conexoes entre Corpo, Mente e Espirito e a
traducao de dados em direcionamentos e estrategias. O produto nao deve exigir que a profissional memorize
todo o metodo antes de conseguir entregar um resultado de qualidade.
A HOLOS AI existe para transformar informacao dispersa em uma leitura estruturada, rastreavel e operacional.
O conhecimento do metodo deve estar no produto - nao somente na memoria da nutricionista.
Perguntas que a IA deve ajudar a responder
O que apareceu neste atendimento?
Quais informacoes convergem e quais entram em conflito?
O que vale aprofundar antes de concluir?
Qual direcionamento do metodo faz sentido nesta fase?
Quais estrategias homologadas podem ser consideradas?
O que a paciente deve observar ate o retorno?
O que mudou desde o ultimo encontro?
Vale manter, ajustar, substituir, concluir ou encerrar uma estrategia?
O que a HOLOS AI nao e
Nao e um instrumento diagnostico.
Nao e uma caixa de chat generica sem contexto.
Nao altera a matematica do HOLOSCAN.
Nao publica conteudo para a paciente sem confirmacao profissional.
Nao substitui Conduta, julgamento clinico ou limites de atuacao da nutricionista.
Nao transforma linguagem simbolica ou espiritual em fisiologia comprovada.
3. Arquitetura funcional da HOLOS AI
Fluxo de produto: Mapeamento → HOLOSCAN → Ferramentas → Motor HOLOS →
HOLOS AI → Confirmacao profissional → Resultado HOLOS → Retorno → Evolucao.
Camada
Funcao
Base HOLOS
Livros, aulas, regras, ferramentas, catalogos, playbooks e limites.
Mapeamento Holistico
Contexto, objetivos, dificuldades, desejos e relatos iniciais.
HOLOSCAN
Instrumento deterministico que organiza onde aprofundar.
Ferramentas
Aprofundam Corpo, Mente e Espirito.
Motor HOLOS
Regras e catalogos homologados; funciona mesmo sem IA.
HOLOS AI
Sintese, conexao, contextualizacao, sugestao e personalizacao.
Nutricionista
Confirma, edita ou descarta.

Camada
Funcao
Resultado HOLOS
Direcionamentos, estrategias, acordos, observacao e evolucao.
Retorno
Avalia o que aconteceu e decide proximo movimento.
4. Modelo operacional do MVP sem API
Como nao sera usada API no primeiro momento, o MVP deve permitir validar a inteligencia via
ChatGPT/HOLOS AI externa, mantendo um fluxo padronizado e simples.
1
A nutricionista conclui o atendimento no HoloHacking.
2
O HoloHacking gera um Pacote HOLOS AI com somente o contexto necessario.
3
A nutricionista clica em Abrir HOLOS AI e e redirecionada para o ChatGPT com a HOLOS AI.
4
Ela cola o pacote ou envia o arquivo gerado.
5
A HOLOS AI consulta a base oficial do metodo e devolve um HOLOS_AI_RESULT padronizado.
6
A nutricionista copia/importa o bloco de resultado no HoloHacking.
7
O sistema distribui o conteudo em Sintese, Direcionamentos, Estrategias, Corpo/Mente/Espirito, Observacao
e Proxima Etapa.
8
A nutricionista confirma, edita ou descarta cada item.
9
Somente o que for confirmado e compartilhado entra no Resultado HOLOS final.
Objetivo do MVP: validar a qualidade metodologica da IA sem custo de API e sem
depender ainda da integracao nativa.
Futuro
Quando houver integracao via API, o copiar/colar desaparece. O HoloHacking continua gerando o mesmo
contexto e recebendo o mesmo schema; a unica mudanca e o transporte. Por isso, o contrato de entrada e
saida deve ser desenhado corretamente desde o primeiro dia.
5. Base Oficial de Conhecimento HOLOS
A HOLOS AI deve consultar uma base oficial e controlada. O gestor de IA deve separar claramente o que e
regra do metodo, orientacao, exemplo, hipotese ou linguagem autoral. Jogar PDFs e transcricoes sem
classificacao nao e suficiente.
Conteudos de origem
Livros oficiais de Nutricao Holistica.
Aulas transcritas e materiais didaticos.
Definicoes oficiais dos cinco sistemas.
Manuais das dez ferramentas.
Regras de aplicacao e limites profissionais.
Casos-modelo ficticios/homologados.
Catalogo de direcionamentos.
Catalogo de estrategias.

Playbooks.
Glossario e linguagem permitida/proibida.
Classificacao do conhecimento
Tipo
Uso pela IA
Conceito oficial
Pode explicar como definicao do metodo.
Regra do metodo
Deve ser obedecida.
Orientacao de aplicacao
Ajuda a selecionar perguntas, ferramentas ou proximos passos.
Exemplo
Ilustra; nunca vira regra automaticamente.
Hipotese para investigar
Deve ser apresentada como possibilidade, nao conclusao.
Linguagem autoral/simbolica
Pode ser usada como linguagem do metodo, nunca como fisiologia comprovada.
Limite
Bloqueia ou redireciona a resposta da IA.
Niveis de evidencia/linguagem
Nivel
Definicao
N1
Conhecimento clinico/fisiologico estabelecido.
N2
Associacao descrita na literatura, mas inespecifica.
N3
Hipotese para investigar.
N4
Linguagem autoral, simbolica ou espiritual.
Regra: N4 nunca pode ser transformado automaticamente em N1.
6. Cinco sistemas: conhecimento e limites
A IA precisa conhecer os cinco sistemas como eixos autorais de organizacao, sem transforma-los em
diagnosticos. Para cada sistema devem existir definicao, temas, sinais possiveis, perguntas de
aprofundamento, ferramentas relacionadas, direcionamentos, estrategias, o que observar e limites.
Sistema
Nunca concluir automaticamente
Fungico
Presenca de fungos, candidiase ou infeccao.
Acido-Inflamatorio
Acidose, alteracao de pH ou inflamacao sistemica.
Metabolico
Resistencia a insulina, diabetes, alteracao de tireoide ou outra doenca metabolica.
Detox + Linfatico
Toxinas acumuladas, incapacidade de detoxificacao, funcao hepatica ou fluxo linfatico
alterado.
Mental-Emocional-Espiritual
Transtorno mental ou condicao objetiva de “saude espiritual”.
O HOLOSCAN calcula. A HOLOS AI le e ajuda a interpretar. A IA nunca altera score, cobertura, Indice, Triade,
prioridades, sinais dominantes ou PP-V1.
7. Catalogo de Direcionamentos HOLOS
O gestor de IA deve estruturar um catalogo homologado para evitar que a IA invente livremente a direcao do
acompanhamento. Cada direcionamento precisa ter identidade, criterios, fontes e limites.

ID: MET-DIR-01
Sistema relacionado: Metabolico
Tema: fome e energia
Direcionamento: Organizar a rotina alimentar para compreender como fome e energia variam ao longo do dia.
Pode ser considerado quando: [regras homologadas]
Ferramentas relacionadas: [IDs]
Estrategias candidatas: [IDs]
O que observar: [itens]
Limites: [regras]
8. Catalogo de Estrategias HOLOS
As estrategias devem ser pre-homologadas sempre que possivel. A IA sugere candidatas; nao cria livremente
intervencoes clinicas.
Tipo
Pode ser sugerida
automaticamente?
Exemplo de uso
Observacao
Sim, dentro do catalogo
Registrar fome/energia em momentos combinados.
Comportamental
Sim, com limites
Observar gatilho e resposta; testar alternativa
acordada.
Metodologica
Sim
Aplicar Mapa da Rotina ou Gatilhos & Respostas.
Clinico-nutricional
Nao como prescricao autonoma
Requer decisao profissional na Conduta.
Cada estrategia deve ter: ID, nome, descricao, finalidade, territorio, direcionamentos relacionados, ferramenta
relacionada, requisitos, quando usar, quando nao usar, o que observar e status.
9. Playbooks HOLOS
Playbooks conectam situacoes recorrentes do metodo a uma sequencia de investigacao e decisao. Eles sao o
elo entre catalogos e uso pratico.
PLAYBOOK: Metabolico / fome + energia
Entradas possiveis: fome retornando rapidamente; queda de energia; alimentacao desorganizada; comer sem fo
me percebida.
Investigar: horarios, refeicoes, intervalos, fome, saciedade, energia e contexto.
Ferramentas possiveis: Mapa da Rotina, OQ3, Gatilhos & Respostas.
Direcionamentos possiveis: A / B / C.
Estrategias possiveis: E01 / E02 / E04.
Observar: X / Y / Z.
Retorno: manter / ajustar / aprofundar.
Os playbooks nao devem ser tratados como protocolos clinicos rigidos. Eles organizam caminhos possiveis do
metodo e sempre preservam a confirmacao profissional.
10. Dez ferramentas e contrato de saida
Cada ferramenta precisa deixar de ser apenas formulario. Ela deve gerar uma saida que o HoloHacking e a
HOLOS AI consigam consumir.
Territorio
Ferramentas
Corpo
OQ3; Linha do Momentum; Mapa da Rotina
Mente
PQQ/Escada dos Porques; Mapa de Crencas Alimentares; Gatilhos & Respostas
Espirito
Mapa do Proposito; Roda Holistica da Vida; Carta ao Futuro Eu; Conexao & Pertencimento

Contrato comum de saida
ferramenta
o_que_investigamos
o_que_apareceu
o_que_ficou_mais_claro
padrao_observado
questoes_abertas
direcionamento_relacionado
estrategia_relacionada
o_que_observar
proximo_passo
origem
confirmado_profissional
compartilhar_paciente
A estrutura final de banco e nomes de campos devem ser validados com Claude Code.
11. Exemplos de comportamento da IA por
ferramenta
PQQ / Escada dos Porques
A IA recebe objetivo declarado, camadas de aprofundamento, “pra que” final, sintese construida com a paciente
e contexto pertinente. Pode devolver: sintese sugerida, temas, o que ficou mais claro, padroes a aprofundar,
questoes abertas, direcionamentos candidatos, estrategias candidatas e o que observar. Nao deve gerar
interpretacao psicologica como fato.
Mapa da Rotina
Organiza momentos dificeis, horarios, pontos de ruptura, oportunidades, barreiras e recursos. A saida deve
responder: onde a rotina dificulta, onde existe espaco, qual direcionamento faz sentido e o que pode ser
testado.
Gatilhos & Respostas
Recebe situacao → gatilho → pensamento → emocao → resposta → consequencia. A saida pode sintetizar
ciclo relatado, elementos recorrentes, ponto possivel de intervencao, alternativas para discussao e o que
observar. Nunca afirmar causalidade.
12. Pacote HOLOS AI: contexto que o HoloHacking
deve gerar
No MVP, o HoloHacking deve gerar automaticamente um pacote legivel e estruturado. A nutricionista nao deve
montar manualmente o contexto.
HOLOS_AI_CONTEXT
atendimento
paciente_contexto_minimo
mapeamento_relevante
holoscan
sistemas_prioritarios
sinais_relevantes
ferramentas_aplicadas
resultados_das_ferramentas
leitura_profissional
conduta
direcionamentos_ativos
estrategias_ativas

historico_relevante
A validar com Claude Code: nomes reais dos campos, IDs, relacionamentos, o que ja existe, o que precisa ser
derivado e o que nao deve sair do sistema.
Minimizacao de dados
Nao enviar nome completo quando nao for necessario.
Nao enviar CPF, endereco, telefone ou outros identificadores sem necessidade.
Minimizar dados de terceiros.
Enviar apenas o contexto pertinente a tarefa solicitada.
Avaliar juridicamente LGPD e tratamento de dados sensiveis antes da producao.
13. Tarefas especializadas da HOLOS AI
Nao usar um unico prompt generico. Cada tarefa deve ter objetivo, entradas, base consultada, schema e
criterios proprios.
1
Analisar ferramenta - sintetiza e identifica pontos de aprofundamento.
2
Resumir atendimento - organiza o momento atual.
3
Identificar convergencias - conecta fontes sem afirmar causalidade.
4
Sugerir questoes para aprofundar - ajuda a proxima conversa.
5
Sugerir direcionamentos - escolhe candidatos homologados do catalogo.
6
Sugerir estrategias - escolhe candidatas homologadas e explicita finalidade.
7
Gerar analise integrada - consolida Mapeamento, HOLOSCAN, ferramentas e historico.
8
Analisar retorno/evolucao - avalia estrategia anterior e sugere manter/ajustar/substituir/concluir/encerrar.
9
Preparar Resultado HOLOS - gera conteudo estruturado para importacao e confirmacao.
14. Formato padronizado de resposta:
HOLOS_AI_RESULT
A resposta da IA deve ser estruturada para evitar copiar e colar texto solto. O HoloHacking deve conseguir
distribuir automaticamente cada bloco.
=== HOLOS_AI_RESULT ===
SINTESE:
...
CONVERGENCIAS:
- ...
PADROES_OBSERVADOS:
- ...
HIPOTESES_PARA_INVESTIGAR:
- ...
QUESTOES_PARA_APROFUNDAR:
- ...
DIRECIONAMENTOS:

1. ...
ESTRATEGIAS:
1. ...
CORPO:
...
MENTE:
...
ESPIRITO:
...
OBSERVAR:
...
PROXIMA_ETAPA:
...
FONTES_UTILIZADAS:
- ...
ALERTAS_METODOLOGICOS:
- ...
=== FIM_HOLOS_AI_RESULT ===
Idealmente o GPT deve devolver tambem um bloco JSON valido com o mesmo conteudo, para facilitar a futura
importacao automatica.
15. Rastreabilidade e proveniencia
Toda sugestao deve explicar de onde veio. A HOLOS AI nao deve produzir uma conclusao opaca.
Direcionamento sugerido:
Organizar o periodo da tarde para compreender fome e energia antes do jantar.
Baseado em:
- Mapeamento: dificuldade no fim da tarde
- HOLOSCAN: Sistema Metabolico
- Mapa da Rotina: tarde sem pausa
- Catalogo: MET-DIR-01
- Playbook: MET-03
Separar sempre relato, dado, padrao observado, hipotese, interpretacao profissional e linguagem
autoral/simbolica.
16. Estados de revisao profissional
Nenhuma saida da IA deve ir diretamente para a paciente.
Estado
Significado
SUGERIDO
Gerado pela HOLOS AI e ainda nao validado.
CONFIRMADO
A nutricionista confirmou sem alteracao relevante.
EDITADO
A nutricionista alterou e assumiu a versao final.
DESCARTADO
Nao sera utilizado.
COMPARTILHADO
Pode aparecer no Resultado/PDF da paciente.

17. Integracao com Mapeamento, HOLOSCAN,
Ferramentas e Resultado
Mapeamento Holistico
A IA pode considerar objetivos, sintomas relatados, dificuldades, contexto, desejos e rotina. Pode apontar
convergencias, mas nao estabelecer causalidade. Exemplo seguro: “Azia frequente e refeicoes tardias foram
relatadas no mesmo periodo e podem ser investigadas em conjunto.”
HOLOSCAN
A IA le resultado, sistemas prioritarios, sinais e contexto. Nunca altera score, Indice, Triade, prioridades,
dominantes, cobertura ou PP-V1.
Ferramentas
Cada ferramenta concluida precisa gerar uma consequencia util: o que ficou claro, direcionamento, estrategia,
observacao ou proximo passo. Nenhuma ferramenta deve “sumir” depois de aplicada.
Resultado HOLOS
A HOLOS AI pode pre-preencher: Seu momento agora; O que esta pesando; O que estamos compreendendo;
Foco atual sugerido; Direcionamentos; Estrategias; Corpo/Mente/Espirito; O que observar; Proxima etapa. A
nutricionista confirma antes da emissao.
Retorno
A IA deve receber estrategia anterior, aplicacao, facilitadores, barreiras, percepcao e observacao profissional.
Pode sugerir MANTER, AJUSTAR, SUBSTITUIR, CONCLUIR ou ENCERRAR, preservando historico.
18. RAG, retrieval e versionamento
A base deve usar recuperacao contextual: a IA recebe apenas os trechos relevantes para a tarefa. O gestor
deve definir chunking, metadados, filtros, ranking e estrategia de citacao interna.
Metadados recomendados
fonte/documento
tipo de conhecimento
sistema
ferramenta
tema
nivel N1-N4
status oficial/experimental
versao
pagina/trecho de origem
data de aprovacao

Versionamento
knowledge_base_version
prompt_version
model
timestamp
retrieved_sources[]
Exemplo: HOLOS-KB 1.0 → HOLOS-KB 1.1. Uma analise historica nao deve ser reinterpretada silenciosamente
por versoes futuras.
19. Arquitetura de prompts
Criar um prompt-base com identidade, limites, linguagem e regras gerais; depois prompts especializados por
ferramenta e tarefa. Todos devem ser versionados e testados.
Prompt-base HOLOS AI.
Prompt OQ3.
Prompt PQQ.
Prompt Mapa da Rotina.
Prompt Gatilhos & Respostas.
Prompt Crencas.
Prompt Momentum.
Prompt Proposito.
Prompt Roda.
Prompt Carta.
Prompt Conexao & Pertencimento.
Prompt de direcionamentos.
Prompt de estrategias.
Prompt de analise integrada.
Prompt de retorno/evolucao.
Prompt de preparacao do Resultado HOLOS.
20. Guardrails metodologicos e clinicos
Criar bloqueios e instrucoes explicitas para que a IA nao ultrapasse o escopo.
Nao diagnosticar.
Nao afirmar candidiase, resistencia a insulina, diabetes, inflamacao sistemica, acidose, toxinas acumuladas
ou transtorno mental com base no metodo.
Nao transformar temporalidade ou associacao em causalidade.
Nao transformar linguagem espiritual em fisiologia.
Nao inventar dados ausentes.
Dados ausentes devem permanecer “sem dado”/informacao insuficiente.

Nao criar prescricao alimentar individualizada, suplemento, dose, medicacao ou tratamento de forma
autonoma.
Quando uma acao depender de julgamento profissional, responder: “Requer decisao profissional na
Conduta.”
Quando nao houver base suficiente, preferir “Informacao insuficiente para concluir” a produzir uma narrativa
plausivel.
21. Auditoria, logs e observabilidade
Mesmo no MVP externo, o gestor deve prever como a futura integracao armazenara metadados. O desenho
final precisa permitir auditoria completa.
profissional que solicitou;
paciente/ID interno;
atendimento;
tipo de tarefa;
contexto enviado e hash;
prompt_version;
knowledge_base_version;
modelo;
fontes recuperadas;
resposta;
data/hora;
itens confirmados/editados/descartados/compartilhados;
tokens, custo e latencia quando houver API.
22. Privacidade, LGPD e seguranca de dados
O desenho precisa assumir que o sistema trabalha com dados pessoais e potencialmente dados sensiveis. A
implementacao deve aplicar minimizacao e segregacao desde o inicio.
Usar IDs internos quando possivel.
Evitar dados identificadores em prompts quando nao forem necessarios.
Nao incluir dados de terceiros sem necessidade.
Definir politica de retencao de pacotes e respostas.
Definir quem pode acessar analises da IA.
Nao expor API keys no frontend quando houver API.
Submeter o fluxo final a revisao juridica/LGPD antes de producao.
23. Qualidade, avaliacao e golden cases
Nao publicar uma IA apenas porque “pareceu boa”. O gestor deve construir uma bateria de casos ficticios com
respostas esperadas ou limites de aceitabilidade.

Cobertura minima
caso predominantemente Corpo;
caso predominantemente Mente;
caso com dimensao Espirito;
pouca informacao;
muita informacao;
informacoes contraditorias;
linguagem espiritual/simbolica;
caso sem conclusao possivel;
retorno com melhora;
retorno sem adesao;
estrategia inadequada;
caso que exige cautela/encaminhamento.
Criterios de avaliacao
Criterio
Pergunta
Fidelidade ao metodo
A resposta permanece dentro do conhecimento HOLOS?
Fidelidade aos dados
Usou apenas informacao presente?
Nao alucinacao
Inventou causa, historia ou dado?
Seguranca
Evitou diagnostico e prescricao indevida?
Direcionamento
E coerente e rastreavel?
Estrategia
Pertence ao catalogo ou foi corretamente marcada como dependencia profissional?
Linguagem
E clara, humana e nao mistifica ciencia?
Rastreabilidade
Fontes e motivos estao visiveis?
Recomendacao inicial: 20-50 golden cases homologados antes de ampliar o uso.
24. Feedback, custo e fallback
Feedback profissional
Prever I util / I nao util e motivos como: generico, incorreto, fora do metodo, estrategia inadequada, linguagem
ruim, faltou contexto. Isso alimenta melhoria de prompts e base, sem “aprender” silenciosamente com qualquer
feedback.
Custo
No MVP externo, o custo da API do HoloHacking e zero porque a chamada ocorre na conta do ChatGPT da
profissional. Na futura integracao nativa, custos devem ser medidos por tarefa, modelo, tokens e usuario. A IA
nao deve rodar a cada tecla: apenas em acoes explicitas.

Fallback sem IA
O HoloHacking deve continuar funcionando sem HOLOS AI: HOLOSCAN, ferramentas, catalogos, playbooks e
Resultado manual permanecem disponiveis. A IA e acelerador e camada de inteligencia, nao dependencia
estrutural.
25. Responsabilidades por frente
Responsavel
Escopo
Gestor de IA
Base de conhecimento, RAG, prompts, schemas, guardrails, avaliacao, golden cases,
modelos, qualidade, custos, documentacao e piloto.
Claude Code / HoloHacking
Auditar dados reais, contratos tecnicos, geracao do Pacote HOLOS AI, importacao do
HOLOS_AI_RESULT, telas, persistencia, auditoria, seguranca e futura API.
Responsavel metodologico
Aprovar sistemas, ferramentas, direcionamentos, estrategias, playbooks, limites e
linguagem.
Regra: gestor de IA e Claude Code nao inventam metodologia. A metodologia precisa ser fornecida/aprovada
pelo projeto.
26. Entregaveis obrigatorios do Gestor de IA
1
Arquitetura da Base de Conhecimento HOLOS.
2
Inventario e estrategia de ingestao de livros/aulas.
3
Taxonomia e metadados da base.
4
Arquitetura RAG/retrieval.
5
Prompt-base HOLOS AI.
6
Prompts especializados por ferramenta/tarefa.
7
Schema do HOLOS_AI_CONTEXT (conceitual, a validar com Claude Code).
8
Schema do HOLOS_AI_RESULT.
9
Arquitetura do Catalogo de Direcionamentos.
10 Arquitetura do Catalogo de Estrategias.
11 Modelo de Playbooks.
12 Guardrails e regras de seguranca.
13 Politica de rastreabilidade e citacao interna de fontes.
14 Politica de versionamento.
15 Plano de avaliacao e golden cases.
16 Matriz de metricas de qualidade.
17 Plano de feedback profissional.
18 Politica de privacidade tecnica e minimizacao.
19 Proposta de modelos e criterios de escolha.
20 Estimativa de custo futuro via API.
21 Plano de piloto sem API.

22 Documentacao operacional para o HoloHacking.
23 Plano de evolucao MVP → integracao assistida → API nativa.
27. Piloto recomendado: PQQ
O PQQ e recomendado como primeiro piloto porque contem linguagem aberta, exige sintese, permite testar
RAG, direcionamentos, estrategias, rastreabilidade e limites sem depender de um grande numero de regras
clinicas.
1
Nutricionista preenche o PQQ no HoloHacking.
2
HoloHacking gera Pacote HOLOS AI do PQQ.
3
Nutricionista abre a HOLOS AI no ChatGPT e envia o pacote.
4
IA recupera material oficial do PQQ + contexto relevante.
5
IA gera sintese, temas, pontos para aprofundar, direcionamentos candidatos, estrategias candidatas e o que
observar.
6
Nutricionista importa o HOLOS_AI_RESULT.
7
Confirma/edita/descarta.
8
Resultado confirmado alimenta o Resultado HOLOS.
9
No retorno, testar se a IA consegue usar a estrategia anterior e avaliar a evolucao.
28. Plano de implementacao recomendado
Fase
Objetivo
Saida
0 - Auditoria tecnica
Claude Code mapeia dados reais do HoloHacking.
Contrato tecnico real.
1 - Base
Organizar livros, aulas, taxonomia e versoes.
HOLOS-KB v1.0.
2 - Catalogos
Direcionamentos, estrategias e playbooks.
Biblioteca operacional.
3 - Prompts/Schemas
Criar tarefas e formatos estruturados.
HOLOS_AI_RESULT v1.
4 - Piloto PQQ
Validar qualidade no ChatGPT sem API.
Primeiros golden cases.
5 - Ferramentas
Expandir uma por uma.
10 contratos testados.
6 - Analise integrada
Cruzar Mapeamento + HOLOSCAN + ferramentas.
Analise de atendimento.
7 - Retorno
Avaliar estrategias e evolucao.
Loop longitudinal.
8 - Importacao
HoloHacking
Colar/importar resposta estruturada.
MVP operacional.
9 - API futura
Automatizar transporte.
Experiencia nativa.
29. Criterios de aceite do projeto
A primeira versao pode ser considerada pronta para piloto quando:
A IA usa somente a base oficial e deixa claro quando nao ha informacao suficiente.
Consegue ler um Pacote HOLOS AI sem perder origem dos dados.
Gera resposta no schema definido, sem texto desorganizado.

Sugere direcionamentos rastreaveis e coerentes com catalogo/playbook.
Sugere estrategias homologadas ou marca corretamente “requer decisao profissional”.
Nao diagnostica nem estabelece causalidade indevida.
Nao publica nada diretamente para a paciente.
Permite Confirmar / Editar / Descartar.
Funciona em golden cases com criterios de qualidade aprovados.
O resultado pode ser importado para o HoloHacking e usado no Resultado HOLOS.
Historico de retorno preserva o que foi tentado e o que mudou.
30. Experiencia final desejada
No MVP sem API:
Atendimento concluido → Gerar Pacote HOLOS AI → Abrir HOLOS AI no ChatGPT →
Enviar pacote → Receber HOLOS_AI_RESULT → Importar no HoloHacking →
Confirmar/Editar/Descartar → Gerar Resultado HOLOS.
Na futura versao integrada:
Atendimento concluido → “Analisar com HOLOS AI” → analise pronta no HoloHacking
→ confirmar direcionamentos e estrategias → “Gerar Resultado HOLOS”.
31. Principio final de produto
A HOLOS AI deve reduzir drasticamente a necessidade de a nutricionista dominar, de memoria, todas as
conexoes do metodo. Ela deve tornar o conhecimento operacional acessivel no momento do atendimento,
preservando a autonomia profissional e a seguranca metodologica.
“A HOLOS AI nao substitui a nutricionista. Ela coloca o conhecimento
operacional da Nutricao Holistica a disposicao da nutricionista dentro de
cada atendimento.”
32. Pontos a validar com Claude Code antes da
integracao
Este documento define a arquitetura metodologica e de IA. Alguns detalhes dependem da auditoria do sistema
real e nao devem ser inventados pelo gestor de IA.
Nomes reais dos campos de Mapeamento, HOLOSCAN, ferramentas, Conduta, Resultado e retorno.
IDs e relacionamentos entre paciente, atendimento, aplicacao, ferramenta e resultado.
Estrutura real de `direcao` do Resultado HOLOS T5.
Quais dados sao historicos/imutaveis.
Quais dados sao compartilhados com paciente.
Onde armazenar a resposta importada da HOLOS AI.
Como versionar imports e analises.

Como gerar o Pacote HOLOS AI com minimizacao de dados.
Como importar o HOLOS_AI_RESULT com validacao de schema.
Como implementar futura chamada de API, auditoria e rollback.
33. Checklist de kickoff para o Gestor de IA
1
Receber livros, aulas e materiais oficiais.
2
Criar inventario da base e apontar lacunas.
3
Propor taxonomia/metadados.
4
Definir RAG/retrieval.
5
Especificar prompt-base e prompts especializados.
6
Definir schema HOLOS_AI_RESULT v1.
7
Propor template de Catalogo de Direcionamentos.
8
Propor template de Catalogo de Estrategias.
9
Propor template de Playbook.
10 Criar guardrails e testes negativos.
11 Definir golden cases iniciais.
12 Prototipar PQQ no ChatGPT/HOLOS AI.
13 Documentar resultados e gaps.
14 Aguardar contrato tecnico do Claude Code antes de integrar com dados reais do HoloHacking.

HOLOS AI
Conhecimento do metodo transformado em direcao, estrategia e evolucao.
Documento de especificacao para construcao da camada de inteligencia do
HoloHacking.
