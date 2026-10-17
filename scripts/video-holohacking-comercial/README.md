# Vídeo comercial HoloHacking (57 s)

O vídeo não tem narração nem pessoas. Mostra só telas reais do sistema atual (Resultado HOLOS T5, HOLOSCAN v7), com uma paciente e uma nutricionista inventadas e o Supabase falso. Nada aqui publica em nenhum canal.

## Regenerar

```sh
# 1. Capturas (servidor estático em 127.0.0.1:5500 + Supabase falso; 49 telas, 0 erros de JS)
node scripts/video-holohacking-comercial/capturar.mjs                          # computador → telas/ (horizontal)
VIDEO_LARGURA=celular node scripts/video-holohacking-comercial/capturar.mjs    # celular → telas-celular/ (vertical/quadrado)

# 2. Trilha instrumental (sintetizada; livre de direitos por construção). Opcional.
cd scripts/video-holohacking-comercial && python3 trilha.py saida/trilha.wav 57 && cd -

# 3. Vídeos (1080x1920 / 1920x1080 / 1080x1080; H.264, 30 fps). Use --sem-trilha para gerar sem áudio.
node scripts/video-holohacking-comercial/compor.mjs vertical   scripts/video-holohacking-comercial/saida/holohacking-comercial-vertical.mp4
node scripts/video-holohacking-comercial/compor.mjs horizontal scripts/video-holohacking-comercial/saida/holohacking-comercial-horizontal.mp4
node scripts/video-holohacking-comercial/compor.mjs quadrado   scripts/video-holohacking-comercial/saida/holohacking-comercial-quadrado.mp4

# Quadros de revisão (PNG em saida/quadros/)
node scripts/video-holohacking-comercial/compor.mjs vertical --quadros=2.5,13,18,31,34,39.5,55
```

As pastas `telas/`, `telas-celular/` e `saida/` são geradas e ficam fora do git.

Para trocar a trilha, substitua `saida/trilha.wav` e rode o passo 3 de novo. O fade-out dos últimos 2,5 s é aplicado automaticamente.

## Linha do tempo (roteiro.mjs)

| tempo | cena | texto na tela | tela real |
|---|---|---|---|
| 0–4,2 | abertura | Seu atendimento pode ir muito além de *coletar informações.* | logo |
| 4,2–10,2 | Mapeamento | Mapeie o que *realmente importa.* | Mapeamento Holístico (motivo, objetivo, rotina alimentar) |
| 10,2–17 | HOLOSCAN | Identifique *onde aprofundar.* | radar dos cinco sistemas + Avaliação Integral do Terreno |
| 17–23 | Corpo / Mente / Espírito | Aprofunde *Corpo, Mente e Espírito.* | seções de ferramentas (2 s cada) |
| 23–27,2 | mensagem | Não basta descobrir. *É preciso saber o que fazer com o que você descobriu.* | — |
| 27,2–35,4 | Resultado HOLOS | Transforme informação *em direção.* · Direcionamentos. · Direcionamentos. Estratégias. *Próximos passos.* | foco atual, direcionamentos, estratégias |
| 35,4–43,4 | retorno | Acompanhe *o que funcionou.* · Ajuste *o que precisa mudar.* | antes/agora, estratégias testadas (decisão), novo foco |
| 43,4–50,6 | montagem | Uma jornada organizada *do primeiro atendimento à evolução da paciente.* | Mapear · Compreender · Aprofundar · Direcionar · Criar estratégias · Acompanhar a evolução |
| 50,6–57 | final | HoloHacking · Nutrição Holística com método, estrutura e direção. · Mais clareza para a nutricionista. *Mais direção para a paciente.* | logo |

O vídeo não fala de lançamento, aula, data, preço, promoção ou evento. Também não fala de diagnóstico, cura, tratamento, exames ou promessa de resultado.
