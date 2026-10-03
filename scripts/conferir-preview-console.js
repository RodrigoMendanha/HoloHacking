// ETAPA 6.3 — conferir no PREVIEW (Vercel) que os arquivos servidos sao EXATAMENTE os do HEAD V1 (docs/deploy.md §3.5).
// Uso: abrir o preview, F12 > Console, colar tudo e Enter. Somente leitura (so faz GET dos arquivos estaticos). Esperado: "OK: N de N".
(async () => {
  const esperado = {
"index.html": "2dca4406d8a47a83465c38f28c4ab65f64a387ce72d65c6f57fc96c324606994",
"style.css": "fe7a3775ee7662583567110da4e52360bb9efaefc2c8f52e3978f597b6fe4a61",
"favicon.svg": "cd6ef22455f446156c4109649b2d0fc1fe803f0c6697e1029fa71e50ba44cf84",
"agenda.js": "fca789a5d4169bc1d4b5b0d1d2e934e9f1317384b435ea44e486966fe5eaa8d7",
"anamnese.js": "cd0daa04a10e165dd536874170bf3c005d9bdb4041b15deb766c2b30596dfef4",
"aplicacoes.js": "b1ea48449d74ba8427c7a59947ae73d55a4d88896ea1fcf4f9823dc4087bd049",
"app.js": "9a99174a0df288783e65f849da046021b80f66c73c86e5ad48cb28b32f8a776e",
"armazenamento.js": "d3efacba60b26bc2da2311a273881948882570773e4016f59ce2a0845661746c",
"arquivo-store.js": "77f0a880c8784e9e45ad608e4c62dc9791f9a750d75225d85edd9e15a150ce69",
"arquivos.js": "d40530d439eed926cab1a90838fc06c4ee89efb700db4e4ffafc3f7ef9205c83",
"atendimento.js": "cbb3209dee942992cf56d60882d03b84c2fdad0358057b1cee5dbd877df38e6f",
"caso-marina.js": "410b78815fa33df41eeadd22c8f3dbfb5b5bfeecaf89784fb2d35a590474cdb7",
"concorrencia.js": "e66cd4b4cd1163cce5680b8d2b56b820c44c1cf430ed413d8de2fe7766112a14",
"conduta.js": "3b0a3b2f9a14aa7ca801e986427046b65097859675c0605ef9bb2ffd467951fe",
"consultas.js": "63204f8891ceceb557fcd57c8d5d708acdaa0a128f3e55d75b40fbc0f471a641",
"corpo-bancos.js": "25ffbc8bf45aec67e9214f403c5a1ffd297f183eaa664f53cebdb7d92e9c50f9",
"dados-router.js": "8f715a12540bc58c932997419f2272bab1e53d66e101929818e81b3d7524c6b6",
"dados.js": "a77e7bf6acab37680d25eb5451442539bda71a84c6e921940a6065b9b9a3b806",
"dashboard.js": "53db625e8fb01b77c3bff3eb8ecffa10af663d13cfce2fb6c99120e5d0a99dc7",
"demo.js": "a29fad23f5ea2543661b0cd1429670340afbc0ec6654928a6a92fa9d117bf890",
"documentos.js": "d7920a0868425c28a2b3192214010fee62bf1153a0c9c9478e8bc9481940cfcc",
"evolucao.js": "8248f38c2f57e78f60698ef7698a8f102b46af6f41c8d19c9e314003041ef29b",
"excluir-paciente.js": "11e08342911df7f528993946a7e07746a9c26f66657eb0d139e746ade32e161f",
"ferramentas.js": "66e3f1a501b0a1fc98db4c4d1801148e01cfde71ad1b79ba0d8302f296c5e52b",
"ficha.js": "638a42d91204fd2dec1fd3e6f231631210f6ca0bfe593cc29158ee0759ce3d5b",
"formulario.js": "ace6c65cf3f034c43125a348d7c8a834f217b31912916a9f16450f5454bbb178",
"holos-ai.js": "9dff80070d47f83602f81ad5b9ff8a7f694f57052c6c24b9ee1873768a3b5b90",
"holoscan.js": "b6c7e8b1341a10bf45c2f895218e5529176b9c36aa035be6a2aa1ed0fb41cfac",
"importar-v1.js": "b2705ac28dc9f6175ec5586ef02e86b00f2fe1265dbb23a34e3bb2cebb8718c3",
"laboratorio-catalogo.js": "d68215f0b81b8b8e5929ea43b29f7f51046b78336b96ec9e5814d4eea2444ae0",
"laboratorio-motor.js": "8ad2d6789fdc62fe83f2c9cc85acbf03e481ed40f3dc72575b20bc8eb0b2acbc",
"laboratorio.js": "1115a2a97147900149439fd2c9b1b7344a6ebe9851844af043dc579ecea25b9d",
"leitura-integrada-motor.js": "07629098f6cfed3a18d60991bbbbfc6003b8073e7825996c15c2978277ef4827",
"leitura-integrada-pacote-v1.js": "994217cb6cc4208b15fe4d4a9197efd0518c400d68aa0b2f24a6b9a017d2e118",
"login.js": "d0098b6c672f2d283cabb347205c676e3ac117fd960e8274ba3a64d13a984f2e",
"metodologia-decisoes-v1.js": "51f9b31c0cf3ab7c0b530d07f37a84b205e9e314103ce1397e9a9ff04b3130ba",
"metodologia-homologacao.js": "dedb3c3ad7f4560aae349d47409bf3636c0909aa6038d55502b5d97fecc5afdb",
"metodologia-inventario.js": "aa6a886c1ad2b8000ccbbe4321faf7be4159c12be0109a8d19f09718405d4439",
"metodologia-motor.js": "ae87ad9c758f4ccf14cbb0404db8538b8705f4069049c4b002140ef1ec109bd8",
"metodologia-pacote.js": "ea9ec168a0d44ffea65a7ee4b5fa9071eb0bdae8aedcf246a7118c13b0ca555a",
"metodologia.js": "33624972d9967e1edcb3cff6a7a653829c51f6058c52b4d7fb0231416055d049",
"migracao-supa.js": "166b0e323628000f7e1a8274eb5b0012d5a22af67d4804c7b4d4f0e95efacf55",
"panorama.js": "0aa32a8554ffecbe0e7198a13ed65aa2ea062478eaf632f45d1fa90978ef0db1",
"perfil.js": "2beaabe619d8dd09438a7bfbbc4677e52cd015cea5483086b6cee46865cd13a3",
"questionario.js": "8ac728c67627b0bc4d7f70b0fb98fa75a493822c74c9a3385d7e3e52bb4a7cb3",
"relatorios.js": "1414c83eac5031c65849721597de651c67b1464e38d85ec6ff54fdb4f055a459",
"render-resultado.js": "8849e59a1d3fe76723aa1e59cc75213fc64172259c5bccd6d9b1151f21a9fb63",
"restaurar-backup.js": "23520f5f414deb288f083d0a08389a1c96d1ec918c50fb95d44c3b8b36758e8c",
"resultado-corpo.js": "2848d87ee9677b5327939694c6461d4f2eee0b11ec5cf44462d52c3a07f0964a",
"sincronizacao.js": "4da93a366a070e76df41d0ee1fdb27d085b617d734308abd7739c83a3c4efca8",
"supabase-client.js": "482687b6663c97cfc92151da80a62ff0fdfa8f82fc3ff24a399ab583d3ff0d6d",
"timeline.js": "82be6ed473fd55740ee1625a0e63b90a751a27116e3e0675983f74c77571de74",
"utils.js": "078361d4aace416d6e43c2ff741ae6f4ec4ec5c07630d7395f6213070c265022",
"validar-backup.js": "f99c4197f8ac91ec9e5ec2f6970c12ad8ec0e3d8dc4513da856289799c095b68",
"supabase/functions/holos-ai/index.ts": "233e51b5a51b628d87aadfa6a17c01d2f11c5fa5e0b828a4ef7fd7b32ba00cb9",
"supabase/functions/holos-ai/indisponivel.ts": "89a057c12c94ad55fc2a5da17792963db3141ec3362edef0007275e1ed6dbfd7"
};
  let ok = 0; const div = [];
  for (const [arq, h] of Object.entries(esperado)) {
    const r = await fetch('/' + arq + '?nc=' + Date.now(), { cache: 'no-store' });
    const buf = await r.arrayBuffer();
    const d = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buf))).map(b => b.toString(16).padStart(2, '0')).join('');
    if (r.ok && d === h) ok++; else div.push(arq + (r.ok ? ' (hash diferente)' : ' (HTTP ' + r.status + ')'));
  }
  console.log(div.length ? 'DIVERGENTE: ' + ok + ' de ' + Object.keys(esperado).length + ' -> ' + div.join(', ') : 'OK: ' + ok + ' de ' + Object.keys(esperado).length + ' arquivos batem com docs/deploy.md §3.5');
})();
