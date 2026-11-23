// ===================== Innovation Scorecard (Resultados · Estratégia · Processo · Contexto) =====================
dash.calc('scorecard', {
  title: 'Innovation Scorecard: resumo',
  description: 'Indicadores-síntese das quatro dimensões: captura de valor, concentração do portfólio, saúde do funil (escala, encerramento e parados) e horas devolvidas.',
  inputs: ['squads_solucoes', 'td_resumo', 'projetos'],
  fn: (solucoes, td, projetos) => {
    const imp = solucoes.filter(s => s.status === 'Implantada');
    const uso = imp.filter(s => /em uso/i.test(s.observacao || ''));
    const enc = solucoes.filter(s => +s.ano <= 2025);
    const n = enc.length || 1;
    const unid = s => ['Operadora', 'HGU', 'Laboratório'].includes(s.estabelecimento) ? s.estabelecimento : 'Outras';
    const cont = {};
    solucoes.forEach(s => { cont[unid(s)] = (cont[unid(s)] || 0) + 1; });
    const top = Object.entries(cont).sort((a, b) => b[1] - a[1])[0] || ['', 0];
    const t = (td && td[0]) || {};
    const hv = +t.horas_validadas || 0, hp = +t.horas_pendentes || 0;
    const reais = projetos.filter(p => p.id && p.nome && !/^EXEMPLO/i.test(p.nome));
    return [{
      implantadas: imp.length, em_uso: uso.length, captura_uso: imp.length ? uso.length / imp.length : null,
      encerrados: enc.length,
      escaladas: enc.filter(s => s.status === 'Implantada').length,
      encerradas: enc.filter(s => s.status === 'Cancelada').length,
      paradas: enc.filter(s => s.status === 'Não iniciada').length,
      scale_rate: enc.filter(s => s.status === 'Implantada').length / n,
      kill_rate: enc.filter(s => s.status === 'Cancelada').length / n,
      parados_pct: enc.filter(s => s.status === 'Não iniciada').length / n,
      unidade_top: top[0], concentracao: solucoes.length ? top[1] / solucoes.length : null,
      unidades_impl: new Set(imp.map(unid)).size,
      horas_validadas: hv, horas_pendentes: hp, captura_horas: (hv + hp) ? hv / (hv + hp) : null,
      classificados: reais.filter(p => p.tipo_inovacao).length
    }];
  }
});

dash.calc('sc_saude', {
  title: 'Processo: saúde do funil nos ciclos encerrados',
  description: 'Soluções dos ciclos 2021 a 2025 por desfecho: escaladas (implantadas), em andamento, encerradas (canceladas) e paradas (não iniciadas).',
  inputs: ['squads_solucoes'],
  fn: (solucoes) => {
    const enc = solucoes.filter(s => +s.ano <= 2025);
    return [['Escaladas (implantadas)', 'Implantada'], ['Em andamento', 'Em andamento'], ['Encerradas (canceladas)', 'Cancelada'], ['Paradas (não iniciadas)', 'Não iniciada']]
      .map(([desfecho, st]) => ({desfecho, solucoes: enc.filter(s => s.status === st).length, participacao: enc.length ? enc.filter(s => s.status === st).length / enc.length : null}));
  }
});

dash.calc('sc_unidades', {
  title: 'Estratégia: soluções por unidade',
  description: 'Soluções de Squads (todos os ciclos) e implantadas em cada unidade.',
  inputs: ['squads_solucoes'],
  fn: (solucoes) => {
    const unid = s => ['Operadora', 'HGU', 'Laboratório'].includes(s.estabelecimento) ? s.estabelecimento : 'Outras';
    return ['Operadora', 'HGU', 'Laboratório', 'Outras'].map(u => ({unidade: u,
      solucoes: solucoes.filter(s => unid(s) === u).length,
      implantadas: solucoes.filter(s => unid(s) === u && s.status === 'Implantada').length}));
  }
});

dash.calc('sc_tipos', {
  title: 'Estratégia: portfólio por tipo de inovação',
  description: 'Projetos e ações do registro por tipo de inovação (incremental, radical, disruptiva), equivalente ao equilíbrio H1/H2/H3.',
  inputs: ['projetos'],
  fn: (projetos) => {
    const reais = projetos.filter(p => p.id && p.nome && !/^EXEMPLO/i.test(p.nome));
    return [['Incremental (H1)', 'Incremental'], ['Radical (H2)', 'Radical'], ['Disruptiva (H3)', 'Disruptiva']]
      .map(([tipo, v]) => ({tipo, projetos: reais.filter(p => (p.tipo_inovacao || '').trim() === v).length}));
  }
});

dash.calc('sc_potencial', {
  title: 'Resultados: potencial × capturado',
  description: 'Valor em potencial (soluções propostas, horas aguardando validação) ao lado do valor capturado (implantadas, uso confirmado, horas validadas).',
  inputs: ['squads_solucoes', 'td_resumo'],
  fn: (solucoes, td) => {
    const t = (td && td[0]) || {};
    return [
      {item: 'Soluções propostas', momento: 'Potencial', valor: solucoes.filter(s => s.solucao).length, unidade: 'soluções'},
      {item: 'Soluções implantadas', momento: 'Capturado', valor: solucoes.filter(s => s.status === 'Implantada').length, unidade: 'soluções'},
      {item: 'Com uso confirmado', momento: 'Capturado', valor: solucoes.filter(s => s.status === 'Implantada' && /em uso/i.test(s.observacao || '')).length, unidade: 'soluções'},
      {item: 'Horas aguardando validação', momento: 'Potencial', valor: +t.horas_pendentes || 0, unidade: 'h'},
      {item: 'Horas validadas (Tempo Devolvido)', momento: 'Capturado', valor: +t.horas_validadas || 0, unidade: 'h'}
    ];
  }
});

(function(){
  const ip = window.ip;
  const r0 = r => (r && r[0]) || {};
  const sc = r => r0(r);
  ip.drawNum('sc-captura', 'scorecard', r => sc(r).captura_uso, ip.pct);
  ip.drawNum('sc-unid', 'scorecard', r => sc(r).unidades_impl, ip.int);
  ip.drawNum('sc-conc', 'scorecard', r => sc(r).concentracao, ip.pct);
  ip.drawNum('sc-scale', 'scorecard', r => sc(r).scale_rate, ip.pct);
  ip.drawNum('sc-kill', 'scorecard', r => sc(r).kill_rate, ip.pct);
  ip.drawNum('sc-parados', 'scorecard', r => sc(r).parados_pct, ip.pct);
  ip.drawNum('sc-parados-n', 'scorecard', r => sc(r).paradas, ip.int);
  ip.drawNum('sc-enc', 'scorecard', r => sc(r).encerrados, ip.int);
  ip.drawNum('sc-hv', 'scorecard', r => sc(r).horas_validadas, ip.int);
  dash.draw('sc-top', el => { const d = dash.data('scorecard'); el.textContent = d.status === 'ok' && d.data && d.data[0] ? d.data[0].unidade_top : '—'; });
  dash.draw('sc-class', el => {
    const d = dash.data('scorecard');
    if (d.status !== 'ok' || !d.data || !d.data[0]) { el.textContent = '—'; return; }
    const c = d.data[0].classificados;
    el.textContent = c ? c + ' projetos classificados por tipo de inovação' : 'tipo de inovação ainda não classificado no registro';
  });

  dash.draw('sc-pot', el => {
    const d = dash.data('sc_potencial');
    if (d.status !== 'ok' || !d.data) { ip.empty(el, d.status); return; }
    ip.hbars(el, d.data.filter(r => r.unidade === 'soluções').map(r => ({label: r.item, value: r.valor, ci: r.momento === 'Capturado' ? 0 : 4,
      text: ip.int(r.valor) + ' · ' + r.momento.toLowerCase(), tip: [['', r.item], ['Momento', r.momento], ['Quantidade', ip.int(r.valor) + ' ' + r.unidade]]})));
  });
  dash.draw('sc-saude', el => {
    const d = dash.data('sc_saude');
    if (d.status !== 'ok' || !d.data) { ip.empty(el, d.status); return; }
    const ci = {'Escaladas (implantadas)': 0, 'Em andamento': 2, 'Encerradas (canceladas)': 4, 'Paradas (não iniciadas)': 1};
    ip.hbars(el, d.data.map(r => ({label: r.desfecho, value: r.solucoes, ci: ci[r.desfecho], text: r.solucoes + ' · ' + ip.pct(r.participacao),
      tip: [['', r.desfecho], ['Soluções', String(r.solucoes)], ['Participação', ip.pct(r.participacao)]]})));
  });
  dash.draw('sc-unid-chart', el => {
    const d = dash.data('sc_unidades');
    if (d.status !== 'ok' || !d.data) { ip.empty(el, d.status); return; }
    ip.columns(el, d.data.map(r => ({label: r.unidade, segs: [{value: r.solucoes, ci: 2}, {value: r.implantadas, ci: 0}], top: String(r.solucoes),
      tip: [['', r.unidade], ['Soluções', String(r.solucoes)], ['Implantadas', String(r.implantadas)]]})), {mode: 'group', height: 190, labels: true});
  });
  dash.draw('sc-tipos', el => {
    const d = dash.data('sc_tipos');
    if (d.status !== 'ok' || !d.data) { ip.empty(el, d.status); return; }
    if (!d.data.some(r => r.projetos > 0)) {
      el.replaceChildren(); const p = document.createElement('p'); p.className = 'ip-muted';
      p.textContent = 'Ainda sem projetos classificados. Preencha "tipo_inovacao" no registro de Projetos e ações para ver o equilíbrio H1/H2/H3.';
      el.appendChild(p); return;
    }
    ip.hbars(el, d.data.map((r, i) => ({label: r.tipo, value: r.projetos, ci: i, text: String(r.projetos), tip: [['', r.tipo], ['Projetos', String(r.projetos)]]})));
  });

  document.querySelectorAll('.ip-sc').forEach(c => { c.style.borderTopColor = ip.color(+c.dataset.c); });
})();
