# LuxTrack Pro

<p align="center">
  <img src="public/assets/luxtrack.png" alt="LuxTrack Pro" width="520" />
</p>

<p align="center">
  Plataforma full-stack para gestao de entregas, despacho logistico e rastreamento de motoristas em tempo real.
</p>

<p align="center">
  <img src="https://skillicons.dev/icons?i=react,vite,nodejs,express,js,html,css,postgres,docker" alt="Tecnologias" />
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL%20%2B%20PostGIS-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

## Preview

![Login](docs/images/login-preview.svg)

![Dashboard](docs/images/dashboard-preview.svg)

## Sobre o projeto

O **LuxTrack Pro** simula uma central operacional para empresas de transporte, last mile e frotas internas. O sistema possui perfis separados, acompanhamento em mapa, fluxo de despacho, app do motorista, comprovante de entrega e relatorio mensal em PDF.

## Funcionalidades

- Login por perfil: **Admin**, **Despachante** e **Motorista**.
- Mapa ao vivo com posicao dos motoristas via WebSocket.
- Pedidos com filtros por status, data, regiao e motorista.
- Criacao, atribuicao e atualizacao de status dos pedidos.
- Rota otimizada para paradas ativas.
- KPIs operacionais e heatmap de entregas/falhas.
- Tela mobile do motorista com ocorrencias.
- Comprovante com foto, assinatura digital e recebedor.
- Relatorio mensal exportavel em PDF.

## Stack

| Area | Tecnologias |
| --- | --- |
| Frontend | React, Vite, Leaflet, Bootstrap Icons, CSS |
| Backend | Node.js, Express, JWT, WebSocket, Multer, PDFKit |
| Banco | PostgreSQL, PostGIS, Docker Compose |
| Arquitetura | Hooks, views, services, middlewares e rotas por dominio |

## Arquitetura

![Arquitetura](docs/images/architecture.svg)

```txt
client/src/
  components/   componentes reutilizaveis
  hooks/        auth, dados, websocket e toast
  layout/       estrutura da aplicacao
  views/        telas principais
  styles/       CSS organizado por contexto
  utils/        formatadores

server/src/
  routes/       rotas separadas por dominio
  services/     regras de negocio
  middlewares/  autenticacao e autorizacao
  realtime/     websocket de localizacao
  jobs/         simuladores em background
  data/         constantes e geocalculo
```

## Como rodar

### 1. Instalar dependencias

```bash
npm install
```

No PowerShell, se `npm` estiver bloqueado:

```bash
npm.cmd install
```

### 2. Subir o banco

```bash
npm run db:up
```

Ou:

```bash
npm.cmd run db:up
```

### 3. Rodar aplicacao

```bash
npm run dev
```

Ou:

```bash
npm.cmd run dev
```

Acesse:

```txt
Frontend: http://localhost:5173
API:      http://localhost:4000
```

## Acessos demo

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Admin | `admin@luxtrack.pro` | `lux123` |
| Despachante | `despachante@luxtrack.pro` | `lux123` |
| Motorista | `motorista@luxtrack.pro` | `lux123` |

## Scripts uteis

```bash
npm run dev       # frontend + API
npm run build     # build de producao
npm run start     # inicia API/servidor
npm run db:up     # sobe PostgreSQL/PostGIS
npm run db:down   # para containers
npm run db:reset  # recria banco
```

## Observacao

Esta versao usa dados em memoria para facilitar a demonstracao visual e funcional. O projeto ja possui Docker, PostgreSQL/PostGIS e schema em `database/schema.sql`, preparado para uma proxima etapa com persistencia real.

## Autor

Projeto desenvolvido para estudo e portfolio full-stack.
