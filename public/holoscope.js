var HOLOSCOPE = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/navegador.ts
  var navegador_exports = {};
  __export(navegador_exports, {
    calcular: () => calcular,
    combinacoesDeNotas: () => combinacoesDeNotas,
    escopo: () => escopo,
    indiceDeNotas: () => indiceDeNotas,
    mensagem: () => mensagem,
    questionario: () => questionario,
    resumo: () => resumo,
    sistemas: () => sistemas
  });

  // build/bancos.json
  var bancos_default = { config: [{ chave: "escala_max", valor: "3", observacao: "Escala de resposta do paciente: 0 nunca / 1 as vezes / 2 frequente / 3 sempre" }, { chave: "indice_maximo", valor: "100", observacao: "Teto do Indice HOLOS: 0 a 100 (27/08). As notas por sistema seguem 0 a 10. Direcao: quanto maior melhor nos dois." }, { chave: "indice_casas", valor: "0", observacao: "Casas decimais do Indice HOLOS" }, { chave: "nota_casas", valor: "1", observacao: "Casas decimais da nota por sistema" }, { chave: "peso_secundario_fator", valor: "1", observacao: "Peso do sistema_secundario de uma emocao em relacao ao primario. Decidido 27/08: mesmo peso." }], sistemas: [{ id: "fungico", nome: "Sistema F\xFAngico", cor: "#7E8B5A", padrao_emocional: "estagna\xE7\xE3o e desordem", impacto_espiritual: "perda de vitalidade e clareza" }, { id: "acido_inflamatorio", nome: "Sistema \xC1cido-Inflamat\xF3rio", cor: "#B4553C", padrao_emocional: "irrita\xE7\xE3o e reatividade", impacto_espiritual: "bloqueio no plexo solar" }, { id: "metabolico", nome: "Sistema Metab\xF3lico", cor: "#C7A76C", padrao_emocional: "vazio e falta de prop\xF3sito", impacto_espiritual: "dessintoniza\xE7\xE3o do corpo como templo" }, { id: "detox_linfatico", nome: "Sistema Detox + Linf\xE1tico", cor: "#4F7D8C", padrao_emocional: "ac\xFAmulo de m\xE1goas e emo\xE7\xF5es n\xE3o processadas", impacto_espiritual: "bloqueio do fluxo" }, { id: "mental_emocional_espiritual", nome: "Sistema Mental-Emocional-Espiritual", cor: "#0E3A64", padrao_emocional: "desconex\xE3o de si", impacto_espiritual: "queda de frequ\xEAncia geral" }], regras: [{ sistema: "fungico", formula: "proporcional_ponderada", faixa_baixa_ate: "3", faixa_media_ate: "6", peso_indice: "0.20" }, { sistema: "acido_inflamatorio", formula: "proporcional_ponderada", faixa_baixa_ate: "3", faixa_media_ate: "6", peso_indice: "0.20" }, { sistema: "metabolico", formula: "proporcional_ponderada", faixa_baixa_ate: "3", faixa_media_ate: "6", peso_indice: "0.20" }, { sistema: "detox_linfatico", formula: "proporcional_ponderada", faixa_baixa_ate: "3", faixa_media_ate: "6", peso_indice: "0.20" }, { sistema: "mental_emocional_espiritual", formula: "proporcional_ponderada", faixa_baixa_ate: "3", faixa_media_ate: "6", peso_indice: "0.20" }], sintomas: [{ id: "SNT-101", sintoma: "vontade intensa e recorrente de doce", sinonimos: "fissura por a\xE7\xFAcar;desejo de carboidrato", sistema: "fungico", peso: "2", pergunta: "Voc\xEA sente vontade forte de doce ou p\xE3o quase todo dia?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-102", sintoma: "distens\xE3o abdominal ap\xF3s refei\xE7\xE3o", sinonimos: "barriga estufada;incha\xE7o depois de comer;gases", sistema: "fungico", peso: "3", pergunta: "Sua barriga incha ou d\xE1 gases depois das refei\xE7\xF5es?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-103", sintoma: "l\xEDngua com saburra branca", sinonimos: "l\xEDngua branca;placa na l\xEDngua", sistema: "fungico", peso: "3", pergunta: "Sua l\xEDngua costuma ter uma camada esbranqui\xE7ada?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-104", sintoma: "candid\xEDase de repeti\xE7\xE3o", sinonimos: "corrimento;candid\xEDase oral;sapinho", sistema: "fungico", peso: "3", pergunta: "Voc\xEA tem candid\xEDase ou sapinho com frequ\xEAncia?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-105", sintoma: "micose recorrente", sinonimos: "frieira;p\xE9 de atleta;micose de unha", sistema: "fungico", peso: "3", pergunta: "Voc\xEA tem micose de pele ou unha que volta sempre?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-106", sintoma: "coceira anal ou genital", sinonimos: "prurido", sistema: "fungico", peso: "2", pergunta: "Voc\xEA sente coceira na regi\xE3o \xEDntima ou anal?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-107", sintoma: "n\xE9voa mental ap\xF3s carboidrato", sinonimos: "cabe\xE7a pesada;confus\xE3o depois de comer", sistema: "fungico", peso: "2", pergunta: "Sua cabe\xE7a fica pesada ou confusa depois de comer massa ou doce?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-108", sintoma: "caspa ou coceira no couro cabeludo", sinonimos: "dermatite seborreica", sistema: "fungico", peso: "1", pergunta: "Voc\xEA tem caspa ou coceira no couro cabeludo com frequ\xEAncia?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-109", sintoma: "hist\xF3rico de uso repetido de antibi\xF3tico", sinonimos: "muitos antibi\xF3ticos", sistema: "fungico", peso: "2", pergunta: "Voc\xEA tomou antibi\xF3tico muitas vezes ao longo da vida?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-110", sintoma: "intoler\xE2ncia a \xE1lcool", sinonimos: "fica mal com pouca bebida", sistema: "fungico", peso: "2", pergunta: "Voc\xEA passa mal com pouca bebida alco\xF3lica?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-111", sintoma: "sinusite ou rinite cr\xF4nica", sinonimos: "nariz entupido sempre", sistema: "fungico", peso: "1", pergunta: "Voc\xEA vive com nariz entupido ou sinusite?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-201", sintoma: "dor articular sem esfor\xE7o", sinonimos: "dor nas juntas;dor sem ter feito nada", sistema: "acido_inflamatorio", peso: "3", pergunta: "Voc\xEA sente dor nas articula\xE7\xF5es mesmo sem ter feito esfor\xE7o?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-202", sintoma: "rigidez ao acordar", sinonimos: "corpo travado de manh\xE3", sistema: "acido_inflamatorio", peso: "3", pergunta: "Voc\xEA acorda com o corpo travado que leva um tempo para soltar?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-203", sintoma: "dor muscular difusa", sinonimos: "corpo dolorido;fibromialgia", sistema: "acido_inflamatorio", peso: "2", pergunta: "Voc\xEA sente o corpo dolorido sem causa clara?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-204", sintoma: "queima\xE7\xE3o estomacal", sinonimos: "azia;refluxo;queima\xE7\xE3o no peito", sistema: "acido_inflamatorio", peso: "2", pergunta: "Voc\xEA sente azia ou queima\xE7\xE3o no est\xF4mago?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-205", sintoma: "dor de cabe\xE7a frequente", sinonimos: "cefaleia;enxaqueca", sistema: "acido_inflamatorio", peso: "2", pergunta: "Voc\xEA tem dor de cabe\xE7a mais de uma vez por semana?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-206", sintoma: "pele inflamada", sinonimos: "acne inflamat\xF3ria;eczema;psor\xEDase", sistema: "acido_inflamatorio", peso: "2", pergunta: "Sua pele tem crises de acne inflamada eczema ou psor\xEDase?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-207", sintoma: "gengiva que sangra", sinonimos: "sangramento gengival;gengivite", sistema: "acido_inflamatorio", peso: "2", pergunta: "Sua gengiva sangra ao escovar?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-208", sintoma: "piora clara com ultraprocessado", sinonimos: "fica pior comendo besteira", sistema: "acido_inflamatorio", peso: "2", pergunta: "Voc\xEA percebe que piora quando come ultraprocessado ou a\xE7\xFAcar?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-209", sintoma: "incha\xE7o nas m\xE3os ao acordar", sinonimos: "dedos inchados de manh\xE3;anel apertando", sistema: "acido_inflamatorio", peso: "2", pergunta: "Suas m\xE3os ou dedos amanhecem inchados?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-210", sintoma: "marcador inflamat\xF3rio alterado no exame", sinonimos: "PCR alta;VHS alto", sistema: "acido_inflamatorio", peso: "3", pergunta: "Seus exames mostram PCR ou VHS acima do normal?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-301", sintoma: "sonol\xEAncia forte depois do almo\xE7o", sinonimos: "apag\xE3o p\xF3s-almo\xE7o;sono depois de comer", sistema: "metabolico", peso: "3", pergunta: "Voc\xEA fica com muito sono logo depois do almo\xE7o?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-302", sintoma: "vontade intensa e recorrente de doce", sinonimos: "fissura por a\xE7\xFAcar;desejo de carboidrato", sistema: "metabolico", peso: "3", pergunta: "Voc\xEA sente vontade forte de doce ou p\xE3o quase todo dia?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-303", sintoma: "fome pouco tempo depois de comer", sinonimos: "fome r\xE1pida;come e logo tem fome", sistema: "metabolico", peso: "3", pergunta: "Voc\xEA sente fome de novo pouco tempo depois de ter comido?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-304", sintoma: "compuls\xE3o ou beliscar \xE0 noite", sinonimos: "come depois do jantar;assalta a geladeira", sistema: "metabolico", peso: "3", pergunta: "Voc\xEA come depois do jantar mesmo sem fome real?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-305", sintoma: "ac\xFAmulo de gordura abdominal", sinonimos: "barriga;cintura aumentando", sistema: "metabolico", peso: "3", pergunta: "Sua gordura se concentra na barriga?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-306", sintoma: "escurecimento nas dobras da pele", sinonimos: "acantose;pesco\xE7o escuro;axila escura", sistema: "metabolico", peso: "3", pergunta: "A pele do seu pesco\xE7o ou axila est\xE1 mais escura e aveludada?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-307", sintoma: "irrita\xE7\xE3o forte se atrasa a refei\xE7\xE3o", sinonimos: "fica mal sem comer;tremor;hipoglicemia", sistema: "metabolico", peso: "2", pergunta: "Voc\xEA fica irritado ou tr\xEAmulo se atrasa uma refei\xE7\xE3o?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-308", sintoma: "dificuldade de perder peso mesmo comendo pouco", sinonimos: "peso empacado", sistema: "metabolico", peso: "2", pergunta: "Voc\xEA tem dificuldade de perder peso mesmo comendo pouco?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-309", sintoma: "triglicer\xEDdeos altos ou HDL baixo", sinonimos: "altera\xE7\xE3o no lipidograma", sistema: "metabolico", peso: "3", pergunta: "Seus exames mostram triglicer\xEDdeos altos ou HDL baixo?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-310", sintoma: "cansa\xE7o ao acordar mesmo dormindo", sinonimos: "acorda sem energia", sistema: "metabolico", peso: "2", pergunta: "Voc\xEA acorda cansado mesmo tendo dormido o suficiente?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-401", sintoma: "reten\xE7\xE3o de l\xEDquido", sinonimos: "incha\xE7o em pernas e p\xE9s;perna pesada", sistema: "detox_linfatico", peso: "3", pergunta: "Voc\xEA percebe incha\xE7o nas pernas ou nos p\xE9s no fim do dia?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-402", sintoma: "rosto inchado ao acordar", sinonimos: "face inchada de manh\xE3", sistema: "detox_linfatico", peso: "2", pergunta: "Seu rosto amanhece inchado?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-403", sintoma: "intoler\xE2ncia a cheiros fortes", sinonimos: "enjoo com perfume;produto de limpeza incomoda", sistema: "detox_linfatico", peso: "3", pergunta: "Cheiros fortes te incomodam mais do que incomodam as outras pessoas?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-404", sintoma: "mal-estar com alimento gorduroso", sinonimos: "enjoo com fritura;peso depois de gordura", sistema: "detox_linfatico", peso: "2", pergunta: "Comida gordurosa te faz passar mal ou pesa muito?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-405", sintoma: "intestino preso", sinonimos: "constipa\xE7\xE3o;evacua a cada dois dias ou mais", sistema: "detox_linfatico", peso: "3", pergunta: "Voc\xEA evacua todos os dias?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-406", sintoma: "ressaca intensa com pouco \xE1lcool", sinonimos: "fica mal no dia seguinte", sistema: "detox_linfatico", peso: "2", pergunta: "Uma ta\xE7a j\xE1 te d\xE1 ressaca no dia seguinte?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-407", sintoma: "sensibilidade a medicamento ou cafe\xEDna", sinonimos: "reage forte a rem\xE9dio;caf\xE9 tira o sono", sistema: "detox_linfatico", peso: "2", pergunta: "Voc\xEA reage muito forte a medicamento ou a caf\xE9?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-408", sintoma: "pele opaca e olheiras", sinonimos: "pele sem vi\xE7o;olheiras fundas", sistema: "detox_linfatico", peso: "2", pergunta: "Sua pele est\xE1 opaca ou com olheiras marcadas?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-409", sintoma: "odor corporal forte", sinonimos: "suor com odor forte", sistema: "detox_linfatico", peso: "2", pergunta: "Seu suor tem odor forte?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-410", sintoma: "celulite acentuada", sinonimos: "pele em casca de laranja", sistema: "detox_linfatico", peso: "1", pergunta: "Voc\xEA tem celulite acentuada?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-501", sintoma: "sono n\xE3o reparador", sinonimos: "acorda cansado;dorme mas n\xE3o descansa", sistema: "mental_emocional_espiritual", peso: "3", pergunta: "Voc\xEA acorda cansado mesmo dormindo as horas necess\xE1rias?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-502", sintoma: "dificuldade de dormir por pensamento acelerado", sinonimos: "mente n\xE3o desliga;cabe\xE7a a mil na cama", sistema: "mental_emocional_espiritual", peso: "3", pergunta: "Voc\xEA demora a dormir porque a cabe\xE7a n\xE3o desliga?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-503", sintoma: "despertar de madrugada", sinonimos: "acorda entre 3 e 5 da manh\xE3", sistema: "mental_emocional_espiritual", peso: "2", pergunta: "Voc\xEA acorda de madrugada e custa a voltar a dormir?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-504", sintoma: "ansiedade antecipat\xF3ria", sinonimos: "preocupa\xE7\xE3o com o que ainda n\xE3o aconteceu", sistema: "mental_emocional_espiritual", peso: "3", pergunta: "Voc\xEA se preocupa muito com coisas que ainda nem aconteceram?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-505", sintoma: "comer para acalmar emo\xE7\xE3o", sinonimos: "come quando fica ansioso ou triste", sistema: "mental_emocional_espiritual", peso: "3", pergunta: "Voc\xEA come para se acalmar quando fica ansioso ou triste?", fonte: "livro p. 90 (Trava do Trauma Alimentar)", status: "rascunho" }, { id: "SNT-506", sintoma: "estado de alerta constante", sinonimos: "sempre tenso;esperando algo dar errado", sistema: "mental_emocional_espiritual", peso: "3", pergunta: "Voc\xEA sente que est\xE1 sempre em alerta esperando algo dar errado?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-507", sintoma: "n\xE3o percebe fome nem saciedade", sinonimos: "come por hor\xE1rio;n\xE3o escuta o corpo", sistema: "mental_emocional_espiritual", peso: "3", pergunta: "Voc\xEA consegue perceber quando est\xE1 com fome e quando j\xE1 est\xE1 satisfeito?", fonte: "livro p. 91 (Trava da Desconex\xE3o Corpo-Mente)", status: "rascunho" }, { id: "SNT-508", sintoma: "dificuldade de concentra\xE7\xE3o", sinonimos: "mente dispersa;n\xE9voa mental", sistema: "mental_emocional_espiritual", peso: "2", pergunta: "Voc\xEA tem dificuldade de manter o foco em uma tarefa?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-509", sintoma: "irritabilidade", sinonimos: "pavio curto;perde a paci\xEAncia f\xE1cil", sistema: "mental_emocional_espiritual", peso: "2", pergunta: "Voc\xEA perde a paci\xEAncia com facilidade?", fonte: "rascunho-literatura-funcional", status: "rascunho" }, { id: "SNT-510", sintoma: "afastamento das pessoas", sinonimos: "isolamento;evita convite", sistema: "mental_emocional_espiritual", peso: "2", pergunta: "Voc\xEA tem se afastado das pessoas?", fonte: "rascunho-literatura-funcional", status: "rascunho" }], emocoes: [{ id: "EMO-101", emocao: "des\xE2nimo para come\xE7ar as coisas", padrao_emocional: "estagna\xE7\xE3o", sistema_primario: "fungico", sistema_secundario: "metabolico", peso: "3", pergunta: "Voc\xEA adia come\xE7ar coisas mesmo sabendo que precisa fazer?", fonte: "material 11/08 (padr\xE3o do F\xFAngico: estagna\xE7\xE3o e desordem)", status: "rascunho" }, { id: "EMO-102", emocao: "sensa\xE7\xE3o de vida bagun\xE7ada", padrao_emocional: "desordem", sistema_primario: "fungico", sistema_secundario: "", peso: "2", pergunta: "Voc\xEA sente que sua vida est\xE1 desorganizada e n\xE3o consegue p\xF4r ordem?", fonte: "material 11/08 (padr\xE3o do F\xFAngico: estagna\xE7\xE3o e desordem)", status: "rascunho" }, { id: "EMO-103", emocao: "peso para sair do lugar", padrao_emocional: "in\xE9rcia", sistema_primario: "fungico", sistema_secundario: "mental_emocional_espiritual", peso: "2", pergunta: "Voc\xEA sente um peso para sair do lugar mesmo querendo mudar?", fonte: "material 11/08 (padr\xE3o do F\xFAngico)", status: "rascunho" }, { id: "EMO-201", emocao: "irrita\xE7\xE3o com coisas pequenas", padrao_emocional: "reatividade", sistema_primario: "acido_inflamatorio", sistema_secundario: "mental_emocional_espiritual", peso: "3", pergunta: "Voc\xEA se irrita com facilidade por coisas pequenas?", fonte: "material 11/08 (padr\xE3o do \xC1cido-Inflamat\xF3rio: irrita\xE7\xE3o e reatividade)", status: "rascunho" }, { id: "EMO-202", emocao: "raiva que sobe r\xE1pido", padrao_emocional: "reatividade", sistema_primario: "acido_inflamatorio", sistema_secundario: "", peso: "3", pergunta: "Sua raiva sobe r\xE1pido e demora a passar?", fonte: "material 11/08 (padr\xE3o do \xC1cido-Inflamat\xF3rio)", status: "rascunho" }, { id: "EMO-203", emocao: "dificuldade de dizer n\xE3o", padrao_emocional: "limite ausente", sistema_primario: "acido_inflamatorio", sistema_secundario: "detox_linfatico", peso: "2", pergunta: "Voc\xEA costuma aceitar o que n\xE3o quer para evitar conflito?", fonte: "material 11/08 (impacto espiritual: bloqueio no plexo solar)", status: "rascunho" }, { id: "EMO-204", emocao: "engolir o que gostaria de dizer", padrao_emocional: "poder pessoal contido", sistema_primario: "acido_inflamatorio", sistema_secundario: "", peso: "2", pergunta: "Voc\xEA engole o que gostaria de dizer para n\xE3o criar problema?", fonte: "material 11/08 (impacto espiritual: bloqueio no plexo solar)", status: "rascunho" }, { id: "EMO-301", emocao: "sensa\xE7\xE3o de vazio", padrao_emocional: "falta de prop\xF3sito", sistema_primario: "metabolico", sistema_secundario: "mental_emocional_espiritual", peso: "3", pergunta: "Voc\xEA sente um vazio que a comida parece tentar preencher?", fonte: "material 11/08 (padr\xE3o do Metab\xF3lico: vazio e falta de prop\xF3sito)", status: "rascunho" }, { id: "EMO-302", emocao: "vida no autom\xE1tico", padrao_emocional: "aus\xEAncia de sentido", sistema_primario: "metabolico", sistema_secundario: "mental_emocional_espiritual", peso: "3", pergunta: "Voc\xEA sente que sua vida est\xE1 no autom\xE1tico sem um sentido claro?", fonte: "livro p. 56 (Prop\xF3sito de Vida e Nutri\xE7\xE3o)", status: "rascunho" }, { id: "EMO-303", emocao: "comida como recompensa", padrao_emocional: "alimento no lugar do afeto", sistema_primario: "metabolico", sistema_secundario: "", peso: "2", pergunta: "Voc\xEA usa comida como recompensa depois de um dia dif\xEDcil?", fonte: "livro p. 90 (Trava da Resist\xEAncia ao Prazer)", status: "rascunho" }, { id: "EMO-401", emocao: "m\xE1goa antiga n\xE3o resolvida", padrao_emocional: "ac\xFAmulo", sistema_primario: "detox_linfatico", sistema_secundario: "", peso: "3", pergunta: "Existe alguma m\xE1goa que voc\xEA carrega h\xE1 anos?", fonte: "material 11/08 (padr\xE3o do Detox: ac\xFAmulo de m\xE1goas)", status: "rascunho" }, { id: "EMO-402", emocao: "emo\xE7\xE3o guardada sem processar", padrao_emocional: "reten\xE7\xE3o emocional", sistema_primario: "detox_linfatico", sistema_secundario: "mental_emocional_espiritual", peso: "3", pergunta: "Voc\xEA costuma guardar o que sente em vez de falar?", fonte: "material 11/08 (padr\xE3o do Detox: emo\xE7\xF5es n\xE3o processadas)", status: "rascunho" }, { id: "EMO-403", emocao: "dificuldade de receber cuidado", padrao_emocional: "n\xE3o se permite receber", sistema_primario: "detox_linfatico", sistema_secundario: "", peso: "2", pergunta: "Voc\xEA tem dificuldade de aceitar ajuda ou cuidado das pessoas?", fonte: "material 11/08 (padr\xE3o do Detox)", status: "rascunho" }, { id: "EMO-501", emocao: "autocr\xEDtica severa", padrao_emocional: "narrativa interna hostil", sistema_primario: "mental_emocional_espiritual", sistema_secundario: "", peso: "3", pergunta: "Voc\xEA fala consigo mesmo de um jeito que n\xE3o falaria com um amigo?", fonte: "livro p. 92 (Reparentaliza\xE7\xE3o Nutricional)", status: "rascunho" }, { id: "EMO-502", emocao: "pensamento tudo ou nada", padrao_emocional: "perfei\xE7\xE3o", sistema_primario: "mental_emocional_espiritual", sistema_secundario: "metabolico", peso: "3", pergunta: "Se voc\xEA sai da linha um dia voc\xEA sente que perdeu tudo e abandona?", fonte: "livro p. 89 (Trava da Perfei\xE7\xE3o)", status: "rascunho" }, { id: "EMO-503", emocao: "identidade fixa sobre si", padrao_emocional: "identidade limitante", sistema_primario: "mental_emocional_espiritual", sistema_secundario: "", peso: "3", pergunta: "Voc\xEA se descreve com frases como sempre fui assim ou n\xE3o tenho for\xE7a de vontade?", fonte: "livro p. 89 (Trava da Identidade Limitante)", status: "rascunho" }, { id: "EMO-504", emocao: "culpa depois de comer", padrao_emocional: "vergonha alimentar", sistema_primario: "mental_emocional_espiritual", sistema_secundario: "metabolico", peso: "3", pergunta: "Voc\xEA sente culpa ou vergonha depois de comer?", fonte: "livro p. 90 (Trava do Trauma Alimentar)", status: "rascunho" }, { id: "EMO-505", emocao: "corpo visto como advers\xE1rio", padrao_emocional: "desconex\xE3o de si", sistema_primario: "mental_emocional_espiritual", sistema_secundario: "", peso: "3", pergunta: "Voc\xEA sente que seu corpo trabalha contra voc\xEA?", fonte: "livro p. 91 (Trava da Desconex\xE3o Corpo-Mente)", status: "rascunho" }, { id: "EMO-506", emocao: "n\xE3o se sente merecedor", padrao_emocional: "cren\xE7a de n\xE3o merecimento", sistema_primario: "mental_emocional_espiritual", sistema_secundario: "", peso: "3", pergunta: "Voc\xEA sente que n\xE3o merece as coisas boas que conquista?", fonte: "livro p. 93 (voz interna e aceita\xE7\xE3o)", status: "rascunho" }, { id: "EMO-507", emocao: "desconex\xE3o de si mesmo", padrao_emocional: "n\xE3o se reconhece", sistema_primario: "mental_emocional_espiritual", sistema_secundario: "", peso: "3", pergunta: "Voc\xEA olha para sua vida hoje e se reconhece nela?", fonte: "material 11/08 (padr\xE3o do Mental-Emocional: desconex\xE3o de si)", status: "rascunho" }], espiritual: [{ id: "ESP-101", dimensao: "proposito", item: "aus\xEAncia de dire\xE7\xE3o", leitura: "vive no autom\xE1tico sem sentido percebido", sistema: "metabolico", peso: "3", pergunta: "Voc\xEA sente que sua vida tem uma dire\xE7\xE3o clara?", fonte: "livro p. 56 (Prop\xF3sito de Vida e Nutri\xE7\xE3o)", status: "rascunho" }, { id: "ESP-102", dimensao: "proposito", item: "n\xE3o sabe qual \xE9 a pr\xF3pria contribui\xE7\xE3o", leitura: "prop\xF3sito n\xE3o formulado", sistema: "mental_emocional_espiritual", peso: "2", pergunta: "Voc\xEA sabe dizer o que veio fazer nesta vida?", fonte: "livro p. 57 (Reconex\xE3o com o Prop\xF3sito)", status: "rascunho" }, { id: "ESP-103", dimensao: "proposito", item: "rotina desalinhada do que diz querer", leitura: "incongru\xEAncia entre desejo e vida", sistema: "metabolico", peso: "2", pergunta: "Sua rotina de hoje te aproxima ou te afasta do que voc\xEA quer para sua vida?", fonte: "livro p. 57 (Avalia\xE7\xE3o de Alinhamento)", status: "rascunho" }, { id: "ESP-201", dimensao: "valor", item: "incoer\xEAncia entre valor e escolha alimentar", leitura: "vive o oposto do que diz valorizar", sistema: "mental_emocional_espiritual", peso: "3", pergunta: "Suas escolhas alimentares combinam com aquilo que voc\xEA diz valorizar?", fonte: "livro p. 54 (A Nutri\xE7\xE3o como Express\xE3o de Prop\xF3sito e Valores)", status: "rascunho" }, { id: "ESP-202", dimensao: "valor", item: "n\xE3o sabe nomear os pr\xF3prios valores", leitura: "valores n\xE3o clarificados", sistema: "mental_emocional_espiritual", peso: "2", pergunta: "Voc\xEA consegue nomear tr\xEAs coisas que s\xE3o inegoci\xE1veis para voc\xEA?", fonte: "livro p. 57 (Clarifica\xE7\xE3o de Valores)", status: "rascunho" }, { id: "ESP-203", dimensao: "principio", item: "abre m\xE3o do que \xE9 inegoci\xE1vel", leitura: "princ\xEDpio cedido", sistema: "acido_inflamatorio", peso: "2", pergunta: "Voc\xEA costuma abrir m\xE3o do que \xE9 inegoci\xE1vel para voc\xEA para agradar algu\xE9m?", fonte: "livro p. 46 (princ\xEDpios inegoci\xE1veis)", status: "rascunho" }, { id: "ESP-301", dimensao: "fe", item: "desconex\xE3o com algo maior", leitura: "perda de sustenta\xE7\xE3o transcendente", sistema: "mental_emocional_espiritual", peso: "2", pergunta: "Voc\xEA sente que existe algo maior te sustentando?", fonte: "livro p. 38 (O Pilar Espiritual)", status: "rascunho" }, { id: "ESP-302", dimensao: "fe", item: "aus\xEAncia de gratid\xE3o no cotidiano", leitura: "n\xE3o reconhece o que j\xE1 tem", sistema: "mental_emocional_espiritual", peso: "2", pergunta: "Voc\xEA para para agradecer alguma coisa durante o dia?", fonte: "livro p. 60 (Gratid\xE3o Consciente)", status: "rascunho" }, { id: "ESP-303", dimensao: "fe", item: "come sem nenhum momento de pausa", leitura: "ato alimentar dessacralizado", sistema: "metabolico", peso: "2", pergunta: "Voc\xEA faz alguma pausa antes de comer ou j\xE1 come\xE7a comendo?", fonte: "livro p. 62 (Pausa Consciente)", status: "rascunho" }, { id: "ESP-401", dimensao: "bloqueio", item: "cren\xE7a de n\xE3o merecimento", leitura: "sabota o pr\xF3prio cuidado", sistema: "mental_emocional_espiritual", peso: "3", pergunta: "Voc\xEA sente que n\xE3o merece as coisas boas que conquista?", fonte: "livro p. 86 (Investiga\xE7\xE3o de Cren\xE7as Limitantes)", status: "rascunho" }, { id: "ESP-402", dimensao: "bloqueio", item: "autossabotagem recorrente", leitura: "boicota o que estava dando certo", sistema: "mental_emocional_espiritual", peso: "3", pergunta: "Quando as coisas come\xE7am a dar certo voc\xEA acaba boicotando?", fonte: "livro p. 89 (travas mentais e emocionais)", status: "rascunho" }, { id: "ESP-403", dimensao: "bloqueio", item: "hist\xF3ria limitante sobre si", leitura: "narrativa herdada n\xE3o questionada", sistema: "mental_emocional_espiritual", peso: "2", pergunta: "Que hist\xF3ria voc\xEA conta sobre si mesmo que nunca questionou?", fonte: "livro p. 91 (Biografia Consciente)", status: "rascunho" }, { id: "ESP-404", dimensao: "bloqueio", item: "sa\xFAde associada a sofrimento", leitura: "acredita que cuidar d\xF3i", sistema: "acido_inflamatorio", peso: "2", pergunta: "Voc\xEA acredita que para ter sa\xFAde precisa sofrer ou se privar?", fonte: "livro p. 90 (Trava da Resist\xEAncia ao Prazer)", status: "rascunho" }, { id: "ESP-405", dimensao: "bloqueio", item: "m\xE1goa que trava o fluxo", leitura: "perd\xE3o n\xE3o elaborado", sistema: "detox_linfatico", peso: "3", pergunta: "Existe algu\xE9m que voc\xEA ainda n\xE3o conseguiu perdoar?", fonte: "material 11/08 (padr\xE3o do Detox: ac\xFAmulo de m\xE1goas)", status: "rascunho" }, { id: "ESP-501", dimensao: "conexao", item: "desconex\xE3o com a natureza", leitura: "perda de v\xEDnculo com os ciclos", sistema: "fungico", peso: "2", pergunta: "Quanto tempo faz que voc\xEA passou um tempo na natureza?", fonte: "livro p. 39 (alimenta\xE7\xE3o como ato sagrado)", status: "rascunho" }, { id: "ESP-502", dimensao: "conexao", item: "come sempre sozinho e com pressa", leitura: "perda da comunh\xE3o", sistema: "detox_linfatico", peso: "2", pergunta: "Voc\xEA costuma comer acompanhado ou sempre sozinho e com pressa?", fonte: "livro p. 63 (Comunh\xE3o Consciente)", status: "rascunho" }], combinacoes: [{ id: "CMB-001", condicao: "metabolico <= 3 E mental_emocional_espiritual <= 3", leitura: "Paciente vivendo em estado cr\xF4nico de amea\xE7a", prioridade: "1", fonte: "material HOLOSCOPE bloco 1", status: "confirmado" }, { id: "CMB-002", condicao: "fungico <= 3 E metabolico <= 4", leitura: "Terreno f\xFAngico sustentado por oferta constante de a\xE7\xFAcar", prioridade: "2", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { id: "CMB-003", condicao: "detox_linfatico <= 4 E acido_inflamatorio <= 4 E fungico >= 7", leitura: "Sobrecarga sem componente f\xFAngico \u2014 olhar f\xEDgado antes de microbiota", prioridade: "2", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { id: "CMB-004", condicao: "mental_emocional_espiritual <= 2 E indice <= 4", leitura: "Dimens\xE3o mental-emocional puxando o quadro inteiro para baixo", prioridade: "1", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { id: "CMB-005", condicao: "acido_inflamatorio <= 3 E mental_emocional_espiritual <= 4", leitura: "Inflama\xE7\xE3o acompanhada de reatividade emocional sustentada", prioridade: "2", fonte: "EXEMPLO-FORMATO", status: "exemplo" }], mensagens: [{ sistema: "fungico", faixa: "baixo", registro: "nutri", texto: "Nota baixa no Sistema F\xFAngico \u2014 \xE9 o sistema em maior desequil\xEDbrio. Padr\xE3o emocional associado: estagna\xE7\xE3o e desordem.", primeiros_passos: "Priorizar este sistema na conduta inicial.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "fungico", faixa: "baixo", registro: "paciente", texto: "Seu corpo est\xE1 sinalizando estagna\xE7\xE3o \u2014 perda de vitalidade e de clareza.", primeiros_passos: "Come\xE7ar pelo que o seu plano indicar para este sistema.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "fungico", faixa: "medio", registro: "nutri", texto: "Nota intermedi\xE1ria no Sistema F\xFAngico. H\xE1 sinais presentes mas ainda n\xE3o dominantes.", primeiros_passos: "Investigar os marcadores de maior peso antes de intervir.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "fungico", faixa: "medio", registro: "paciente", texto: "Existem sinais de estagna\xE7\xE3o aparecendo. Ainda d\xE1 para reverter cedo.", primeiros_passos: "Observar o que acontece com seu corpo depois das refei\xE7\xF5es.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "fungico", faixa: "alto", registro: "nutri", texto: "Nota alta no Sistema F\xFAngico \u2014 sistema em equil\xEDbrio. N\xE3o \xE9 prioridade de conduta neste momento.", primeiros_passos: "Manter observa\xE7\xE3o nas pr\xF3ximas reavalia\xE7\xF5es.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "fungico", faixa: "alto", registro: "paciente", texto: "Esse sistema est\xE1 em equil\xEDbrio hoje.", primeiros_passos: "Seguir com o que j\xE1 est\xE1 funcionando.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "acido_inflamatorio", faixa: "baixo", registro: "nutri", texto: "Nota baixa no Sistema \xC1cido-Inflamat\xF3rio \u2014 sistema em desequil\xEDbrio. Padr\xE3o emocional: irrita\xE7\xE3o e reatividade.", primeiros_passos: "Priorizar este sistema na conduta inicial.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "acido_inflamatorio", faixa: "baixo", registro: "paciente", texto: "Seu corpo est\xE1 em estado de reatividade. Isso aparece como dor e como irrita\xE7\xE3o.", primeiros_passos: "Come\xE7ar pelo que o seu plano indicar para este sistema.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "acido_inflamatorio", faixa: "medio", registro: "nutri", texto: "Nota intermedi\xE1ria no Sistema \xC1cido-Inflamat\xF3rio.", primeiros_passos: "Verificar marcadores de dor e de reatividade emocional.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "acido_inflamatorio", faixa: "medio", registro: "paciente", texto: "H\xE1 sinais de irrita\xE7\xE3o \u2014 no corpo e no humor.", primeiros_passos: "Observar em que momentos do dia a irrita\xE7\xE3o aparece.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "acido_inflamatorio", faixa: "alto", registro: "nutri", texto: "Nota alta no Sistema \xC1cido-Inflamat\xF3rio \u2014 sistema em equil\xEDbrio.", primeiros_passos: "Manter observa\xE7\xE3o.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "acido_inflamatorio", faixa: "alto", registro: "paciente", texto: "Esse sistema est\xE1 em equil\xEDbrio hoje.", primeiros_passos: "Seguir com o que j\xE1 est\xE1 funcionando.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "metabolico", faixa: "baixo", registro: "nutri", texto: "Nota baixa no Sistema Metab\xF3lico \u2014 sistema em desequil\xEDbrio. Padr\xE3o emocional: vazio e falta de prop\xF3sito.", primeiros_passos: "Priorizar este sistema na conduta inicial.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "metabolico", faixa: "baixo", registro: "paciente", texto: "Existe um vazio que a comida vem tentando preencher.", primeiros_passos: "Come\xE7ar pelo que o seu plano indicar para este sistema.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "metabolico", faixa: "medio", registro: "nutri", texto: "Nota intermedi\xE1ria no Sistema Metab\xF3lico.", primeiros_passos: "Verificar compuls\xE3o e resposta p\xF3s-refei\xE7\xE3o.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "metabolico", faixa: "medio", registro: "paciente", texto: "Sua energia est\xE1 oscilando ao longo do dia.", primeiros_passos: "Observar como voc\xEA se sente depois de cada refei\xE7\xE3o.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "metabolico", faixa: "alto", registro: "nutri", texto: "Nota alta no Sistema Metab\xF3lico \u2014 sistema em equil\xEDbrio.", primeiros_passos: "Manter observa\xE7\xE3o.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "metabolico", faixa: "alto", registro: "paciente", texto: "Esse sistema est\xE1 em equil\xEDbrio hoje.", primeiros_passos: "Seguir com o que j\xE1 est\xE1 funcionando.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "detox_linfatico", faixa: "baixo", registro: "nutri", texto: "Nota baixa no Sistema Detox + Linf\xE1tico \u2014 sistema em desequil\xEDbrio. Padr\xE3o emocional: ac\xFAmulo de m\xE1goas e emo\xE7\xF5es n\xE3o processadas.", primeiros_passos: "Priorizar este sistema na conduta inicial.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "detox_linfatico", faixa: "baixo", registro: "paciente", texto: "H\xE1 ac\xFAmulo \u2014 no corpo e no que ficou sem ser processado.", primeiros_passos: "Come\xE7ar pelo que o seu plano indicar para este sistema.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "detox_linfatico", faixa: "medio", registro: "nutri", texto: "Nota intermedi\xE1ria no Sistema Detox + Linf\xE1tico.", primeiros_passos: "Verificar reten\xE7\xE3o e sensibilidade a odores.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "detox_linfatico", faixa: "medio", registro: "paciente", texto: "Seu corpo est\xE1 acumulando mais do que consegue eliminar.", primeiros_passos: "Observar o incha\xE7o ao longo do dia.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "detox_linfatico", faixa: "alto", registro: "nutri", texto: "Nota alta no Sistema Detox + Linf\xE1tico \u2014 sistema em equil\xEDbrio.", primeiros_passos: "Manter observa\xE7\xE3o.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "detox_linfatico", faixa: "alto", registro: "paciente", texto: "Esse sistema est\xE1 em equil\xEDbrio hoje.", primeiros_passos: "Seguir com o que j\xE1 est\xE1 funcionando.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "mental_emocional_espiritual", faixa: "baixo", registro: "nutri", texto: "Nota baixa no Sistema Mental-Emocional-Espiritual \u2014 sistema em desequil\xEDbrio. Padr\xE3o emocional: desconex\xE3o de si.", primeiros_passos: "Priorizar este sistema na conduta inicial.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "mental_emocional_espiritual", faixa: "baixo", registro: "paciente", texto: "Existe uma desconex\xE3o de si que est\xE1 sustentando o restante do quadro.", primeiros_passos: "Come\xE7ar pelo que o seu plano indicar para este sistema.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "mental_emocional_espiritual", faixa: "medio", registro: "nutri", texto: "Nota intermedi\xE1ria no Sistema Mental-Emocional-Espiritual.", primeiros_passos: "Verificar narrativa interna e qualidade do sono.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "mental_emocional_espiritual", faixa: "medio", registro: "paciente", texto: "Sua mente tem trabalhado mais do que descansado.", primeiros_passos: "Observar como voc\xEA fala consigo mesmo durante o dia.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "mental_emocional_espiritual", faixa: "alto", registro: "nutri", texto: "Nota alta no Sistema Mental-Emocional-Espiritual \u2014 sistema em equil\xEDbrio.", primeiros_passos: "Manter observa\xE7\xE3o.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }, { sistema: "mental_emocional_espiritual", faixa: "alto", registro: "paciente", texto: "Esse sistema est\xE1 em equil\xEDbrio hoje.", primeiros_passos: "Seguir com o que j\xE1 est\xE1 funcionando.", fonte: "EXEMPLO-FORMATO", status: "exemplo" }], escopo: [{ id: "ESC-001", padrao: "(?i)\\b(receit|prescrev|prescri\xE7|posologi)\\w*", motivo: "Prescri\xE7\xE3o de medicamento \xE9 ato m\xE9dico", gravidade: "bloqueio", resposta: "Isso \xE9 prescri\xE7\xE3o m\xE9dica e est\xE1 fora do que eu posso responder. Encaminhe ao m\xE9dico respons\xE1vel." }, { id: "ESC-002", padrao: "(?i)\\b\\d+\\s?(mg|mcg|\xB5g|ui|ml)\\b", motivo: "Indica\xE7\xE3o de dose", gravidade: "bloqueio", resposta: "N\xE3o indico dose. Quem define dose \xE9 o profissional prescritor na consulta." }, { id: "ESC-003", padrao: "(?i)\\b(parar|suspender|trocar|cortar)\\s+(o\\s+)?(rem[e\xE9]dio|medicamento|medica[c\xE7][a\xE3]o)", motivo: "Suspens\xE3o de medicamento \xE9 ato m\xE9dico", gravidade: "bloqueio", resposta: "Altera\xE7\xE3o de medicamento s\xF3 com o m\xE9dico que prescreveu. N\xE3o posso orientar sobre isso." }, { id: "ESC-004", padrao: "(?i)\\b(tenho|estou com|\xE9)\\s+(c[a\xE2]ncer|diabetes|hipotireoidismo|depress[a\xE3]o|l[u\xFA]pus|tireoidite)", motivo: "Diagn\xF3stico de doen\xE7a \xE9 ato m\xE9dico", gravidade: "bloqueio", resposta: "Diagn\xF3stico de doen\xE7a \xE9 do m\xE9dico. O que eu leio aqui \xE9 o mapa dos sistemas \u2014 n\xE3o um diagn\xF3stico cl\xEDnico." }, { id: "ESC-005", padrao: "(?i)\\b(curar|cura|trata)\\s+(o\\s+|a\\s+)?(c[a\xE2]ncer|diabetes|doen[c\xE7]a)", motivo: "Promessa de cura", gravidade: "bloqueio", resposta: "N\xE3o trabalho com promessa de cura. Posso mostrar o que o mapa aponta e quais s\xE3o os primeiros passos." }, { id: "ESC-006", padrao: "(?i)\\b(exame de sangue|hemograma|tsh|vitamina d)\\b.*\\b(interpret|resultado|significa)\\w*", motivo: "Interpreta\xE7\xE3o de exame fora do escopo nutricional", gravidade: "aviso", resposta: "Posso comentar o que isso significa dentro do mapa dos sistemas. A interpreta\xE7\xE3o cl\xEDnica do exame \xE9 do profissional." }, { id: "ESC-007", padrao: "(?i)\\b(jejum prolongado|jejum de \\d+ dias|dieta de \\d+ calorias)", motivo: "Conduta restritiva sem avalia\xE7\xE3o individual", gravidade: "aviso", resposta: "Isso depende de avalia\xE7\xE3o individual. N\xE3o d\xE1 para responder sem a nutricionista olhar o caso." }, { id: "ESC-008", padrao: "(?i)\\b(tratar|curar|reverter|melhorar)\\s+(o\\s+|a\\s+)?(hipotireoidismo|tireoidite|diabetes|c[a\xE2]ncer|l[u\xFA]pus|artrite|artrose|depress[a\xE3]o|endometriose|sibo|gastrite|refluxo|enxaqueca)", motivo: "Conduta terap\xEAutica para doen\xE7a \xE9 ato m\xE9dico", gravidade: "bloqueio", resposta: "Tratamento de doen\xE7a \xE9 conduta m\xE9dica. Posso falar do que o m\xE9todo diz sobre o terreno; o tratamento \xE9 com o m\xE9dico." }, { id: "ESC-009", padrao: "(?i)\\b(qual|quanto|quantos|quantas)\\b.{0,30}\\b(dose|dosagem|posologia|comprimido|c[a\xE1]psula)", motivo: "Pedido de dose", gravidade: "bloqueio", resposta: "N\xE3o indico dose. Quem define dose \xE9 o profissional prescritor na consulta." }, { id: "ESC-010", padrao: "(?i)\\b(pode|posso|devo)\\s+(tomar|usar|suplementar)\\b", motivo: "Pedido de indica\xE7\xE3o de suplemento ou medicamento", gravidade: "aviso", resposta: "Indica\xE7\xE3o individual \xE9 da nutricionista na consulta. Posso dizer o que o m\xE9todo diz sobre esse sistema." }, { id: "ESC-011", padrao: "(?i)\\b(quanto|quanta|quantos|quantas)\\b(?!\\s+tempo)\\b.{0,40}\\b(tomar|tomo|ingerir|suplementar)\\b", motivo: "Pedido de quantidade a ingerir \u2014 \xE9 prescri\xE7\xE3o", gravidade: "bloqueio", resposta: "Quantidade de medicamento ou suplemento \xE9 prescri\xE7\xE3o, e isso \xE9 com quem prescreve. Posso falar do padr\xE3o alimentar por tr\xE1s da queixa." }] };

  // src/bancos.ts
  function num(valor, campo, onde) {
    const n = Number(valor);
    if (!Number.isFinite(n)) throw new Error(onde + ': "' + campo + '" nao e numero: "' + valor + '"');
    return n;
  }
  function sinonimos(valor) {
    return valor ? valor.split(";").map((s) => s.trim()).filter(Boolean) : [];
  }
  function normalizarBancos(bruto) {
    const chaves = {};
    for (const l of bruto.config) chaves[l.chave] = l.valor;
    const config = {
      escala_max: num(chaves.escala_max ?? "3", "escala_max", "config.csv"),
      indice_maximo: num(chaves.indice_maximo ?? "10", "indice_maximo", "config.csv"),
      indice_casas: num(chaves.indice_casas ?? "0", "indice_casas", "config.csv"),
      nota_casas: num(chaves.nota_casas ?? "1", "nota_casas", "config.csv"),
      peso_secundario_fator: num(
        chaves.peso_secundario_fator ?? "1",
        "peso_secundario_fator",
        "config.csv"
      )
    };
    const sistemas2 = bruto.sistemas.map((l) => ({
      id: l.id,
      nome: l.nome,
      cor: l.cor,
      padrao_emocional: l.padrao_emocional,
      impacto_espiritual: l.impacto_espiritual
    }));
    const regras = /* @__PURE__ */ new Map();
    for (const l of bruto.regras) {
      regras.set(l.sistema, {
        sistema: l.sistema,
        formula: l.formula,
        faixa_baixa_ate: num(l.faixa_baixa_ate, "faixa_baixa_ate", "regras.csv"),
        faixa_media_ate: num(l.faixa_media_ate, "faixa_media_ate", "regras.csv"),
        peso_indice: num(l.peso_indice, "peso_indice", "regras.csv")
      });
    }
    const marcadores = [];
    for (const l of bruto.sintomas) {
      marcadores.push({
        id: l.id,
        origem: "sintoma",
        rotulo: l.sintoma,
        pergunta: l.pergunta,
        sistema: l.sistema,
        peso: num(l.peso, "peso", "sintomas.csv"),
        fonte: l.fonte,
        status: l.status,
        sinonimos: sinonimos(l.sinonimos),
        secundario: false
      });
    }
    for (const l of bruto.emocoes) {
      const peso = num(l.peso, "peso", "emocoes.csv");
      marcadores.push({
        id: l.id,
        origem: "emocao",
        rotulo: l.emocao,
        pergunta: l.pergunta,
        sistema: l.sistema_primario,
        peso,
        fonte: l.fonte,
        status: l.status,
        sinonimos: [],
        padrao_emocional: l.padrao_emocional,
        secundario: false
      });
      if (l.sistema_secundario) {
        marcadores.push({
          id: l.id,
          origem: "emocao",
          rotulo: l.emocao,
          pergunta: l.pergunta,
          sistema: l.sistema_secundario,
          peso: peso * config.peso_secundario_fator,
          fonte: l.fonte,
          status: l.status,
          sinonimos: [],
          padrao_emocional: l.padrao_emocional,
          secundario: true
        });
      }
    }
    for (const l of bruto.espiritual) {
      marcadores.push({
        id: l.id,
        origem: "espiritual",
        rotulo: l.item,
        pergunta: l.pergunta,
        sistema: l.sistema,
        peso: num(l.peso, "peso", "espiritual.csv"),
        fonte: l.fonte,
        status: l.status,
        sinonimos: [],
        dimensao: l.dimensao,
        leitura: l.leitura,
        secundario: false
      });
    }
    const combinacoes = bruto.combinacoes.map((l) => ({
      id: l.id,
      condicao: l.condicao,
      leitura: l.leitura,
      prioridade: num(l.prioridade, "prioridade", "combinacoes.csv"),
      fonte: l.fonte,
      status: l.status
    }));
    const mensagens = bruto.mensagens.map((l) => ({
      sistema: l.sistema,
      faixa: l.faixa,
      registro: l.registro,
      texto: l.texto,
      primeiros_passos: l.primeiros_passos,
      fonte: l.fonte,
      status: l.status
    }));
    const politicas = bruto.escopo.map((l) => ({
      id: l.id,
      padrao: l.padrao,
      motivo: l.motivo,
      gravidade: l.gravidade,
      resposta: l.resposta
    }));
    return { config, sistemas: sistemas2, regras, marcadores, combinacoes, mensagens, politicas };
  }
  function montarQuestionario(bancos2) {
    const vistos = /* @__PURE__ */ new Set();
    const ordem = { sintoma: 0, emocao: 1, espiritual: 2 };
    return bancos2.marcadores.filter((m) => {
      if (vistos.has(m.id)) return false;
      vistos.add(m.id);
      return true;
    }).sort((a, b) => ordem[a.origem] - ordem[b.origem] || a.id.localeCompare(b.id)).map((m) => ({ id: m.id, origem: m.origem, rotulo: m.rotulo, pergunta: m.pergunta }));
  }

  // src/motor.ts
  function arred(n, casas) {
    const f = 10 ** casas;
    return Math.round((n + Number.EPSILON) * f) / f;
  }
  var EIXO_POR_ORIGEM = {
    sintoma: "fisico",
    emocao: "mental",
    espiritual: "espiritual"
  };
  function avaliarCondicao(condicao, valores) {
    const partes = condicao.split(/\s+(E|OU)\s+/);
    let resultado = avaliarTermo(partes[0], valores);
    for (let i = 1; i < partes.length; i += 2) {
      const operador = partes[i];
      const proximo = avaliarTermo(partes[i + 1], valores);
      resultado = operador === "E" ? resultado && proximo : resultado || proximo;
    }
    return resultado;
  }
  function avaliarTermo(termo, valores) {
    const m = /^\s*([a-z_]+)\s*(>=|<=|==|>|<)\s*(-?\d+(?:\.\d+)?)\s*$/i.exec(termo ?? "");
    if (!m) {
      throw new Error(
        'Condicao invalida: "' + termo + '". Formato esperado: <sistema> >= <numero>'
      );
    }
    const nome = m[1];
    const operador = m[2];
    const alvo = Number(m[3]);
    if (!(nome in valores)) {
      throw new Error(
        'Condicao usa "' + nome + '", que nao e um sistema conhecido nem "indice". Disponiveis: ' + Object.keys(valores).join(", ")
      );
    }
    const v = valores[nome];
    switch (operador) {
      case ">=":
        return v >= alvo;
      case "<=":
        return v <= alvo;
      case ">":
        return v > alvo;
      case "<":
        return v < alvo;
      case "==":
        return v === alvo;
      default:
        throw new Error("Operador desconhecido: " + operador);
    }
  }
  function faixaDe(nota, baixaAte, mediaAte) {
    if (nota <= baixaAte) return "baixo";
    if (nota <= mediaAte) return "medio";
    return "alto";
  }
  function pontuar(bancos2, respostas) {
    const config = bancos2.config;
    const porId = /* @__PURE__ */ new Map();
    for (const r of respostas) {
      if (porId.has(r.marcador_id)) {
        throw new Error("Resposta duplicada para " + r.marcador_id);
      }
      if (!Number.isInteger(r.intensidade) || r.intensidade < 0 || r.intensidade > config.escala_max) {
        throw new Error(
          "Intensidade invalida em " + r.marcador_id + ": " + r.intensidade + " (esperado inteiro de 0 a " + config.escala_max + ")"
        );
      }
      porId.set(r.marcador_id, r.intensidade);
    }
    const auditoria = [];
    const sistemas2 = [];
    const notas = {};
    for (const sistema of bancos2.sistemas) {
      const regra = bancos2.regras.get(sistema.id);
      if (!regra) {
        throw new Error('Sem regra em regras.csv para o sistema "' + sistema.id + '"');
      }
      const linhas = bancos2.marcadores.filter((m) => m.sistema === sistema.id);
      let obtido = 0;
      let maximo = 0;
      let respondidos = 0;
      const contribuicoes = [];
      for (const m of linhas) {
        maximo += m.peso * config.escala_max;
        const intensidade = porId.get(m.id);
        if (intensidade === void 0) continue;
        respondidos++;
        const pontos = m.peso * intensidade;
        obtido += pontos;
        if (pontos > 0) {
          contribuicoes.push({
            marcador_id: m.id,
            rotulo: m.rotulo,
            origem: m.origem,
            peso: m.peso,
            intensidade,
            pontos: arred(pontos, 2),
            fonte: m.fonte
          });
        }
      }
      const carga = maximo > 0 ? arred(obtido / maximo * 10, config.nota_casas) : 0;
      const nota = arred(10 - carga, config.nota_casas);
      notas[sistema.id] = nota;
      auditoria.push(...contribuicoes);
      contribuicoes.sort((a, b) => b.pontos - a.pontos || a.marcador_id.localeCompare(b.marcador_id));
      sistemas2.push({
        sistema: sistema.id,
        nome: sistema.nome,
        nota,
        carga,
        faixa: faixaDe(nota, regra.faixa_baixa_ate, regra.faixa_media_ate),
        obtido: arred(obtido, 2),
        maximo: arred(maximo, 2),
        respondidos,
        total_marcadores: linhas.length,
        dominantes: contribuicoes.slice(0, 5)
      });
    }
    let somaPesos = 0;
    for (const r of bancos2.regras.values()) somaPesos += r.peso_indice;
    let notaMedia = 0;
    for (const s of sistemas2) {
      const regra = bancos2.regras.get(s.sistema);
      if (!regra) continue;
      notaMedia += s.nota * (regra.peso_indice / somaPesos);
    }
    notaMedia = arred(notaMedia, 2);
    const indice = arred(notaMedia * (config.indice_maximo / 10), config.indice_casas);
    const triada = { fisico: 0, mental: 0, espiritual: 0 };
    const eixos = ["fisico", "mental", "espiritual"];
    for (const eixo of eixos) {
      const linhas = bancos2.marcadores.filter((m) => EIXO_POR_ORIGEM[m.origem] === eixo);
      let obtido = 0;
      let maximo = 0;
      for (const m of linhas) {
        maximo += m.peso * config.escala_max;
        obtido += m.peso * (porId.get(m.id) ?? 0);
      }
      triada[eixo] = maximo > 0 ? arred(10 - obtido / maximo * 10, config.nota_casas) : 10;
    }
    const porChacra = /* @__PURE__ */ new Map();
    for (const m of bancos2.marcadores) {
      if (m.dimensao !== "chacra") continue;
      const atual = porChacra.get(m.rotulo) ?? { obtido: 0, maximo: 0, leitura: m.leitura ?? "" };
      atual.maximo += m.peso * config.escala_max;
      atual.obtido += m.peso * (porId.get(m.id) ?? 0);
      porChacra.set(m.rotulo, atual);
    }
    const frequencias = [...porChacra.entries()].map(([chacra, v]) => ({
      chacra,
      nota: v.maximo > 0 ? arred(10 - v.obtido / v.maximo * 10, config.nota_casas) : 10,
      leitura: v.leitura
    })).sort((a, b) => a.nota - b.nota || a.chacra.localeCompare(b.chacra));
    const valores = { ...notas, indice };
    const combinacoes = bancos2.combinacoes.filter((c) => avaliarCondicao(c.condicao, valores)).map((c) => ({
      id: c.id,
      leitura: c.leitura,
      prioridade: c.prioridade,
      condicao: c.condicao,
      fonte: c.fonte
    })).sort((a, b) => a.prioridade - b.prioridade || a.id.localeCompare(b.id));
    const idsConhecidos = new Set(bancos2.marcadores.map((m) => m.id));
    const totalPerguntas = idsConhecidos.size;
    let respondidas = 0;
    for (const id of porId.keys()) if (idsConhecidos.has(id)) respondidas++;
    auditoria.sort((a, b) => b.pontos - a.pontos || a.marcador_id.localeCompare(b.marcador_id));
    return {
      indice,
      indice_maximo: config.indice_maximo,
      nota_media: notaMedia,
      sistemas: sistemas2,
      triada,
      frequencias,
      combinacoes,
      cobertura: {
        respondidos: respondidas,
        total: totalPerguntas,
        percentual: totalPerguntas > 0 ? arred(respondidas / totalPerguntas * 100, 0) : 0
      },
      auditoria
    };
  }

  // src/escopo.ts
  function compilar(politica) {
    let fonte = politica.padrao;
    let flags = "g";
    if (fonte.startsWith("(?i)")) {
      fonte = fonte.slice(4);
      flags += "i";
    }
    try {
      return new RegExp(fonte, flags);
    } catch (e) {
      throw new Error(
        "escopo.csv " + politica.id + ': expressao invalida "' + politica.padrao + '" \u2014 ' + (e instanceof Error ? e.message : String(e))
      );
    }
  }
  function verificarEscopo(bancos2, texto) {
    const bloqueios = [];
    const avisos = [];
    for (const politica of bancos2.politicas) {
      const re = compilar(politica);
      const encontrado = re.exec(texto);
      if (!encontrado) continue;
      const achado = {
        id: politica.id,
        motivo: politica.motivo,
        resposta: politica.resposta,
        trecho: encontrado[0]
      };
      if (politica.gravidade === "bloqueio") bloqueios.push(achado);
      else avisos.push(achado);
    }
    return { permitido: bloqueios.length === 0, bloqueios, avisos };
  }

  // src/navegador.ts
  var bancos = normalizarBancos(bancos_default);
  function questionario() {
    return montarQuestionario(bancos);
  }
  function calcular(respostas) {
    return pontuar(bancos, respostas);
  }
  function escopo(texto) {
    return verificarEscopo(bancos, texto);
  }
  function sistemas() {
    return bancos.sistemas;
  }
  function combinacoesDeNotas(notas) {
    const valores = { ...notas, indice: indiceDeNotas(notas) };
    return bancos.combinacoes.filter((c) => avaliarCondicao(c.condicao, valores)).sort((a, b) => a.prioridade - b.prioridade).map((c) => ({ id: c.id, leitura: c.leitura, condicao: c.condicao, fonte: c.fonte }));
  }
  function indiceDeNotas(notas) {
    let media = 0;
    for (const [sistema, regra] of bancos.regras) {
      media += (notas[sistema] ?? 0) * regra.peso_indice;
    }
    const bruto = media * (bancos.config.indice_maximo / 10);
    const casas = bancos.config.indice_casas;
    return Math.round(bruto * 10 ** casas) / 10 ** casas;
  }
  function mensagem(sistema, nota, registro) {
    const regra = bancos.regras.get(sistema);
    const faixa = !regra ? "media" : nota <= regra.faixa_baixa_ate ? "baixa" : nota <= regra.faixa_media_ate ? "media" : "alta";
    const m = bancos.mensagens.find(
      (x) => x.sistema === sistema && x.faixa === faixa && x.registro === registro
    );
    return m ? { texto: m.texto, primeiros_passos: m.primeiros_passos, faixa, fonte: m.fonte } : null;
  }
  function resumo() {
    const porOrigem = {};
    const vistos = /* @__PURE__ */ new Set();
    for (const m of bancos.marcadores) {
      if (vistos.has(m.id)) continue;
      vistos.add(m.id);
      porOrigem[m.origem] = (porOrigem[m.origem] ?? 0) + 1;
    }
    return {
      marcadores: vistos.size,
      por_origem: porOrigem,
      sistemas: bancos.sistemas.length,
      combinacoes: bancos.combinacoes.length,
      mensagens: bancos.mensagens.length
    };
  }
  return __toCommonJS(navegador_exports);
})();
