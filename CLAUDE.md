# CLAUDE.md — Memória do Projeto

## Visão Geral

**EuroInfo Suite** (interno: Nexus Service) é um sistema SaaS de gerenciamento de serviços de campo para equipes técnicas de uma empresa de TI brasileira. O sistema permite criação e acompanhamento de chamados externos (clientes) e atendimentos internos, otimização de rotas via IA, manutenção preventiva automatizada, relatórios inteligentes e comunicação via WhatsApp. Atende técnicos de campo, gerentes, encarregados e administradores, com suporte a PWA e app Android nativo via Capacitor.

---

## Stack Tecnológica

| Tecnologia | Versão | Função |
|---|---|---|
| Next.js | 15.3.8 | Framework fullstack (App Router) |
| React | 18.3.1 | UI framework |
| TypeScript | 5 | Tipagem estática |
| Tailwind CSS | 3.4.1 | Estilização utilitária |
| shadcn/ui + Radix UI | latest | Biblioteca de componentes acessíveis |
| Firebase (Firestore) | 11.9.1 | Banco de dados NoSQL em tempo real |
| Firebase Auth | 11.9.1 | Autenticação de usuários |
| Firebase Storage | 11.9.1 | Upload de fotos e arquivos |
| Genkit + Google AI | 1.14.1 | Framework de IA (fluxos com Gemini 2.5-Flash) |
| Capacitor | 6.0.0 | Wrapper nativo Android/iOS |
| next-pwa | 10.2.8 | Progressive Web App (service worker) |
| web-push | 3.6.7 | Notificações push web (VAPID) |
| React Hook Form + Zod | 7.54.2 / 3.24.2 | Formulários e validação |
| Recharts | 2.15.1 | Gráficos e visualizações |
| React Big Calendar | 1.13.0 | Calendário de agendamentos |
| jsPDF + autotable | 2.5.1 / 3.8.2 | Exportação de relatórios em PDF |
| XLSX | 0.18.5 | Exportação para Excel |
| TanStack Table | 8.19.3 | Tabelas com ordenação/filtro |
| date-fns | 3.6.0 | Manipulação de datas |
| patch-package | 8.0.0 | Patches em dependências de terceiros |

---

## Arquitetura

O projeto usa **Next.js App Router** com dois grupos de rotas:

```
src/app/
├── (auth)/          → Rotas públicas: login, aceitar convite
└── (app)/           → Rotas protegidas (requerem autenticação)
```

**Padrão de layout dual (web/mobile):**
- `web-layout.tsx` — sidebar colapsável para desktop
- `mobile-layout.tsx` — bottom navigation bar para mobile/nativo

**Camadas da aplicação:**
1. **UI Layer** → `src/components/` (shadcn/ui + componentes de negócio)
2. **Page Layer** → `src/app/(app)/*/page.tsx` (cada módulo tem sua página)
3. **Hook Layer** → `src/hooks/` (auth, mobile detection, platform)
4. **Service Layer** → `src/lib/services/` (WhatsApp, push, preventiva)
5. **AI Layer** → `src/ai/flows/` (fluxos Genkit server-side com `'use server'`)
6. **Data Layer** → Firebase Firestore (leitura em tempo real via `onSnapshot`)

**Detecção de plataforma:** `usePlatform()` detecta Capacitor nativo vs. browser e `useIsMobile()` detecta breakpoint para selecionar o layout correto.

---

## Arquivos Críticos

| Arquivo | Descrição |
|---|---|
| `src/hooks/use-auth.tsx` | Contexto de autenticação, lógica de login, proteção de rotas, usuário master de dev |
| `src/lib/types.ts` | Todas as definições de tipos TypeScript do domínio |
| `src/lib/nav-items.ts` | Configuração da navegação por módulo e permissões de role |
| `src/firebase/config.ts` | Inicialização segura do Firebase (singleton) |
| `src/app/(app)/layout.tsx` | Layout raiz das rotas protegidas, detecção web/mobile |
| `src/app/(app)/web-layout.tsx` | Layout desktop com sidebar |
| `src/app/(app)/mobile-layout.tsx` | Layout mobile com bottom nav |
| `src/ai/genkit.ts` | Inicialização do Genkit com Google AI plugin |
| `src/ai/flows/optimize-technician-routes.ts` | Fluxo AI de otimização de rotas |
| `src/ai/flows/generate-ticket-report-summary.ts` | Fluxo AI de geração de relatórios |
| `src/lib/services/notification-service.ts` | Envio de notificações WhatsApp (Z-API) + Web Push |
| `src/lib/services/preventive-maintenance-service.ts` | Geração automática de chamados preventivos |
| `src/lib/services/push-notification-service.ts` | Gerenciamento de tokens de dispositivos |
| `next.config.ts` | Configuração Next.js com PWA habilitado |
| `capacitor.config.ts` | Configuração do app Android nativo |
| `tailwind.config.ts` | Tema personalizado com variáveis CSS |
| `src/app/globals.css` | Variáveis CSS de tema (dark/light mode) |

---

## Variáveis de Ambiente

```bash
# Firebase (cliente - NEXT_PUBLIC_)
NEXT_PUBLIC_FIREBASE_API_KEY=           # Chave da API Firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=       # Domínio de autenticação Firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=        # ID do projeto Firebase
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=    # Bucket do Firebase Storage
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID= # Sender ID para messaging
NEXT_PUBLIC_FIREBASE_APP_ID=            # App ID Firebase

# Z-API WhatsApp (cliente - NEXT_PUBLIC_)
NEXT_PUBLIC_ZAPI_INSTANCE_ID=           # ID da instância Z-API
NEXT_PUBLIC_ZAPI_INSTANCE_TOKEN=        # Token da instância Z-API
NEXT_PUBLIC_ZAPI_CLIENT_TOKEN=          # Client token Z-API

# Google AI / Genkit (servidor)
GEMINI_API_KEY=                         # Chave da API Gemini (Google AI Studio)

# Analytics (cliente - NEXT_PUBLIC_)
NEXT_PUBLIC_GA_ID=                      # ID Google Analytics 4 (ex: G-XXXXXXXXXX)

# Web Push Notifications (servidor)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=           # Chave pública VAPID (gerar via npm run generate-vapid-keys)
VAPID_PRIVATE_KEY=                      # Chave privada VAPID (nunca expor ao cliente)
```

> **Atenção:** `GEMINI_API_KEY` está exposta ao cliente via `env` no `next.config.ts`. Isso é um risco de segurança — a chave deveria ser usada apenas server-side.

---

## Comandos Essenciais

```bash
# Desenvolvimento
npm run dev              # Inicia Next.js em http://localhost:9002 (com Turbopack)
npm run genkit:dev       # Inicia servidor Genkit AI separado para debug de flows
npm run genkit:watch     # Idem, com hot reload nos flows de IA

# Build e produção
npm run build            # Build de produção
npm start                # Inicia servidor de produção

# Qualidade de código
npm run lint             # Verifica ESLint
npm run typecheck        # Verifica TypeScript sem gerar arquivos

# Utilitários
npm run generate-vapid-keys  # Gera par de chaves VAPID para push notifications
```

---

## Regras e Padrões do Projeto

**Roles de usuário (5 níveis):**
- `admin` — Acesso total a todos os módulos
- `gerente` — Gestão geral, relatórios, sem acesso a configurações de sistema
- `encarregado` — Supervisão de equipe e chamados
- `tecnico` — Acesso operacional: chamados, rotas, histórico próprio
- `vendedor` — Acesso limitado a clientes e contratos

**Convenções de código:**
- Componentes em PascalCase, arquivos em kebab-case
- Componentes de página em `src/app/(app)/[modulo]/page.tsx`
- Componentes reutilizáveis em `src/components/[modulo]/`
- Tipos centralizados em `src/lib/types.ts`
- Fluxos Genkit marcados com `'use server'` no topo
- Firebase sempre importado de `src/firebase/config.ts`

**Padrão de formulários:**
- React Hook Form + Zod schema para validação
- shadcn/ui Form components wrapping Radix UI

**Estrutura de componentes de página típica:**
1. Fetch de dados com `onSnapshot` Firestore
2. Estado local com `useState`
3. Formulário em Dialog com React Hook Form + Zod
4. Tabela com TanStack Table ou lista de cards

---

## Integrações Externas

**Firebase (Firestore, Auth, Storage)**
- Coleções: `users`, `external-tickets`, `internal-tickets`, `clients`, `serviceContracts`, `technicians`, `sectors`, `checklists`, `system-logs`, `notifications`
- Sub-coleção: `users/{userId}/devices` para tokens de push
- Leitura em tempo real via `onSnapshot` na maioria das páginas
- Regras de segurança em `storage.rules`

**Z-API (WhatsApp)**
- Envio de mensagens para números individuais e grupos
- Usado em: notificação de novos chamados, manutenção preventiva, alertas de SLA
- Serviço: `src/lib/services/notification-service.ts`
- Requer instância WhatsApp conectada no Z-API

**Google AI (Gemini 2.5-Flash via Genkit)**
- 5 fluxos AI: otimização de rotas, resumo de relatório, planejamento preventivo, relatório interativo, busca de grupos WhatsApp
- Todos os chamados AI são logados no Firestore (`system-logs`)
- Servidor: necessita `GEMINI_API_KEY`

**Web Push (VAPID)**
- Notificações push para navegadores e PWA
- Tokens armazenados por dispositivo no Firestore
- Fallback automático para WhatsApp se push não disponível

**Google Analytics 4**
- Componente: `src/components/google-analytics.tsx`
- Rastreia navegação e interações

**Capacitor (Android)**
- Package ID: `com.nexusservice.app`
- Push Notifications nativo
- Acesso a câmera e GPS

---

## O que NÃO fazer

1. **Não usar `getAuth()` diretamente** — sempre usar o hook `useAuth()` de `src/hooks/use-auth.tsx`
2. **Não importar Firebase diretamente** — sempre via `src/firebase/config.ts`
3. **Não criar flows Genkit client-side** — todos os flows devem ter `'use server'` e ficar em `src/ai/flows/`
4. **Não bypassar TypeScript errors** adicionando mais `@ts-ignore` — já há `ignoreBuildErrors: true` que é tech debt, não piorar
5. **Não adicionar NEXT_PUBLIC_** em variáveis secretas (VAPID private key, chaves de API server-side)
6. **Não fazer chamadas diretas para Z-API no cliente** — usar o serviço de notificação
7. **Não remover o check de usuário `inactive`** no `use-auth.tsx` — é controle de acesso crítico
8. **Não alterar a estrutura de roles sem atualizar `nav-items.ts`** e `types.ts` em conjunto

---

## Estado Atual do Desenvolvimento

**Pronto (produção):**
- Autenticação e RBAC completos
- CRUD de Chamados Externos com workflow completo (check-in/out, relatório técnico, checklist, assinatura)
- CRUD de Atendimentos Internos
- Dashboard com métricas em tempo real
- Gerenciamento de Clientes, Técnicos, Setores, Checklists, Contratos
- Otimização de rotas com IA
- Relatórios com IA (resumo + interativo)
- Manutenção preventiva automatizada
- Notificações WhatsApp + Web Push
- Layout dual (web/mobile)
- PWA instalável
- App Android via Capacitor
- Histórico de rotas
- Monitoramento do sistema
- Rastreamento de localização

**Em progresso / Incompleto:**
- Settings > Segurança (apenas placeholder, sem lógica real)
- Settings > Backup (apenas placeholder)
- Testes automatizados (nenhum framework de teste configurado)

**Pendente / Tech debt:**
- `typescript.ignoreBuildErrors: true` no next.config.ts deve ser removido
- `GEMINI_API_KEY` não deveria ser exposta ao cliente
- `.env.example` incompleto (faltam VAPID keys e GEMINI_API_KEY)
- Sem CI/CD configurado
