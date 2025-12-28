# PLM - Pipeline Management

Multi-tenant pipeline engine with Kanban UI, stage rules, card forms accumulation, and event hooks to Automation Plans.

## Stack

- **Backend**: NestJS + Prisma + PostgreSQL
- **Frontend**: Vite + React + Tailwind + @dnd-kit
- **Database**: PostgreSQL 16+

## Project Structure

```
PLM/
├── database/           # DDL and seed SQL files
│   ├── 001_ddl.sql    # Schema definition
│   └── 002_seed.sql   # Sample data
├── backend/           # NestJS API
│   ├── src/
│   │   ├── prisma/    # Prisma module
│   │   ├── common/    # Guards, decorators, filters
│   │   └── modules/   # Feature modules
│   └── prisma/        # Prisma schema
├── frontend/          # React SPA
│   └── src/
│       ├── components/
│       │   ├── kanban/    # Kanban board components
│       │   ├── layout/    # Layout components
│       │   └── ui/        # UI components
│       ├── pages/         # Route pages
│       ├── services/      # API client
│       └── context/       # React context
└── docker-compose.yml # PostgreSQL container
```

## Quick Start

### 1. Start Database

```bash
docker-compose up -d
```

### 2. Setup Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run start:dev
```

The API will be available at `http://localhost:3000`
Swagger docs at `http://localhost:3000/docs`

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Tenancy
- `POST /api/v1/tenants` - Create tenant
- `GET /api/v1/tenants` - List tenants
- `POST /api/v1/organizations` - Create organization (requires X-Tenant-Id header)
- `GET /api/v1/organizations` - List organizations

### Pipelines
- `POST /api/v1/pipelines` - Create pipeline
- `GET /api/v1/pipelines` - List pipelines
- `GET /api/v1/pipelines/:id` - Get pipeline
- `POST /api/v1/pipelines/:id/versions` - Clone version
- `POST /api/v1/pipelines/:id/versions/:version/publish` - Publish version

### Stages
- `POST /api/v1/pipelines/:id/versions/:version/stages` - Create stage
- `GET /api/v1/pipelines/:id/versions/:version/stages` - List stages
- `POST /api/v1/pipelines/:id/versions/:version/transitions` - Create transition
- `POST /api/v1/stages/:id/attach-forms` - Attach form to stage

### Cards
- `POST /api/v1/cards` - Create card
- `GET /api/v1/cards` - List cards
- `GET /api/v1/cards/:id` - Get card with forms and history
- `GET /api/v1/cards/kanban/:pipelineId` - Get Kanban board data
- `POST /api/v1/cards/:id/move` - Move card to another stage
- `PATCH /api/v1/cards/:id/forms/:formId` - Update card form

### Forms
- `POST /api/v1/forms` - Create form definition
- `GET /api/v1/forms` - List forms
- `POST /api/v1/forms/:id/publish` - Publish form

### Automations
- `POST /api/v1/automations/bindings` - Create automation binding
- `GET /api/v1/automations/bindings` - List bindings

## Multi-tenant Headers

All API requests (except tenant creation) require:

- `X-Tenant-Id`: UUID of the tenant
- `X-Organization-Id`: UUID of the organization (for most endpoints)

## Business Rules

1. **BR-001**: Card accumulates forms - never loses previously attached forms
2. **BR-002**: TO_FILL forms with missing required fields block card movement
3. **BR-003**: Cards can only move through defined stage transitions
4. **BR-004**: Each stage has a classification and color for UI/analytics
5. **BR-005**: Published pipeline versions are immutable
6. **BR-006**: Events (card move, create, etc.) trigger automation hooks

## Events

The system emits events via transactional outbox:

- `PLM.PIPE.CREATED` - Pipeline created
- `PLM.PIPE.PUBLISHED` - Pipeline version published
- `PLM.PIPE.CLOSED` - Pipeline closed
- `PLM.CARD.CREATED` - Card created
- `PLM.CARD.MOVED` - Card moved to another stage
- `PLM.CARD.CLOSED` - Card closed

## License

Private - All rights reserved
