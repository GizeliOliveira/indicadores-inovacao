// ===================== Radar de Inovação (pesquisas de mercado + portfólio de empresas) =====================
dash.calc('radar_resumo', {
  title: 'Radar de Inovação: resumo',
  description: 'Pesquisas de mercado por status, prazo e tempo de execução, e portfólio de empresas por origem e uso em pesquisas.',
  inputs: ['radar_pesquisas', 'startups'],
  fn: (pesquisas, empresas) => {
    const st = s => pesquisas.filter(p => p.status === s).length;
    const conc = pesquisas.filter(p => p.status === 'Concluída');
    const dias = conc.map(p => +p.dias_execucao).filter(n => Number.isFinite(n) && n > 0);
    const mapeamento = empresas.filter(e => e.origem === 'Mapeamento de startups');
    return [{
      pesquisas: pesquisas.length, em_execucao: st('Em execução'), concluidas: conc.length, suspensas: st('Suspensa'), backlog: st('Backlog'),
      atrasadas: pesquisas.filter(p => p.situacao_prazo === 'Atrasada').length,
      tempo_medio: dias.length ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) : null,
      no_prazo: conc.length ? conc.filter(p => p.situacao_prazo === 'Concluída no prazo').length / conc.length : null,
      sem_prazo: pesquisas.filter(p => /sem prazo/i.test(p.situacao_prazo || '')).length,
      empresas: empresas.length,
      vinculadas: empresas.filter(e => +e.n_pesquisas > 0).length,
      mapeamento_total: mapeamento.length,
      mapeamento_usadas: mapeamento.filter(e => +e.n_pesquisas > 0).length,
      aproveitamento_mapeamento: mapeamento.length ? mapeamento.filter(e => +e.n_pesquisas > 0).length / mapeamento.length : null,
      via_pesquisa: empresas.filter(e => e.origem === 'Pesquisa de mercado').length,
      somente_mapeadas: empresas.filter(e => e.situacao === 'Somente mapeada').length,
      selecionadas: empresas.filter(e => /Selecionada/i.test(e.situacao || '')).length
    }];
  }
});

dash.calc('radar_status', {
  title: 'Radar: pesquisas por status',
  description: 'Quantidade de pesquisas de mercado em cada status (onde estão os gargalos).',
  inputs: ['radar_pesquisas'],
  fn: (pesquisas) => ['Backlog', 'Em análise', 'Em execução', 'Em validação', 'Concluída', 'Suspensa']
    .map(status => ({status, pesquisas: pesquisas.filter(p => p.status === status).length}))
});

dash.calc('radar_prazo', {
  title: 'Radar: situação do prazo',
  description: 'Pesquisas por situação do prazo, como calculado na planilha de controle.',
  inputs: ['radar_pesquisas'],
  fn: (pesquisas) => {
    const m = new Map(); pesquisas.forEach(p => m.set(p.situacao_prazo, (m.get(p.situacao_prazo) || 0) + 1));
    return [...m].map(([situacao, n]) => ({situacao, pesquisas: n})).sort((a, b) => b.pesquisas - a.pesquisas);
  }
});

dash.calc('radar_estab', {
  title: 'Radar: demandas por estabelecimento e impacto',
  description: 'Pesquisas por estabelecimento demandante e por tipo de impacto esperado.',
  inputs: ['radar_pesquisas'],
  fn: (pesquisas) => {
    const out = [];
    const conta = (campo, grupo) => { const m = new Map(); pesquisas.forEach(p => m.set(p[campo], (m.get(p[campo]) || 0) + 1));
      [...m].sort((a, b) => b[1] - a[1]).forEach(([valor, n]) => out.push({chave: grupo + '|' + valor, grupo, valor, pesquisas: n})); };
    conta('estabelecimento', 'Estabelecimento'); conta('impacto', 'Impacto');
    return out;
  }
});

dash.calc('radar_categorias', {
  title: 'Radar: categorias, pesquisas × portfólio',
  description: 'Por categoria: pesquisas abertas, empresas no portfólio, empresas já vinculadas a pesquisas e o aproveitamento do portfólio.',
  inputs: ['radar_pesquisas', 'startups'],
  fn: (pesquisas, empresas) => {
    const cats = [...new Set(empresas.map(e => e.tema).concat(pesquisas.map(p => p.categoria)))].filter(Boolean);
    return cats.map(categoria => {
      const emp = empresas.filter(e => e.tema === categoria);
      const vinc = emp.filter(e => +e.n_pesquisas > 0).length;
      return {categoria, pesquisas: pesquisas.filter(p => p.categoria === categoria).length, empresas: emp.length, vinculadas: vinc,
        aproveitamento: emp.length ? vinc / emp.length : null};
    }).sort((a, b) => b.empresas - a.empresas || b.pesquisas - a.pesquisas);
  }
});

dash.calc('radar_funil', {
  title: 'Radar: funil do portfólio de empresas',
  description: 'Do portfólio até a empresa escolhida: empresas no portfólio, vinculadas a pesquisas, avaliadas ou com proposta, e selecionadas ou recomendadas.',
  inputs: ['startups', 'radar_vinculos'],
  fn: (empresas, vinculos) => {
    const avaliadas = new Set(vinculos.filter(v => ['Avaliada', 'Proposta recebida', 'Selecionada', 'Recomendada'].includes(v.situacao)).map(v => v.empresa_id));
    const escolhidas = new Set(vinculos.filter(v => ['Selecionada', 'Recomendada'].includes(v.situacao)).map(v => v.empresa_id));
    const etapas = [['Empresas no portfólio', empresas.length], ['Vinculadas a pesquisas', empresas.filter(e => +e.n_pesquisas > 0).length],
      ['Avaliadas ou com proposta', avaliadas.size], ['Selecionadas ou recomendadas', escolhidas.size]];
    return etapas.map(([etapa, valor], i) => ({etapa, valor, conversao: i && etapas[i - 1][1] ? valor / etapas[i - 1][1] : null}));
  }
});

(function(){
  const ip = window.ip;
  const r0 = r => (r && r[0]) || {};
  [['rd-pq', 'pesquisas', ip.int], ['rd-ex', 'em_execucao', ip.int], ['rd-co', 'concluidas', ip.int], ['rd-tm', 'tempo_medio', ip.int],
   ['rd-np', 'no_prazo', ip.pct], ['rd-at', 'atrasadas', ip.int], ['rd-sp', 'sem_prazo', ip.int], ['rd-em', 'empresas', ip.int],
   ['rd-vi', 'vinculadas', ip.int], ['rd-ma', 'aproveitamento_mapeamento', ip.pct], ['rd-mu', 'mapeamento_usadas', ip.int],
   ['rd-mt', 'mapeamento_total', ip.int], ['rd-vp', 'via_pesquisa', ip.int], ['rd-so', 'somente_mapeadas', ip.int], ['rd-se', 'selecionadas', ip.int]]
    .forEach(([n, f, fmt]) => ip.drawNum(n, 'radar_resumo', r => r0(r)[f], fmt));

  dash.draw('rd-funil', el => {
    const d = dash.data('radar_funil');
    if (d.status !== 'ok' || !d.data) { ip.empty(el, d.status); return; }
    const n = d.data.length;
    ip.hbars(el, d.data.map((r, i) => ({label: r.etapa, value: r.valor, ci: i === n - 1 ? 0 : 2,
      text: ip.int(r.valor) + (r.conversao !== null ? '  · ' + ip.pct(r.conversao) : ''),
      tip: [['', r.etapa], ['Empresas', ip.int(r.valor)], ['Avanço da etapa anterior', r.conversao === null ? '—' : ip.pct(r.conversao)]]})));
  });
  dash.draw('rd-status', el => {
    const d = dash.data('radar_status');
    if (d.status !== 'ok' || !d.data) { ip.empty(el, d.status); return; }
    const ci = {'Backlog': 4, 'Em análise': 2, 'Em execução': 1, 'Em validação': 2, 'Concluída': 0, 'Suspensa': 3};
    ip.hbars(el, d.data.map(r => ({label: r.status, value: r.pesquisas, ci: ci[r.status], text: String(r.pesquisas), tip: [['', r.status], ['Pesquisas', String(r.pesquisas)]]})), {max: Math.max(1, ...d.data.map(r => r.pesquisas))});
  });
  dash.draw('rd-prazo', el => {
    const d = dash.data('radar_prazo');
    if (d.status !== 'ok' || !d.data) { ip.empty(el, d.status); return; }
    const ci = s => /no prazo/i.test(s) ? 0 : (/atras/i.test(s) ? 1 : (/sem prazo/i.test(s) ? 4 : 2));
    ip.hbars(el, d.data.map(r => ({label: r.situacao, value: r.pesquisas, ci: ci(r.situacao), text: String(r.pesquisas), tip: [['', r.situacao], ['Pesquisas', String(r.pesquisas)]]})));
  });
  dash.draw('rd-estab', el => {
    const d = dash.data('radar_estab');
    if (d.status !== 'ok' || !d.data) { ip.empty(el, d.status); return; }
    ip.hbars(el, d.data.map(r => ({label: r.valor, value: r.pesquisas, ci: r.grupo === 'Impacto' ? 1 : 0, text: String(r.pesquisas),
      tip: [['', r.grupo + ': ' + r.valor], ['Pesquisas', String(r.pesquisas)]]})));
  });
  dash.draw('rd-cat', tb => {
    const d = dash.data('radar_categorias');
    tb.replaceChildren();
    if (d.status !== 'ok' || !d.data) return;
    d.data.forEach(r => {
      const tr = document.createElement('tr'); tr.dataset.key = encodeURIComponent(r.categoria);
      ip.cell(tr, r.categoria); ip.cell(tr, String(r.pesquisas), 'n'); ip.cell(tr, String(r.empresas), 'n'); ip.cell(tr, String(r.vinculadas), 'n');
      const t = ip.cell(tr, r.aproveitamento === null ? '—' : ip.pct(r.aproveitamento), 'n');
      if (r.empresas >= 3 && r.vinculadas === 0) t.classList.add('ip-bad');
      tb.appendChild(tr);
    });
  });
  dash.draw('rd-pesq', tb => {
    const d = dash.data('radar_pesquisas');
    tb.replaceChildren();
    if (d.status !== 'ok') return;
    const kind = {'Concluída': 'ok', 'Em execução': 'warn', 'Backlog': 'warn', 'Suspensa': 'bad', 'Em análise': 'warn', 'Em validação': 'warn'};
    d.data.slice().sort((a, b) => b.id.localeCompare(a.id)).forEach(p => {
      const tr = document.createElement('tr'); tr.dataset.key = encodeURIComponent(p.id);
      ip.cell(tr, p.id); ip.cell(tr, p.titulo); ip.cell(tr, p.estabelecimento || ''); ip.cell(tr, p.impacto || '');
      ip.pill(ip.cell(tr, ''), p.status, kind[p.status] || 'warn');
      ip.cell(tr, p.dias_execucao === '' || p.dias_execucao === null ? '—' : p.dias_execucao, 'n');
      const tp = ip.cell(tr, p.situacao_prazo || ''); if (/atras/i.test(p.situacao_prazo || '')) tp.classList.add('ip-bad');
      ip.cell(tr, String(p.n_empresas), 'n'); ip.cell(tr, p.empresa_escolhida || '');
      tb.appendChild(tr);
    });
  });
})();
