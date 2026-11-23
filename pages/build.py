"""Monta o site do GitHub Pages (pasta docs/) a partir de painel/ e dados/.

Uso: python3 pages/build.py
"""
import pathlib
import shutil

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PAINEL, DADOS, PAGES, DOCS = RAIZ / 'painel', RAIZ / 'dados', RAIZ / 'pages', RAIZ / 'docs'

TROCAS = [
    ('<li><b>Registrar:</b> abra Fontes (Sources), escolha "Projetos e ações · registro" e edite a tabela: uma linha por projeto ou ação. Ou envie a planilha para o Claude atualizar.</li>',
     '<li><b>Registrar:</b> uma linha por projeto ou ação na planilha de registro; a equipe de inovação atualiza o painel.</li>'),
    ('<p class="ip-note">Para baixar os dados de qualquer gráfico ou tabela em CSV, abra Fontes (Sources), escolha a fonte e use a opção de download.</p>',
     '<p class="ip-note">Os dados de cada gráfico e tabela estão em CSV na pasta <a href="dados/">dados/</a>.</p>'),
]

pagina = (PAINEL / 'index.html').read_text(encoding='utf-8')
for antes, depois in TROCAS:
    assert antes in pagina, antes[:60]
    pagina = pagina.replace(antes, depois)

topo = (PAGES / 'head.html').read_text(encoding='utf-8')
if DOCS.exists():
    shutil.rmtree(DOCS)
(DOCS / 'dados').mkdir(parents=True)
(DOCS / 'index.html').write_text(topo + pagina + '\n</body>\n</html>\n', encoding='utf-8')
for js in PAINEL.glob('*.js'):
    shutil.copy(js, DOCS / js.name)
for csv in DADOS.glob('*.csv'):
    shutil.copy(csv, DOCS / 'dados' / csv.name)
for f in ('dash-shim.js', 'd3.min.js', 'tema.css'):
    shutil.copy(PAGES / f, DOCS / f)
(DOCS / '.nojekyll').write_text('')
print('docs/ pronto')
