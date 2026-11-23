// Substitui, fora do Claude, a API do artefato de dados (dash.calc, dash.draw, dash.data...).
// Carrega os CSVs da pasta dados/, calcula as fontes derivadas e desenha o painel.
(function(){
  const DATASETS = {
    inovacast: 'inovacast_episodios.csv',
    squads_ciclos: 'squads_ciclos.csv',
    squads_solucoes: 'squads_solucoes.csv',
    squads_reports: 'squads_reports_2026.csv',
    squads_capacitacao: 'squads_capacitacao_2026.csv',
    squads_pessoas: 'squads_pessoas.csv',
    impulsiona_grupos: 'impulsiona_grupos.csv',
    impulsiona_reunioes: 'impulsiona_reunioes.csv',
    impulsiona_indicadores: 'impulsiona_indicadores.csv',
    impulsiona_semestres: 'impulsiona_semestres.csv',
    startups: 'radar_empresas.csv',
    radar_pesquisas: 'radar_pesquisas.csv',
    radar_vinculos: 'radar_vinculos.csv',
    tempo_devolvido: 'tempo_devolvido_status.csv',
    areas_ativas: 'areas_ativas_2027.csv',
    projetos: 'projetos_acoes.csv',
    historico_mensal: 'historico_mensal.csv',
    historico_catalogo: 'historico_catalogo.csv'
  };
  const raw = {}, calcs = {}, cache = {}, draws = {}, dataCbs = [];
  let ready = false, failed = false, params = {};
  try { params = JSON.parse(sessionStorage.getItem('ip-params') || '{}'); } catch (e) { params = {}; }

  function value(id){
    if (id in cache) return cache[id];
    if (id in raw) return (cache[id] = raw[id]);
    const c = calcs[id];
    if (!c) return (cache[id] = []);
    return (cache[id] = c.fn(...(c.inputs || []).map(value)));
  }
  function run(name){
    const fn = draws[name];
    if (!fn) return;
    document.querySelectorAll('[data-draw="' + name + '"]').forEach(el => {
      try { fn(el); } catch (e) { console.error('draw ' + name, e); }
    });
  }

  window.dash = {
    colors: ['#00995d', '#f47920', '#004e4c', '#b1d34b', '#a4d8de', '#d2a494', '#ffe596', '#f1cdcd'],
    calc(id, def){ calcs[id] = def; },
    draw(name, fn){ if (fn) draws[name] = fn; if (ready || failed) run(name); },
    data(id){
      if (failed) return {status: 'error', data: null};
      if (!ready) return {status: 'loading', data: null};
      try { return {status: 'ok', data: value(id)}; } catch (e) { console.error('calc ' + id, e); return {status: 'error', data: null}; }
    },
    params(){ return Object.assign({}, params); },
    setParams(obj){ Object.assign(params, obj); try { sessionStorage.setItem('ip-params', JSON.stringify(params)); } catch (e) {} },
    onData(cb){ dataCbs.push(cb); if (ready) cb(); },
    setLink(name){ try { history.replaceState(null, '', '#' + name); } catch (e) {} }
  };

  window.addEventListener('load', () => {
    const clean = row => { for (const k in row) if (row[k] === '') row[k] = null; return row; };
    Promise.all(Object.entries(DATASETS).map(([id, file]) =>
      d3.csv('dados/' + file, clean).then(rows => { raw[id] = rows; })
    )).then(() => { ready = true; }).catch(e => { console.error(e); failed = true; })
      .finally(() => { Object.keys(draws).forEach(run); dataCbs.forEach(cb => { try { cb(); } catch (e) { console.error(e); } }); });
    // Gráficos de abas ocultas são medidos com largura zero: redesenha ao trocar de aba e ao redimensionar.
    let pend = null;
    const redrawAll = () => { clearTimeout(pend); pend = setTimeout(() => { if (ready) Object.keys(draws).forEach(run); }, 60); };
    const obs = new MutationObserver(redrawAll);
    document.querySelectorAll('[data-sec]').forEach(s => obs.observe(s, {attributes: true, attributeFilter: ['hidden']}));
    let lastW = window.innerWidth;
    window.addEventListener('resize', () => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; redrawAll(); } });
  });
})();
