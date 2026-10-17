/**
 * RELOGIO DE TESTE (13/10, fechamento do MR-V1 — correcao das suites que falhavam entre 21h e 24h de Brasilia).
 *
 * Causa das falhas: o app interpreta a data/hora do atendimento no FUSO DE QUEM ATENDE (profiles.fuso, padrao
 * America/Sao_Paulo — atendimento.js), mas os testes rodavam o Chrome no fuso do container (UTC) e calculavam "hoje"
 * com o relogio do Node (UTC). Entre 21h e 24h de Brasilia a data UTC ja virou: o app (certo) sugeria 12/10 e o teste
 * esperava 13/10. O codigo de producao NAO muda.
 *
 * Correcao: o navegador do teste roda no fuso da clinica (como o navegador real da nutricionista) e com o relogio
 * FIXADO num instante conhecido — por padrao ONTEM as 22:30 de Brasilia (01:30 UTC do dia seguinte), exatamente a
 * janela que falhava. Assim a janela 21h-24h e exercitada em TODA execucao, a qualquer hora, sem horas fixas somadas.
 * O relogio continua andando a partir do instante fixado (timers e esperas funcionam).
 */
export const FUSO_CLINICA = 'America/Sao_Paulo';

/** partes da data/hora de parede de um instante (ms) num fuso */
export function parede(ms, tz = FUSO_CLINICA) {
  const o = {};
  new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date(ms)).forEach(p => { o[p.type] = p.value; });
  return { data: o.year + '-' + o.month + '-' + o.day, hora: o.hour + ':' + o.minute };
}
/** "AAAA-MM-DD" de parede no fuso, deslocado `dias` dias, a partir do instante `ms` */
export function diaNoFuso(ms, dias = 0, tz = FUSO_CLINICA) {
  const [a, m, d] = parede(ms, tz).data.split('-').map(Number);
  const x = new Date(Date.UTC(a, m - 1, d + dias));
  return x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0') + '-' + String(x.getUTCDate()).padStart(2, '0');
}
/** instante (ms) da hora de parede `hhmm` no fuso, `diasAtras` dias antes de hoje (no fuso) */
export function instanteDeParede(diasAtras, hhmm, tz = FUSO_CLINICA) {
  const dia = diaNoFuso(Date.now(), -diasAtras, tz).split('-').map(Number), [h, mi] = hhmm.split(':').map(Number);
  let chute = Date.UTC(dia[0], dia[1] - 1, dia[2], h, mi);
  for (let i = 0; i < 2; i++) {   // corrige pelo deslocamento do fuso naquele instante (duas passadas, como atendimento.js)
    const p = parede(chute, tz), [pa, pm, pd] = p.data.split('-').map(Number), [ph, pmi] = p.hora.split(':').map(Number);
    chute += Date.UTC(dia[0], dia[1] - 1, dia[2], h, mi) - Date.UTC(pa, pm - 1, pd, ph, pmi);
  }
  return chute;
}
/** navegador no fuso da clinica + relogio fixado em `inicioMs` (antes do goto) */
export async function fixarRelogio(page, inicioMs, tz = FUSO_CLINICA) {
  await page.emulateTimezone(tz);
  await page.evaluateOnNewDocument((base) => {
    const Real = Date, t0 = Real.now();
    class DataFixa extends Real {
      constructor(...a) { if (a.length) super(...a); else super(base + (Real.now() - t0)); }
      static now() { return base + (Real.now() - t0); }
    }
    window.Date = DataFixa;
  }, inicioMs);
}
/** o instante padrao das suites de agenda/atendimento: ontem, 22:30 de Brasilia (UTC ja no dia seguinte) */
export const INSTANTE_JANELA = () => instanteDeParede(1, '22:30');
