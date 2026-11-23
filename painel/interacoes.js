// ===================== Interações do painel =====================
// ---------- calcs ----------
dash.calc('funil_recorte', {
  title: 'Funil da inovação por ciclo e unidade',
  description: 'Etapas das soluções de Squads em cada recorte de ciclo e unidade, com a conversão entre etapas.',
  inputs: ['squads_ciclos', 'squads_solucoes'],
  fn: (ciclos, solucoes) => {
    const unidade = s => ['Operadora', 'HGU', 'Laboratório'].includes(s.estabelecimento) ? s.estabelecimento : 'Outras';
    const noCiclo = (ano, c) => c === 'todos' || (c === 'encerrados' ? +ano <= 2025 : String(ano) === c);
    const out = [];
    for (const c of ['todos', 'encerrados', '2021', '2022', '2023', '2024', '2025', '2026']) {
      for (const u of ['todas', 'Operadora', 'HGU', 'Laboratório', 'Outras']) {
        const sol = solucoes.filter(s => noCiclo(s.ano, c) && (u === 'todas' || unidade(s) === u));
        const etapas = [];
        if (u === 'todas') etapas.push(['Participações em squads', ciclos.filter(r => noCiclo(r.ano, c)).reduce((a, r) => a + (+r.participacoes || 0), 0)]);
        etapas.push(
          ['Desafios trabalhados', sol.length],
          ['Soluções propostas', sol.filter(s => s.solucao).length],
          ['Saíram do papel', sol.filter(s => s.status === 'Implantada' || s.status === 'Em andamento').length],
          ['Implantadas', sol.filter(s => s.status === 'Implantada').length],
          ['Uso confirmado', sol.filter(s => s.status === 'Implantada' && /em uso/i.test(s.observacao || '')).length]
        );
        etapas.forEach(([etapa, valor], i) => out.push({recorte: c + '|' + u, ciclo: c, unidade: u, etapa, valor, conversao: i && etapas[i - 1][1] ? valor / etapas[i - 1][1] : null}));
      }
    }
    return out;
  }
});

dash.calc('sq_var', {
  title: 'Comparação entre ciclos de Squads',
  description: 'Valores de dois ciclos lado a lado e a variação entre eles (taxa de implantação em pontos percentuais).',
  inputs: ['squads_ciclos'],
  fn: (ciclos) => {
    const metricas = [['Participações', 'participacoes'], ['Desafios', 'desafios'], ['Implantadas', 'implantadas'], ['Concluíram o ciclo', 'concluiram']];
    const out = [];
    ciclos.forEach(a => ciclos.forEach(b => {
      if (a.ano === b.ano) return;
      const par = a.ano + ' x ' + b.ano;
      metricas.forEach(([metrica, c]) => {
        const va = +a[c] || 0, vb = +b[c] || 0;
        out.push({par, metrica, valor_a: va, valor_b: vb, variacao: vb ? (va - vb) / vb : null});
      });
      const ta = +a.desafios ? +a.implantadas / +a.desafios : 0, tb = +b.desafios ? +b.implantadas / +b.desafios : 0;
      out.push({par, metrica: 'Taxa de implantação', valor_a: ta, valor_b: tb, variacao: ta - tb});
    }));
    return out;
  }
});

// ---------- interações ----------
(function(){
  const ip = window.ip;
  const P = () => dash.params();
  const redraw = (...names) => names.forEach(n => dash.draw(n));
  const set = (obj, ...names) => { dash.setParams(obj); redraw(...names); };

  // ----- comparador (listeners + valor dos controles) -----
  const ca = document.getElementById('cmp-a'), cb = document.getElementById('cmp-b');
  if (ca) ca.addEventListener('change', () => set({cmp_a: ca.value}, 'cmp', 'cmp-ha', 'cmp-hb'));
  if (cb) cb.addEventListener('change', () => set({cmp_b: cb.value}, 'cmp', 'cmp-ha', 'cmp-hb'));
  dash.onData(() => {
    const p = P();
    if (ca && document.activeElement !== ca) ca.value = p.cmp_a || '2025';
    if (cb && document.activeElement !== cb) cb.value = p.cmp_b || '2024';
  });

  // ----- funil fixo da Visão do ano -----
  dash.draw('funil-ano', el => {
    const d = dash.data('funil_recorte');
    if (d.status !== 'ok' || !d.data){ ip.empty(el, d.status); return; }
    const rows = d.data.filter(r => r.recorte === 'todos|todas');
    const n = rows.length;
    ip.hbars(el, rows.map((r, i) => ({
      label: r.etapa, value: r.valor, ci: i >= n - 2 ? 0 : 2,
      text: ip.int(r.valor) + (r.conversao !== null ? '  · ' + ip.pct(r.conversao) : ''),
      tip: [['', r.etapa], ['Quantidade', ip.int(r.valor)], ['Avanço da etapa anterior', r.conversao === null ? '—' : ip.pct(r.conversao)]]
    })));
  });

  // ----- comparador de ciclos -----
  const parAtual = () => (P().cmp_a || '2025') + ' x ' + (P().cmp_b || '2024');
  dash.draw('cmp-ha', el => { el.textContent = P().cmp_a || '2025'; });
  dash.draw('cmp-hb', el => { el.textContent = P().cmp_b || '2024'; });
  dash.draw('cmp', tb => {
    const d = dash.data('sq_var');
    tb.replaceChildren();
    if (d.status !== 'ok' || !d.data) return;
    const par = parAtual();
    const rows = d.data.filter(r => r.par === par);
    if (!rows.length){ const tr = document.createElement('tr'); const td = ip.cell(tr, 'Escolha dois ciclos diferentes.'); td.colSpan = 4; tb.appendChild(tr); return; }
    rows.forEach(r => {
      const tr = document.createElement('tr'); tr.dataset.key = encodeURIComponent(r.par) + ',' + encodeURIComponent(r.metrica);
      const taxa = r.metrica === 'Taxa de implantação';
      const f = v => taxa ? ip.pct(v) : ip.int(v);
      ip.cell(tr, r.metrica); ip.cell(tr, f(r.valor_a), 'n'); ip.cell(tr, f(r.valor_b), 'n');
      let txt = '—', k = '';
      if (r.variacao !== null){
        const v = +r.variacao;
        txt = taxa ? (v >= 0 ? '+' : '') + Math.round(v * 100) + ' p.p.' : (v >= 0 ? '+' : '') + ip.pct(v);
        k = v > 0 ? 'ip-ok' : (v < 0 ? 'ip-bad' : '');
      }
      const td = ip.cell(tr, txt, 'n'); if (k) td.classList.add(k);
      tb.appendChild(tr);
    });
  });

  // ----- pontos de atenção levam à análise -----
  const DESTINO = {
    'Taxa de implantação do ciclo 2025': ['intra', 'sq-ciclos'],
    'Presença média nos projetos MEI-U': ['aberta', 'im-presenca'],
    'Participações abaixo da meta de presença': ['aberta', 'im-presenca'],
    'Grupos em andamento sem reunião registrada': ['aberta', 'im-grupos'],
    'Média de visualizações por edição': ['intra', 'ic-evolucao'],
    'Inovações cadastradas para 2027': ['projetos', 'pj-registro']
  };
  const abrir = (aba, alvo) => {
    const t = document.querySelector('.ip-tab[data-tab="' + aba + '"]');
    if (t) t.click();
    setTimeout(() => { const e = document.getElementById(alvo); if (e) e.scrollIntoView({behavior: 'smooth', block: 'start'}); }, 80);
  };
  document.addEventListener('click', ev => {
    const tr = ev.target.closest && ev.target.closest('tbody[data-draw="alertas"] tr');
    if (!tr) return;
    const dest = DESTINO[decodeURIComponent(tr.dataset.key || '')];
    if (dest) abrir(dest[0], dest[1]);
  });

  // ----- simulador do Tempo Devolvido -----
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const num = (id, def) => { const e = document.getElementById(id); const v = e ? Number(e.value) : NaN; return Number.isFinite(v) && v >= 0 ? v : def; };
  ['sim-n', 'sim-h', 'sim-m'].forEach(id => { const e = document.getElementById(id); if (e) e.addEventListener('input', () => dash.draw('sim-td')); });
  dash.draw('sim-td', el => {
    const d = dash.data('tempo_devolvido');
    el.replaceChildren();
    if (d.status !== 'ok'){ el.textContent = '—'; return; }
    const meta = +((d.data.find(r => r.indicador === 'meta_horas') || {}).valor) || 0;
    const n = num('sim-n', 0), h = num('sim-h', 0), m = Math.min(12, Math.max(1, num('sim-m', 3)));
    const meses = 13 - m, horas = n * h * meses, pct = meta ? horas / meta : 0;
    const precisa = h > 0 ? Math.ceil(meta / (h * meses)) : null;
    let mesMeta = null;
    if (n * h > 0){ const k = Math.ceil(meta / (n * h)); if (m + k - 1 <= 12) mesMeta = m + k - 1; }
    const linha = (rot, val, cls) => { const p = document.createElement('p'); const s = document.createElement('span'); s.className = 'ip-sub'; s.textContent = rot + ' '; const b = document.createElement('b'); b.textContent = val; if (cls) b.className = cls; p.append(s, b); el.appendChild(p); };
    linha('Horas devolvidas em 2027 com essas premissas:', ip.int(horas) + ' h (' + ip.pct(pct) + ' da meta)', pct >= 1 ? 'ip-ok' : 'ip-warn');
    linha('Soluções necessárias para chegar a ' + ip.int(meta) + ' h:', precisa === null ? '—' : ip.int(precisa) + ' soluções');
    linha('Meta atingida em:', mesMeta ? MESES[mesMeta - 1] + ' de 2027' : 'não é atingida em 2027', mesMeta ? 'ip-ok' : 'ip-bad');
  });

  // ----- simulador de Áreas Ativas -----
  const sa = document.getElementById('sim-a');
  if (sa) sa.addEventListener('input', () => dash.draw('sim-aa'));
  dash.draw('sim-aa', el => {
    const d = dash.data('areas_ativas');
    el.replaceChildren();
    if (d.status !== 'ok'){ el.textContent = '—'; return; }
    const total = +((d.data[0] || {}).total_areas) || 19;
    const a = Math.min(total, Math.round(num('sim-a', 0)));
    const p = document.createElement('p'); const s = document.createElement('span'); s.className = 'ip-sub'; s.textContent = 'Resultado do trimestre: ';
    const b = document.createElement('b'); b.textContent = ip.pct(a / total) + ' das áreas (' + a + ' de ' + total + ')'; p.append(s, b); el.appendChild(p);
    const ul = document.createElement('ul'); ul.className = 'ip-checks';
    d.data.forEach(t => {
      const li = document.createElement('li'); const ok = a >= +t.meta_areas;
      const ic = document.createElement('span'); ic.className = ok ? 'ip-ok' : 'ip-bad'; ic.textContent = ok ? '✓ ' : '✗ ';
      li.append(ic, document.createTextNode(t.trimestre + ' (meta ' + ip.pct(+t.meta_pct) + ', ' + t.meta_areas + ' áreas): ' + (ok ? 'meta atingida' : 'faltam ' + (+t.meta_areas - a) + (+t.meta_areas - a === 1 ? ' área' : ' áreas'))));
      ul.appendChild(li);
    });
    el.appendChild(ul);
  });
})();
