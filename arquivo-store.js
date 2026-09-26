/* ===========================================================================
   ONDE OS ARQUIVOS DO PACIENTE FICAM
   ===========================================================================

   PDF de exame e foto de laudo sao arquivos de verdade: 1 a 5 MB cada. O
   localStorage tem ~5 MB no total e guarda texto, entao um unico exame o
   estouraria — e ele quebra calado quando enche. O IndexedDB do mesmo
   navegador oferece ~10 GB e guarda o arquivo inteiro, sem converter.

   Por enquanto isso vive so na maquina de quem usa. Nao e o ideal — troca de
   computador e perde —, mas para dado de saude e mais seguro do que o
   Supabase esta hoje, que grava com chave publica e sem login.

   Quando o Supabase Storage entrar, as funcoes daqui sao as unicas que mudam:
   salvar, listar, abrir e remover. Nada mais no app conhece o IndexedDB.

   LGPD: exame e laudo sao dado pessoal sensivel (art. 5 II e art. 11).
   Nao sai do navegador, nao vai para lugar nenhum, e some com o botao remover.

   ---------------------------------------------------------------------------
   DUAS COISAS QUE ESTE ARQUIVO FAZIA ERRADO, E QUE UM ROLLBACK NAO PERDOARIA
   ---------------------------------------------------------------------------

   1. REQUEST NAO E TRANSACAO.

      salvar() e remover() resolviam no `request.onsuccess`. Isso quer dizer
      "o pedido foi aceito", NAO "o dado esta no disco": a transacao ainda
      esta aberta e pode abortar depois — por erro, por cota, ou porque a
      pagina foi embora. Quem chamava recarregava a tela achando que estava
      salvo.

      As duas coisas sao distintas e continuam distintas:
        REQUEST      produz o RESULTADO.
        TRANSACTION  confirma a DURABILIDADE.
      Entao guarda-se o resultado do request e so se resolve no
      `transaction.oncomplete`.

   2. ERRO DE LEITURA NAO E COLECAO VAZIA.

      listar() e listarTudo() terminavam em `.catch(function () { return []; })`.
      Banco fechado, transacao abortada, disco com problema — tudo virava "este
      paciente nao tem documento". A tela mostrava calma onde havia falha, e
      foi isso que produziu a instabilidade intermitente de testar-ficha-abas.

      Agora ha um nucleo ESTRITO, que rejeita erro de verdade, e uma camada de
      apresentacao que decide conscientemente mostrar vazio — registrando a
      falha em ultimaFalha() em vez de engoli-la. A consulta e UMA SO: as
      funcoes tolerantes sao casca fina por cima da estrita.

      Backup, diagnostico e qualquer restauracao futura usam a ESTRITA. Nao da
      para fazer copia de seguranca de uma lista que pode ser vazia por engano.

   NAO CORRIGIDO AQUI, DE PROPOSITO: o id e montado com
   Date.now() + hash(nome + tamanho), entao dois arquivos de mesmo nome e
   mesmo tamanho salvos no mesmo milissegundo colidem. E outro comportamento,
   nao e requisito para garantir o commit, e continua no backlog.
   =========================================================================== */

(function () {
  "use strict";

  var BANCO = "holohacking";
  var LOJA = "arquivos";
  var VERSAO = 1;
  var bd = null;

  /* A ultima falha que a camada tolerante engoliu para a tela nao quebrar.
     Existe para que "engolir" nao seja o mesmo que "esconder": quem quiser
     saber por que a lista veio vazia tem onde olhar. */
  var ultimaFalha = null;

  function guardarFalha(onde, e) {
    ultimaFalha = {
      onde: onde,
      nome: (e && e.name) || "Error",
      mensagem: (e && e.message) || String(e),
      quando: new Date().toISOString()
    };
    return ultimaFalha;
  }

  function abrir() {
    if (bd) return Promise.resolve(bd);
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(BANCO, VERSAO);
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains(LOJA)) {
          var loja = d.createObjectStore(LOJA, { keyPath: "id" });
          loja.createIndex("paciente", "paciente", { unique: false });
        }
      };
      req.onsuccess = function () {
        bd = req.result;
        /* Uma conexao pode morrer sem ninguem avisar este modulo: outra aba
           pede uma versao nova, ou o navegador derruba o banco. Sem isto, o
           handle em cache fica velho e TODA chamada seguinte falha — e antes,
           com o catch que devolvia [], falhava calada. */
        bd.onversionchange = function () { try { bd.close(); } catch (e) {} bd = null; };
        bd.onclose = function () { bd = null; };
        resolve(bd);
      };
      req.onerror = function () { reject(req.error); };
      req.onblocked = function () {
        reject(new Error("o banco esta bloqueado por outra aba deste app"));
      };
    });
  }

  /** A loja e a transacao que a contem — as duas, porque quem escreve precisa
      da segunda para saber que terminou. */
  function transacao(modo) {
    return abrir().then(function (d) {
      try {
        var tx = d.transaction(LOJA, modo);
        return { loja: tx.objectStore(LOJA), tx: tx };
      } catch (e) {
        /* InvalidStateError: o handle em cache aponta para uma conexao que
           fechou. Uma reabertura resolve — e so uma: se falhar de novo, o
           erro sobe, que e o comportamento certo. */
        if (e && e.name === "InvalidStateError") {
          bd = null;
          return abrir().then(function (d2) {
            var tx2 = d2.transaction(LOJA, modo);
            return { loja: tx2.objectStore(LOJA), tx: tx2 };
          });
        }
        throw e;
      }
    });
  }

  /** O RESULTADO de um pedido. Nao diz nada sobre durabilidade. */
  function promessa(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  /** A DURABILIDADE. Resolve so no commit; rejeita no erro e no abort.
      Sem timeout: um prazo inventado transformaria uma transacao lenta numa
      falha falsa, e o IndexedDB ja termina sozinho de um jeito ou de outro. */
  function aguardarTransacao(tx) {
    return new Promise(function (resolve, reject) {
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () {
        reject(tx.error || new Error("a transacao falhou"));
      };
      tx.onabort = function () {
        reject(tx.error || new Error("a transacao foi abortada"));
      };
    });
  }

  /* ---------- escrita — resolve depois do commit ------------------------- */

  /** A mesma guarda que as escritas de localStorage consultam. Anexar um
      laudo enquanto outra aba deixou uma restauracao pela metade e escrever
      num disco cujo estado ninguem sabe descrever.

      As escritas INTERNAS de uma operacao critica passam — elas sao a
      operacao —, e substituirTudoEstrito nem consulta isto: ele so e chamado
      de dentro do motor. */
  function barrado() {
    if (!window.Concorrencia) return null;
    var v = window.Concorrencia.podeEscrever({ ignorarRevisao: true });
    if (v.ok) return null;
    var e = new Error(v.mensagem);
    e.name = v.codigo;
    e.codigo = v.codigo;
    return e;
  }

  /** Guarda o arquivo inteiro, sem converter para texto.
      So resolve quando a transacao tiver COMMITADO: quando esta promessa
      cumpre, recarregar a pagina no instante seguinte nao perde o arquivo. */
  function salvar(paciente, arquivo, meta) {
    var impedido = barrado();
    if (impedido) return Promise.reject(impedido);
    var id = "arq-" + Date.now() + "-" + Math.abs(hash(arquivo.name + arquivo.size));
    var registro = {
      id: id,
      paciente: paciente,
      nome: meta.nome || arquivo.name,
      tipo: meta.tipo || "Outro",
      data: meta.data || "",
      mime: arquivo.type || "application/octet-stream",
      tamanho: arquivo.size,
      arquivo: arquivo
    };
    var uid = uidAtual();
    if (uid) registro.uid = uid;
    return transacao("readwrite")
      .then(function (t) {
        /* o pedido produz o resultado; a transacao confirma que ele ficou */
        var pedido = promessa(t.loja.add(registro));
        return Promise.all([pedido, aguardarTransacao(t.tx)]);
      })
      .then(function () { return registro; })
      .catch(function (e) {
        // QuotaExceededError e o unico erro que a pessoa precisa entender
        if (e && /quota/i.test(e.name || "")) {
          throw new Error("Não há espaço no navegador para este arquivo. " +
                          "Remova algum documento antigo e tente de novo.");
        }
        throw e;
      });
  }

  /** Quando esta promessa cumpre, o arquivo nao volta: a transacao commitou. */
  function remover(id) {
    var impedido = barrado();
    if (impedido) return Promise.reject(impedido);
    return transacao("readwrite").then(function (t) {
      var pedido = promessa(t.loja.delete(id));
      return Promise.all([pedido, aguardarTransacao(t.tx)]);
    }).then(function () { return true; });
  }

  /** Troca TODO o conteudo da loja pelos registros dados, numa transacao so.

      Existe porque salvar() nao serve para restaurar: ele GERA um id novo, e
      restaurar um backup com ids novos seria trocar a identidade de cada
      documento — as referencias do pacote deixariam de apontar para nada.
      Aqui os registros entram exatamente como vieram, id inclusive, com todos
      os campos que tiverem, inclusive os que este codigo nao conhece.

      E tudo-ou-nada: limpar e inserir acontecem na MESMA transacao readwrite.
      Se qualquer insercao falhar, a transacao aborta e a loja fica como
      estava — nao ha meio-caminho em que os documentos antigos ja sumiram e
      os novos nao entraram. Resolve so no commit.

      ESTRITA de proposito, sem versao tolerante: restaurar pela metade em
      silencio e o pior desfecho possivel desta operacao. */
  function substituirTudoEstrito(registros) {
    if (!Array.isArray(registros)) {
      return Promise.reject(new TypeError("substituirTudoEstrito espera um array"));
    }
    return transacao("readwrite").then(function (t) {
      /* Os pedidos sao criados TODOS na mesma transacao. Criar um pedido
         depois de um await deixaria a transacao fechar sozinha por
         inatividade — e e assim que uma restauracao "some" pela metade. */
      var esperar = aguardarTransacao(t.tx);
      var pedidos;
      try {
        pedidos = [promessa(t.loja.clear())];
        registros.forEach(function (r) {
          pedidos.push(promessa(t.loja.put(r)));
        });
      } catch (e) {
        /* put() pode lancar NA HORA — um registro que nao atravessa a
           clonagem estruturada, por exemplo. Esse throw escapa do callback e
           rejeita a promessa, mas NAO aborta a transacao: o clear() e os puts
           que ja passaram commitariam sozinhos, e a loja ficaria com meia
           restauracao dentro. Entao o abort e explicito. */
        try { t.tx.abort(); } catch (ignorado) {}
        /* O abort faz os pedidos ja criados rejeitarem com AbortError. Nesta
           saida ninguem os espera, e promessa rejeitada sem dono vira erro de
           pagina — entao cada uma ganha um dono aqui. O erro que interessa e
           o original, que e o relancado abaixo. */
        (pedidos || []).forEach(function (pr) { pr.catch(function () {}); });
        /* deixa o onabort assentar antes de propagar, para quem esperava a
           transacao nao ficar com uma rejeicao solta */
        return esperar.catch(function () {}).then(function () { throw e; });
      }
      /* aguardarTransacao entra junto: se um put falhar de forma assincrona,
         a transacao aborta e e ela quem conta a historia inteira. */
      return Promise.all([Promise.all(pedidos), esperar]);
    }).then(function () { return registros.length; });
  }

  /** Apaga TODOS os documentos de um paciente, numa transacao so.

      Existe porque a alternativa — listar e chamar remover() em cada um —
      abre uma transacao por documento: se a quinta falhar, as quatro
      primeiras ja commitaram e o paciente fica com meia pasta. Aqui e
      tudo-ou-nada.

      Usa o indice paciente, que ja existia desde o primeiro dia: a cascata
      nao precisou de campo novo nem de migracao de dado.

      ESTRITA e sem versao tolerante: apagar pela metade em silencio e o pior
      desfecho possivel de uma exclusao. */
  function removerDoPacienteEstrito(pid) {
    if (typeof pid !== "string" || !pid) {
      return Promise.reject(new TypeError("pid invalido"));
    }
    return transacao("readwrite").then(function (t) {
      var esperar = aguardarTransacao(t.tx);
      var pedidos;
      try {
        /* getAllKeys no indice devolve as CHAVES PRIMARIAS dos registros
           daquele paciente — exatamente o que o delete precisa, e sem trazer
           um megabyte de blob para a memoria so para descobrir um id. */
        pedidos = [promessa(t.loja.index("paciente").getAllKeys(pid))
          .then(function (chaves) {
            /* os deletes sao criados DENTRO da mesma transacao; cria-los
               depois de um await a deixaria fechar por inatividade */
            return Promise.all((chaves || []).map(function (k) {
              return promessa(t.loja.delete(k));
            })).then(function () { return (chaves || []).length; });
          })];
      } catch (e) {
        try { t.tx.abort(); } catch (ignorado) {}
        return esperar.catch(function () {}).then(function () { throw e; });
      }
      return Promise.all([pedidos[0], esperar]).then(function (par) {
        return par[0];
      });
    });
  }

  /* ---------- leitura — o nucleo estrito ---------------------------------
     UMA implementacao por consulta. Ela rejeita erro de verdade. As versoes
     tolerantes, mais abaixo, sao casca por cima destas. */

  function semBlob(i) {
    return { id: i.id, paciente: i.paciente, nome: i.nome, tipo: i.tipo,
             data: i.data, mime: i.mime, tamanho: i.tamanho };
  }
  function porData(a, b) { return (b.data || "").localeCompare(a.data || ""); }

  /** Os documentos de um paciente. REJEITA se a leitura falhar — lista vazia
      aqui quer dizer "li o banco e nao ha nada", e so isso. */
  function listarEstrito(paciente) {
    return transacao("readonly").then(function (t) {
      /* A criacao do pedido pode lancar na hora (chave invalida, por exemplo):
         isso tem que virar rejeicao, nao excecao sincrona no meio de um then. */
      var req = t.loja.index("paciente").getAll(paciente);
      return Promise.all([promessa(req), aguardarTransacao(t.tx)]);
    }).then(function (par) {
      var uid = uidAtual();
      return (par[0] || [])
        .filter(function (i) {
          if (!uid) return true;
          return i.uid === uid;
        })
        .map(function (i) {
          return { id: i.id, nome: i.nome, tipo: i.tipo, data: i.data,
                   mime: i.mime, tamanho: i.tamanho };
        }).sort(porData);
    });
  }

  /** Todos os arquivos de todos os pacientes, sem os blobs. REJEITA em erro. */
  function listarTudoEstrito() {
    return transacao("readonly").then(function (t) {
      var req = t.loja.getAll();
      return Promise.all([promessa(req), aguardarTransacao(t.tx)]);
    }).then(function (par) {
      var uid = uidAtual();
      return (par[0] || [])
        .filter(function (i) {
          if (!uid) return true;
          return i.uid === uid;
        })
        .map(semBlob).sort(porData);
    });
  }

  /** O registro inteiro, com o blob. `undefined` quer dizer "nao existe" —
      essa semantica ja estava certa e continua; o que muda e que erro de
      banco rejeita em vez de se confundir com ausencia. */
  function pegarEstrito(id) {
    return transacao("readonly").then(function (t) {
      var req = t.loja.get(id);
      return Promise.all([promessa(req), aguardarTransacao(t.tx)]);
    }).then(function (par) {
      var registro = par[0];
      if (!registro) return registro;
      var uid = uidAtual();
      if (uid && registro.uid !== uid) return undefined;
      return registro;
    });
  }

  /* ---------- leitura — a camada de apresentacao -------------------------
     A tela prefere uma lista vazia a uma tela quebrada, e isso e uma decisao
     legitima — desde que seja DECISAO, e nao acidente. Estas tres devolvem o
     vazio e REGISTRAM a falha em ultimaFalha(), para que ela possa ser vista.

     Quem NAO deve usar estas: backup, diagnostico, e qualquer restauracao. */

  function listar(paciente) {
    return listarEstrito(paciente).catch(function (e) {
      guardarFalha("listar", e);
      return [];
    });
  }

  function listarTudo() {
    return listarTudoEstrito().catch(function (e) {
      guardarFalha("listarTudo", e);
      return [];
    });
  }

  /** pegar() NAO ganha versao tolerante: `undefined` ja quer dizer "nao
      existe", e devolver undefined tambem para erro apagaria a diferenca que
      esta rodada inteira existe para preservar. Quem chama trata a rejeicao. */
  function pegar(id) { return pegarEstrito(id); }

  /* ---------- o resto ----------------------------------------------------- */

  function espaco() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return Promise.resolve(null);
    }
    return navigator.storage.estimate().then(function (e) {
      return { usado: e.usage || 0, total: e.quota || 0 };
    });
  }

  function hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
    return h;
  }

  function tamanhoLegivel(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  /* ---------- camada Supabase (Storage + documents table) -----------------
     Quando ativa, salvar/listar/pegar/remover passam pelo Supabase em
     paralelo ao IndexedDB local. O IndexedDB continua como cache rapido;
     o Supabase e o armazenamento duravel que sobrevive a troca de maquina.
     O upload vai para o bucket 'patient-documents', e os metadados para
     a tabela 'documents'. */

  function temSupa() {
    return window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva();
  }

  function uidAtual() {
    var u = window.HoloAuth && window.HoloAuth.usuarioAtual();
    return u ? u.id : null;
  }

  function supaStoragePath(uid, paciente, nomeArquivo) {
    var seguro = String(nomeArquivo).replace(/[^a-zA-Z0-9._-]/g, "_");
    return uid + "/" + paciente + "/" + Date.now() + "_" + seguro;
  }

  function salvarSupa(paciente, arquivo, meta) {
    if (!temSupa()) return Promise.resolve(null);
    var uid = uidAtual();
    if (!uid) return Promise.resolve(null);

    var caminho = supaStoragePath(uid, paciente, arquivo.name);
    return window.supabaseClient.storage
      .from("patient-documents")
      .upload(caminho, arquivo, { contentType: arquivo.type || "application/octet-stream" })
      .then(function (upRes) {
        if (upRes.error) { console.error("storage upload:", upRes.error); return null; }
        return window.supabaseClient.from("documents").insert({
          patient_id: paciente,
          nome: meta.nome || arquivo.name,
          tipo: meta.tipo || "Outro",
          data_documento: meta.data || null,
          mime_type: arquivo.type || "application/octet-stream",
          tamanho_bytes: arquivo.size,
          storage_path: caminho
        }).select().single().then(function (docRes) {
          if (docRes.error) console.error("documents insert:", docRes.error);
          return docRes.data || null;
        });
      })
      .catch(function (e) { console.error("salvarSupa:", e); return null; });
  }

  function listarSupa(paciente) {
    if (!temSupa()) return Promise.resolve(null);
    return window.supabaseClient.from("documents")
      .select("id, nome, tipo, data_documento, mime_type, tamanho_bytes, storage_path")
      .eq("patient_id", paciente)
      .order("created_at", { ascending: false })
      .then(function (r) {
        if (r.error) { console.error("documents select:", r.error); return null; }
        return (r.data || []).map(function (d) {
          return {
            id: "supa:" + d.id,
            nome: d.nome,
            tipo: d.tipo,
            data: d.data_documento || "",
            mime: d.mime_type,
            tamanho: d.tamanho_bytes,
            _supa_id: d.id,
            _storage_path: d.storage_path
          };
        });
      })
      .catch(function (e) { console.error("listarSupa:", e); return null; });
  }

  function pegarSupa(supaId, storagePath) {
    if (!temSupa() || !storagePath) return Promise.resolve(undefined);
    return window.supabaseClient.storage
      .from("patient-documents")
      .download(storagePath)
      .then(function (r) {
        if (r.error) { console.error("storage download:", r.error); return undefined; }
        return { arquivo: r.data };
      })
      .catch(function (e) { console.error("pegarSupa:", e); return undefined; });
  }

  function removerSupa(supaId) {
    if (!temSupa() || !supaId) return Promise.resolve();
    return window.supabaseClient.from("documents")
      .select("storage_path")
      .eq("id", supaId)
      .single()
      .then(function (r) {
        if (r.error || !r.data) return;
        var caminho = r.data.storage_path;
        return window.supabaseClient.from("documents")
          .delete().eq("id", supaId)
          .then(function () {
            return window.supabaseClient.storage
              .from("patient-documents")
              .remove([caminho]);
          });
      })
      .catch(function (e) { console.error("removerSupa:", e); });
  }

  /* ---------- API publica com roteamento --------------------------------- */

  function salvarHibrido(paciente, arquivo, meta) {
    var impedido = barrado();
    if (impedido) return Promise.reject(impedido);

    var promLocal = salvar(paciente, arquivo, meta);
    salvarSupa(paciente, arquivo, meta);
    return promLocal;
  }

  function listarHibrido(paciente) {
    if (!temSupa()) return listar(paciente);
    return Promise.all([listar(paciente), listarSupa(paciente)])
      .then(function (par) {
        var local = par[0] || [];
        var supa = par[1];
        if (!supa) return local;
        var idsSupa = {};
        supa.forEach(function (d) { idsSupa[d.nome + "|" + d.tamanho] = true; });
        var extras = local.filter(function (d) {
          return !idsSupa[d.nome + "|" + d.tamanho];
        });
        return supa.concat(extras);
      });
  }

  function pegarHibrido(id) {
    if (typeof id === "string" && id.indexOf("supa:") === 0) {
      var supaId = id.slice(5);
      return window.supabaseClient.from("documents")
        .select("storage_path, nome, tipo, data_documento, mime_type, tamanho_bytes")
        .eq("id", supaId)
        .single()
        .then(function (r) {
          if (r.error || !r.data) return undefined;
          return pegarSupa(supaId, r.data.storage_path).then(function (blob) {
            if (!blob) return undefined;
            return {
              id: id,
              nome: r.data.nome,
              tipo: r.data.tipo,
              data: r.data.data_documento || "",
              mime: r.data.mime_type,
              tamanho: r.data.tamanho_bytes,
              arquivo: blob.arquivo
            };
          });
        });
    }
    return pegar(id);
  }

  function removerHibrido(id) {
    if (typeof id === "string" && id.indexOf("supa:") === 0) {
      var supaId = id.slice(5);
      return removerSupa(supaId);
    }
    var impedido = barrado();
    if (impedido) return Promise.reject(impedido);
    return remover(id);
  }

  window.ArquivoStore = {
    salvar: salvarHibrido,
    remover: removerHibrido,

    /* tolerantes — para a tela */
    listar: listarHibrido,
    listarTudo: listarTudo,

    /* estritas — para backup, diagnostico e restauracao */
    substituirTudoEstrito: substituirTudoEstrito,
    removerDoPacienteEstrito: removerDoPacienteEstrito,
    listarEstrito: listarEstrito,
    listarTudoEstrito: listarTudoEstrito,
    pegarEstrito: pegarEstrito,

    pegar: pegarHibrido,
    espaco: espaco,
    tamanhoLegivel: tamanhoLegivel,

    /** A ultima falha engolida pela camada tolerante, ou null. Leitura pura. */
    ultimaFalha: function () { return ultimaFalha; },
    esquecerFalha: function () { ultimaFalha = null; }
  };
})();
