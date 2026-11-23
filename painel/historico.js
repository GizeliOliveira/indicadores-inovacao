// ===================== Histórico de indicadores anteriores =====================
dash.calc('hist_anual', {
  title: 'Histórico: consolidado por ano',
  description: 'Resultado e meta somados por ano, só nos meses com resultado registrado, atingimento e meses acima da meta.',
  inputs: ['historico_mensal'],
  fn: (meses) => {
    const grupos = {};
    meses.filter(m => m.resultado !== null && m.resultado !== '' && !isNaN(+m.resultado)).forEach(m => {
      const k = m.indicador + '|' + String(m.mes).slice(0, 4);
      (grupos[k] = grupos[k] || []).push(m);
    });
    return Object.entries(grupos).map(([chave, ms]) => {
      const resultado = ms.reduce((a, m) => a + (+m.resultado), 0);
      const meta = ms.reduce((a, m) => a + (+m.meta || 0), 0);
      const melhor = ms.reduce((b, m) => (+m.resultado > +b.resultado ? m : b));
      return {chave, indicador: ms[0].indicador, ano: String(ms[0].mes).slice(0, 4), resultado, meta,
        atingimento: meta ? resultado / meta : null, meses_medidos: ms.length,
        meses_acima: ms.filter(m => +m.resultado >= +m.meta).length,
        media_mensal: Math.round(resultado / ms.length), melhor_mes: melhor.mes, melhor_valor: +melhor.resultado};
    }).sort((a, b) => a.chave.localeCompare(b.chave));
  }
});

(function(){
  const ip = window.ip;
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const nomeMes = s => MES[+String(s).slice(5, 7) - 1] + '/' + String(s).slice(2, 4);
  const atual = () => {
    const c = dash.data('historico_catalogo');
    const lista = c.status === 'ok' ? c.data.map(r => r.indicador) : [];
    const p = dash.params().hist_ind;
    return lista.includes(p) ? p : (lista[0] || '');
  };
  const redesenhar = () => ['hist-info', 'hist-anos', 'hist-chart', 'hist-tab'].forEach(n => dash.draw(n));

  dash.draw('hist-sel', sel => {
    const c = dash.data('historico_catalogo');
    sel.replaceChildren(...(c.status === 'ok' ? c.data : []).map(r => new Option(r.indicador + ' · ' + r.programa, r.indicador)));
    sel.value = atual();
    sel.onchange = () => { dash.setParams({hist_ind: sel.value}); redesenhar(); };
  });

  dash.draw('hist-info', el => {
    const c = dash.data('historico_catalogo');
    el.replaceChildren();
    if (c.status !== 'ok') { el.textContent = '—'; return; }
    const r = c.data.find(x => x.indicador === atual());
    if (!r) { el.textContent = '—'; return; }
    const linha = (k, v) => { const p = document.createElement('p'); p.className = 'ip-note'; const b = document.createElement('b'); b.textContent = k + ': '; p.append(b, document.createTextNode(v || '—')); el.appendChild(p); };
    linha('Programa', r.programa); linha('Sistema de origem', r.sistema + ' · situação: ' + r.situacao);
    linha('Relação com o modelo atual', r.relacao_modelo_atual); linha('Observações', r.observacao);
  });

  dash.draw('hist-anos', el => {
    const d = dash.data('hist_anual');
    el.replaceChildren();
    if (d.status !== 'ok' || !d.data) { el.textContent = '—'; return; }
    d.data.filter(r => r.indicador === atual()).forEach(r => {
      const card = document.createElement('div'); card.className = 'ip-card';
      const t = document.createElement('span'); t.className = 'ip-prog'; t.textContent = r.ano + ' · atingimento da meta';
      const big = document.createElement('span'); big.className = 'ip-big';
      Object.assign(big.dataset, {source: 'hist_anual', field: 'atingimento', where: 'chave=' + encodeURIComponent(r.chave)});
      big.textContent = ip.pct(r.atingimento);
      big.style.color = r.atingimento >= 1 ? 'var(--color-ok)' : 'var(--color-bad)';
      const sub = document.createElement('span'); sub.className = 'ip-sub';
      sub.textContent = ip.int(r.resultado) + ' de ' + ip.int(r.meta) + ' · ' + r.meses_acima + ' de ' + r.meses_medidos + ' meses na meta';
      card.append(t, big, sub); el.appendChild(card);
    });
  });

  dash.draw('hist-chart', el => {
    const d = dash.data('historico_mensal');
    el.replaceChildren();
    if (d.status !== 'ok') { ip.empty(el, d.status); return; }
    const rows = d.data.filter(r => r.indicador === atual()).sort((a, b) => String(a.mes).localeCompare(String(b.mes)));
    if (!rows.length) return;
    const W = Math.max(300, el.clientWidth), H = 250, m = {t: 18, r: 10, b: 30, l: 36};
    const val = r => (r.resultado === null || r.resultado === '' || isNaN(+r.resultado)) ? null : +r.resultado;
    const max = d3.max(rows, r => Math.max(val(r) || 0, +r.meta || 0)) || 1;
    const x = d3.scaleBand().domain(rows.map(r => r.mes)).range([m.l, W - m.r]).padding(0.2);
    const y = d3.scaleLinear().domain([0, max]).nice().range([H - m.b, m.t]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', el.getAttribute('aria-label') || '');
    svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', v => y(v)).attr('y2', v => y(v)).style('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x', m.l - 6).attr('y', v => y(v) + 4).attr('text-anchor', 'end').text(v => ip.int(v));
    const step = Math.ceil(rows.length / Math.max(1, Math.floor((W - m.l) / 40)));
    svg.append('g').selectAll('text').data(rows).join('text').attr('x', r => x(r.mes) + x.bandwidth() / 2).attr('y', H - 10).attr('text-anchor', 'middle')
      .text((r, i) => (i % step === 0 || String(r.mes).endsWith('-01')) ? nomeMes(r.mes) : '');
    // anos: separadores
    rows.filter((r, i) => i > 0 && String(r.mes).endsWith('-01')).forEach(r => {
      svg.append('line').attr('x1', x(r.mes) - x.step() * x.padding() / 2).attr('x2', x(r.mes) - x.step() * x.padding() / 2).attr('y1', m.t).attr('y2', H - m.b).style('stroke', 'var(--cds-chart-axis)').style('stroke-dasharray', '2 3');
    });
    svg.append('g').selectAll('rect').data(rows.filter(r => val(r) !== null)).join('rect')
      .attr('x', r => x(r.mes)).attr('width', x.bandwidth()).attr('y', r => y(val(r))).attr('height', r => y(0) - y(val(r))).attr('rx', 2)
      .style('fill', r => val(r) >= +r.meta ? ip.color(0) : ip.color(1));
    const pts = rows.concat([{mes: '__fim', meta: rows[rows.length - 1].meta}]);
    svg.append('path').attr('d', d3.line().x((r, i) => i < rows.length ? x(r.mes) : W - m.r).y(r => y(+r.meta)).curve(d3.curveStepAfter)(pts))
      .style('fill', 'none').style('stroke', 'var(--color-fg)').style('stroke-width', 1.5).style('stroke-dasharray', '5 3');
    const tt = ip.tip(el);
    svg.append('g').selectAll('rect').data(rows).join('rect').attr('x', r => x(r.mes) - x.step() * x.padding() / 2).attr('width', x.step())
      .attr('y', m.t).attr('height', H - m.t - m.b).style('fill', 'transparent')
      .on('pointermove', (ev, r) => tt.show(ev, [['', nomeMes(r.mes)], ['Resultado', val(r) === null ? 'sem registro' : ip.int(val(r))], ['Meta', ip.int(+r.meta)],
        ['Atingimento', val(r) === null || !+r.meta ? '—' : ip.pct(val(r) / +r.meta)]]))
      .on('pointerleave', () => tt.hide());
  });

  dash.draw('hist-tab', tb => {
    const d = dash.data('hist_anual');
    tb.replaceChildren();
    if (d.status !== 'ok' || !d.data) return;
    d.data.filter(r => r.indicador === atual()).forEach(r => {
      const tr = document.createElement('tr'); tr.dataset.key = encodeURIComponent(r.chave);
      ip.cell(tr, r.ano); ip.cell(tr, ip.int(r.resultado), 'n'); ip.cell(tr, ip.int(r.meta), 'n');
      const ta = ip.cell(tr, ip.pct(r.atingimento), 'n'); ta.classList.add(r.atingimento >= 1 ? 'ip-ok' : 'ip-bad');
      ip.cell(tr, r.meses_acima + ' de ' + r.meses_medidos, 'n'); ip.cell(tr, ip.int(r.media_mensal), 'n');
      ip.cell(tr, nomeMes(r.melhor_mes) + ' (' + ip.int(r.melhor_valor) + ')');
      tb.appendChild(tr);
    });
  });
})();
