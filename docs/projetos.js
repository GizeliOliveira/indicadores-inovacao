// ===================== Projetos e ações =====================
dash.calc('proj_horas', {
  title: 'Horas devolvidas por projeto',
  description: 'Horas de cada projeto ou ação pela fórmula do Tempo Devolvido e se elas contam no indicador.',
  inputs: ['projetos'],
  fn: (projetos) => projetos.filter(p => p.id).map(p => {
    const exemplo = /^EXEMPLO/i.test(p.nome || '');
    const horas = Math.max(0, ((+p.tempo_antes_min || 0) - (+p.tempo_depois_min || 0)) * (+p.volume_acumulado || 0) / 60);
    const conta = !exemplo && p.validado === 'Sim' && !!p.evidencia && !/estimativa/i.test(p.evidencia);
    return {id: p.id, horas: Math.round(horas), conta_tempo: conta ? 'Sim' : 'Não', exemplo: exemplo ? 'Sim' : 'Não'};
  })
});

dash.calc('proj_resumo', {
  title: 'Projetos e ações: resumo',
  description: 'Registros reais (sem a linha de exemplo), validados, em andamento e áreas distintas alcançadas.',
  inputs: ['projetos'],
  fn: (projetos) => {
    const reais = projetos.filter(p => p.id && p.nome && !/^EXEMPLO/i.test(p.nome));
    const areas = new Set();
    reais.forEach(p => String(p.areas || '').split(';').map(a => a.trim()).filter(Boolean).forEach(a => areas.add(a)));
    return [{registrados: reais.length, validados: reais.filter(p => p.validado === 'Sim').length,
      em_andamento: reais.filter(p => !/^Encerrad/i.test(p.etapa || '')).length, areas: areas.size}];
  }
});

dash.calc('proj_etapas', {
  title: 'Projetos e ações por etapa da jornada',
  description: 'Quantidade de registros reais em cada etapa da jornada da inovação.',
  inputs: ['projetos'],
  fn: (projetos) => {
    const reais = projetos.filter(p => p.id && p.nome && !/^EXEMPLO/i.test(p.nome));
    return ['Captação', 'Triagem', 'Descoberta e validação', 'Experimentação', 'Piloto', 'Escala', 'Encerrada com aprendizado', 'Encerrada']
      .map(etapa => ({etapa, registros: reais.filter(p => (p.etapa || '').trim() === etapa).length}));
  }
});

dash.calc('aa_trimestres', {
  title: 'Áreas com iniciativas ativas por trimestre',
  description: 'Áreas distintas com iniciativa ativa em cada trimestre de 2027, pelas regras de contagem do indicador, ao lado da meta.',
  inputs: ['areas_ativas', 'projetos'],
  fn: (metas, projetos) => {
    const dia = s => { const t = Date.parse(String(s || '') + 'T00:00:00Z'); return Number.isFinite(t) ? t : null; };
    const elegiveis = projetos.filter(p => p.id && p.nome && !/^EXEMPLO/i.test(p.nome) && p.areas && p.gestor
      && p.priorizada === 'Sim' && p.validado === 'Sim' && p.origem !== 'Área (melhoria própria)');
    return metas.map(t => {
      const fim = dia(t.fim), mesIni = +t.fim.slice(5, 7) - 2;
      const ini = dia(t.fim.slice(0, 5) + String(mesIni).padStart(2, '0') + '-01');
      const ativos = elegiveis.filter(p => {
        const d = dia(p.data_ultima_etapa);
        if (d === null || fim === null) return false;
        if (/aprendizado/i.test(p.etapa || '')) return d >= ini && d <= fim;
        if (/^Encerrad/i.test(p.etapa || '')) return false;
        return d > fim - 90 * 864e5 && d <= fim;
      });
      const areas = new Set();
      ativos.forEach(p => String(p.areas).split(';').map(a => a.trim()).filter(Boolean).forEach(a => areas.add(a)));
      return {trimestre: t.trimestre, fim: t.fim, meta_pct: +t.meta_pct, meta_areas: +t.meta_areas, total_areas: +t.total_areas,
        areas_ativas: areas.size, iniciativas_ativas: ativos.length, pct: +t.total_areas ? areas.size / +t.total_areas : null};
    });
  }
});

(function(){
  const ip = window.ip;
  const r0 = r => (r && r[0]) || {};
  ip.drawNum('pj-reg', 'proj_resumo', r => r0(r).registrados, ip.int);
  ip.drawNum('pj-val', 'proj_resumo', r => r0(r).validados, ip.int);
  ip.drawNum('pj-and', 'proj_resumo', r => r0(r).em_andamento, ip.int);
  ip.drawNum('pj-are', 'proj_resumo', r => r0(r).areas, ip.int);
  ip.drawNum('pj-h', 'td_resumo', r => r0(r).horas_validadas, ip.int);
  ip.drawNum('pj-hp', 'td_resumo', r => r0(r).horas_pendentes, ip.int);

  dash.draw('pj-etapas', el => {
    const d = dash.data('proj_etapas');
    if (d.status !== 'ok' || !d.data){ ip.empty(el, d.status); return; }
    ip.hbars(el, d.data.map(r => ({label: r.etapa, value: r.registros, ci: /Encerrad/.test(r.etapa) ? 2 : 0, text: String(r.registros),
      tip: [['', r.etapa], ['Projetos e ações', String(r.registros)]]})), {max: Math.max(1, ...d.data.map(r => r.registros))});
  });

  dash.draw('pj-tab', tb => {
    const d = dash.data('projetos'), h = dash.data('proj_horas');
    tb.replaceChildren();
    if (d.status !== 'ok') return;
    const hs = h.status === 'ok' && h.data ? h.data : [];
    const rows = d.data.filter(p => p.id);
    rows.forEach(p => {
      const tr = document.createElement('tr'); tr.dataset.key = encodeURIComponent(p.id);
      const hx = hs.find(x => x.id === p.id) || {};
      if (hx.exemplo === 'Sim') tr.className = 'ip-exemplo';
      ip.cell(tr, p.id); ip.cell(tr, p.nome || ''); ip.cell(tr, p.tipo || ''); ip.cell(tr, p.origem || ''); ip.cell(tr, p.areas || '');
      ip.cell(tr, p.etapa || ''); ip.cell(tr, p.data_ultima_etapa ? ip.dm(p.data_ultima_etapa) + '/' + String(p.data_ultima_etapa).slice(0, 4) : '');
      ip.cell(tr, hx.horas !== undefined ? ip.int(hx.horas) : '—', 'n');
      const tdv = ip.cell(tr, ''); ip.pill(tdv, hx.conta_tempo === 'Sim' ? 'conta' : (hx.exemplo === 'Sim' ? 'exemplo' : 'pendente'), hx.conta_tempo === 'Sim' ? 'ok' : 'warn');
      ip.cell(tr, [p.indicador_resultado, p.resultado].filter(Boolean).join(': '));
      tb.appendChild(tr);
    });
  });
})();
