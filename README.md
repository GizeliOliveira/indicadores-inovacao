# Indicadores da Inovação · Unimed Ponta Grossa

Painel institucional dos indicadores da área de Inovação: Squads, Inova Cast, Impulsiona, Radar de Inovação, Projetos e ações, indicadores estratégicos de 2027 e histórico dos indicadores anteriores.

O painel publicado vive como artefato de dados no Claude. Este repositório guarda uma cópia versionada do código e dos dados que o alimentam.

## Estrutura

```
painel/
  index.html       página do painel: abas, layout, cálculos e gráficos principais
  interacoes.js    funil da Visão do ano, comparador de ciclos, pontos de atenção e simuladores
  projetos.js      aba Projetos e ações (horas devolvidas, etapas, áreas ativas por trimestre)
  historico.js     aba Histórico (indicadores anteriores, consolidado por ano)
  scorecard.js     Innovation Scorecard (Resultados · Estratégia · Processo · Contexto)
  radar.js         Radar de Inovação (pesquisas de mercado e portfólio de empresas)
dados/             CSVs anonimizados que alimentam o painel
```

## Abas

| Aba | O que mostra |
|---|---|
| Visão do ano | Innovation Scorecard nas 4 dimensões, potencial × capturado, funil da inovação, evolução de Squads e Impulsiona e pontos de atenção |
| Intraempreendedorismo | Inova Cast e Squads, com o comparador de ciclos |
| Inovação Aberta | Impulsiona e Radar de Inovação |
| Projetos e ações | Registro único de projetos e ações, que alimenta os indicadores estratégicos |
| Indicadores estratégicos | Tempo Devolvido por Inovação e Áreas com Iniciativas de Inovação Ativas (2027), com simuladores |
| Histórico | Indicadores acompanhados antes do modelo atual |

## Dados

| Arquivo | Fonte no painel | Conteúdo |
|---|---|---|
| `inovacast_episodios.csv` | inovacast | Edições ao vivo do Inova Cast com métricas do YouTube |
| `squads_ciclos.csv` | squads_ciclos | Ciclos de 2021 a 2026: participações, desafios, implantadas e meta |
| `squads_solucoes.csv` | squads_solucoes | Soluções por squad, com unidade e status |
| `squads_reports_2026.csv` | squads_reports | Notas dos reports de sprint do ciclo 2026 |
| `squads_capacitacao_2026.csv` | squads_capacitacao | Workshops, checkpoints e capacitações de 2026 |
| `squads_pessoas.csv` | squads_pessoas | Total de pessoas únicas que já participaram |
| `impulsiona_*.csv` | impulsiona_* | Grupos, reuniões, indicadores e semestres do Impulsiona |
| `radar_empresas.csv` | startups | Portfólio de empresas do Radar de Inovação |
| `radar_pesquisas.csv`, `radar_vinculos.csv` | radar_pesquisas, radar_vinculos | Pesquisas de mercado e vínculos entre pesquisa e empresa |
| `tempo_devolvido_status.csv` | tempo_devolvido | Meta de horas do Tempo Devolvido |
| `areas_ativas_2027.csv` | areas_ativas | Metas trimestrais de áreas ativas em 2027 |
| `projetos_acoes.csv` | projetos | Registro de projetos e ações (a linha P-000 é exemplo) |
| `historico_*.csv` | historico_catalogo, historico_mensal | Indicadores anteriores |

Os arquivos não têm nomes, RA, contatos ou outros dados pessoais de alunos e colaboradores, nem nomes de analistas ou responsáveis. O repositório e o site do GitHub Pages são públicos: os números internos, os nomes das soluções e das empresas avaliadas ficam visíveis para qualquer pessoa.

## Como atualizar

1. Envie as planilhas atualizadas ao Claude no projeto "Governança de Inovação".
2. O Claude limpa, anonimiza e atualiza o painel publicado.
3. Peça para subir a nova versão aqui. Cada atualização vira um commit, então o histórico de mudanças fica registrado.

## Observação técnica

`index.html` e os scripts usam a API do artefato de dados do Claude (`dash.calc`, `dash.draw`, `dash.data`) e o d3, fornecidos pelo ambiente do painel. Abertos direto no navegador, fora desse ambiente, eles não renderizam: este repositório serve de cópia de segurança e registro de versões.

## Site no GitHub Pages

A pasta `docs/` é uma versão do painel que roda fora do Claude, publicada pelo GitHub Pages. Ela usa `pages/dash-shim.js` no lugar da API do artefato e lê os CSVs de `docs/dados/`.

Depois de mudar `painel/` ou `dados/`, gere o site de novo antes do commit:

```
python3 pages/build.py
```

O site é público: qualquer pessoa com o link vê todos os números e nomes do painel.
