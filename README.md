# LuxTrack Pro

<p align="center">
  <img src="public/assets/luxtrack.png" alt="LuxTrack Pro" width="560" />
</p>

**LuxTrack Pro** e uma plataforma full-stack para gestao de entregas, despacho logistico e rastreamento de motoristas em tempo real.

O projeto simula uma central operacional para empresas de transporte, last mile, delivery B2B ou frotas internas. Ele inclui painel administrativo, mapa ao vivo, fluxo do despachante, app mobile do motorista, comprovante de entrega e banco PostgreSQL/PostGIS via Docker.

![Login Preview](docs/images/login-preview.svg)

## Funcionalidades

- Login com perfis separados: **Admin**, **Despachante** e **Motorista**.
- Dashboard com mapa ao vivo e posicao dos motoristas via WebSocket.
- Lista de pedidos com filtros por status, data, motorista e regiao.
- Criacao de pedido com coleta, entrega e dados do destinatario.
- Detalhe do pedido com linha do tempo completa de status.
- Painel de atribuicao de pedidos para motoristas.
- Rota otimizada com todas as paradas do dia.
- KPIs: taxa de entrega no prazo, custo por km e entregas por motorista.
- Heatmap de entregas e falhas por regiao.
- Tela mobile do motorista com paradas, navegacao e ocorrencias.
- Comprovante de entrega com foto e assinatura digital.
- Relatorio mensal exportavel em PDF.
- Banco Docker com PostgreSQL + PostGIS preparado para dados geoespaciais.

![Dashboard Preview](docs/images/dashboard-preview.svg)

## Stack

| Camada | Tecnologias |
| --- | --- |
| Frontend | React, Vite, Leaflet, Bootstrap Icons, CSS |
| Backend | Node.js, Express, JWT, WebSocket, Multer, PDFKit |
| Banco | PostgreSQL 16, PostGIS, Docker Compose |
| Mapas | Leaflet e visualizacao operacional customizada |
| Relatorios | PDF gerado pela API |

## Arquitetura

![Arquitetura](docs/images/architecture.svg)

## Como Rodar

### 1. Instalar dependencias

```bash
npm install
```

No Windows PowerShell, se `npm` estiver bloqueado pela politica de scripts, use:

```bash
npm.cmd install
```

### 2. Subir o banco com Docker

```bash
npm run db:up
```

Ou no Windows:

```bash
npm.cmd run db:up
```

O banco sobe em:

```txt
postgresql://luxtrack:luxtrack_dev@localhost:5432/luxtrack
```

### 3. Rodar a aplicacao

```bash
npm run dev
```

Ou no Windows:

```bash
npm.cmd run dev
```

Acesse:

```txt
Frontend: http://localhost:5173
API:      http://localhost:4000
Banco:    localhost:5432
```

## Acessos de Demo

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Admin | `admin@luxtrack.pro` | `lux123` |
| Despachante | `despachante@luxtrack.pro` | `lux123` |
| Motorista | `motorista@luxtrack.pro` | `lux123` |

## Banco de Dados

O schema principal esta em:

```txt
database/schema.sql
```

Ele cria tabelas para:

- empresas multi-tenant;
- usuarios e perfis;
- motoristas;
- veiculos;
- pedidos;
- historico de status;
- posicoes GPS;
- ocorrencias;
- fila de notificacoes;
- eventos de sincronizacao offline.

Tambem ativa:

- `postgis`
- `pgcrypto`
- `citext`

Comandos uteis:

```bash
npm run db:up      # sobe o banco
npm run db:shell   # abre o psql dentro do container
npm run db:logs    # mostra logs do banco
npm run db:down    # para os containers
npm run db:reset   # apaga volume e recria aplicando schema.sql
```

## Estrutura do Projeto

```txt
.
├── client/
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── main.jsx
│       └── styles.css
├── server/
│   └── src/
│       ├── data.js
│       └── index.js
├── database/
│   └── schema.sql
├── docs/
│   └── images/
├── public/
│   └── assets/
│       └── luxtrack.png
├── docker-compose.yml
├── package.json
└── README.md
```

## Endpoints Principais

| Metodo | Rota | Descricao |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Login por perfil |
| `GET` | `/api/orders` | Lista pedidos com filtros |
| `POST` | `/api/orders` | Cria pedido |
| `GET` | `/api/orders/:id` | Detalhe do pedido |
| `PATCH` | `/api/orders/:id/assign` | Atribui pedido ao motorista |
| `PATCH` | `/api/orders/:id/status` | Atualiza status do pedido |
| `POST` | `/api/drivers/:id/location` | Recebe posicao GPS |
| `POST` | `/api/routes/optimize` | Calcula rota otimizada |
| `GET` | `/api/kpis` | Retorna KPIs |
| `GET` | `/api/heatmap` | Retorna pontos do heatmap |
| `POST` | `/api/orders/:id/proof` | Envia comprovante |
| `GET` | `/api/reports/monthly.pdf` | Gera relatorio PDF |

WebSocket:

```txt
ws://localhost:4000/ws/locations
```

## Observacao Importante

O projeto ja possui **Docker + PostgreSQL + PostGIS** configurado e o schema e aplicado automaticamente na primeira criacao do volume.

Nesta versao de demonstracao, a API ainda usa dados em memoria para facilitar a avaliacao visual e funcional. O proximo passo tecnico e conectar os endpoints Express ao PostgreSQL usando o schema em `database/schema.sql`.

## Roadmap

- Persistir dados reais no PostgreSQL/PostGIS.
- Criar seed SQL com empresas, usuarios, motoristas e pedidos.
- Adicionar migrations versionadas.
- Integrar provedor real de geocoding e rotas.
- Adicionar testes automatizados para criacao, atribuicao e entrega.
- Implementar sincronizacao offline real para o app do motorista.
- Criar pipeline de CI/CD.

## Licenca

Projeto desenvolvido para portfolio e estudo de arquitetura full-stack logistica.
