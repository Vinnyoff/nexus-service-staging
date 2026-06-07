# Arquitetura — EuroInfo Suite

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTES                                  │
│  Browser (PWA)          Android App           Desktop            │
│  (next-pwa SW)          (Capacitor 6)         (Browser)          │
└────────────────┬───────────────┬───────────────┬────────────────┘
                 │               │               │
                 └───────────────┴───────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     Next.js App Router   │
                    │       (porta 9002)        │
                    │                          │
                    │  ┌──────────────────┐    │
                    │  │  (auth) routes   │    │ ← Login, Convite
                    │  └──────────────────┘    │
                    │  ┌──────────────────┐    │
                    │  │  (app) routes    │    │ ← Módulos protegidos
                    │  └──────────────────┘    │
                    │  ┌──────────────────┐    │
                    │  │  Server Actions  │    │ ← Genkit AI flows
                    │  │  ('use server')  │    │
                    │  └──────────────────┘    │
                    └────────────┬────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                       │
┌─────────▼──────┐   ┌──────────▼──────┐   ┌───────────▼──────┐
│    Firebase     │   │   Google AI      │   │     Z-API         │
│                 │   │   (Gemini 2.5)   │   │   (WhatsApp)      │
│  • Firestore   │   │                  │   │                   │
│  • Auth         │   │  via Genkit 1.14 │   │  REST API         │
│  • Storage      │   │                  │   │  Mensagens/Grupos │
└─────────────────┘   └──────────────────┘   └───────────────────┘
```

---

## Grupos de Rotas Next.js (App Router)

```
src/app/
├── layout.tsx                    ← Root layout (ThemeProvider, PushBoot)
├── page.tsx                      ← Redireciona para /dashboard
│
├── (auth)/                       ← Rotas PÚBLICAS (sem auth)
│   ├── layout.tsx
│   ├── login/page.tsx
│   └── accept-invitation/page.tsx
│
└── (app)/                        ← Rotas PROTEGIDAS
    ├── layout.tsx                ← Verifica auth → detecta web/mobile
    ├── web-layout.tsx            ← Layout desktop (sidebar + topbar)
    ├── mobile-layout.tsx         ← Layout mobile (bottom nav)
    │
    ├── dashboard/page.tsx
    ├── schedule/page.tsx
    ├── external-tickets/
    │   ├── page.tsx
    │   └── [id]/page.tsx
    ├── internal-tickets/page.tsx
    ├── routes/page.tsx
    ├── location/page.tsx
    ├── planning/page.tsx
    ├── history/page.tsx
    ├── reports/
    │   ├── page.tsx
    │   ├── summary/page.tsx
    │   └── interactive/page.tsx
    ├── clients/page.tsx
    ├── contracts/page.tsx
    ├── technicians/page.tsx
    ├── users/page.tsx
    ├── sectors/page.tsx
    ├── checklists/page.tsx
    ├── monitoring/page.tsx
    └── settings/
        ├── page.tsx
        ├── appearance/page.tsx
        ├── security/page.tsx
        ├── backup/page.tsx
        └── mobile/page.tsx
```

---

## Camadas da Aplicação

```
┌──────────────────────────────────────────────────────┐
│                    UI LAYER                          │
│  src/components/                                     │
│  shadcn/ui + Radix UI (40+ componentes base)        │
│  Componentes de negócio por módulo                  │
└──────────────────────────────────────────────────────┘
                         ↑
┌──────────────────────────────────────────────────────┐
│                   PAGE LAYER                         │
│  src/app/(app)/[module]/page.tsx                    │
│  State local com useState                           │
│  Data fetch com onSnapshot (Firestore)              │
└──────────────────────────────────────────────────────┘
                         ↑
┌──────────────────────────────────────────────────────┐
│                   HOOK LAYER                         │
│  use-auth.tsx      → Auth context e RBAC             │
│  use-mobile.tsx    → Breakpoint detection            │
│  use-platform.ts   → Capacitor vs. browser          │
│  use-debounce.ts   → Debounce utility               │
└──────────────────────────────────────────────────────┘
                         ↑
┌──────────────────────────────────────────────────────┐
│                 SERVICE LAYER                        │
│  notification-service.ts       → WhatsApp + Push    │
│  push-notification-service.ts  → Token management  │
│  preventive-maintenance-service.ts → Auto-tickets  │
└──────────────────────────────────────────────────────┘
                         ↑
┌──────────────────────────────────────────────────────┐
│                    AI LAYER                          │
│  src/ai/flows/ (marcados com 'use server')          │
│  Genkit 1.14.1 + Gemini 2.5-Flash                  │
│  Todos os calls logados no Firestore                │
└──────────────────────────────────────────────────────┘
                         ↑
┌──────────────────────────────────────────────────────┐
│                  DATA LAYER                          │
│  Firebase Firestore                                 │
│  Leitura em tempo real: onSnapshot                  │
│  Escrita: addDoc, updateDoc, deleteDoc              │
└──────────────────────────────────────────────────────┘
```

---

## Fluxo de Autenticação e Autorização

```
Usuário acessa URL
       │
       ▼
(app)/layout.tsx
       │
  useAuth() → verifica AuthContext
       │
    sem user?          com user?
       │                   │
       ▼                   ▼
  redirect /login    verifica status
                          │
                   status='inactive'?
                     │         │
                    Sim        Não
                     │         │
                  logout    renderiza layout
                  toast     (web ou mobile)
```

**Autenticação especial (dev):**
- Email `dev@nexus.com` / senha `123456` → cria objeto admin mock sem Firebase
- Permite desenvolvimento sem credenciais reais

**RBAC (controle por role):**
```
nav-items.ts define quais módulos cada role vê
     ↓
ModulePermissions no objeto User define acesso granular
     ↓
Componentes verificam user.role ou module permissions
```

---

## Fluxo de Dados: Chamado Externo

```
Formulário (new-external-ticket-form.tsx)
       │
  Zod validation
       │
  addDoc(db, 'external-tickets', data)
       │
  notification-service.ts
  ├── Z-API WhatsApp → setor do chamado
  └── web-push → técnico responsável
       │
  Dashboard onSnapshot → atualiza UI em tempo real
```

---

## Fluxo de Otimização de Rotas (AI)

```
Técnico clica "Otimizar Rota"
       │
  Coleta: localização atual, endereços dos chamados pendentes
       │
  Server Action: optimizeTechnicianRoutes()
       │
  Genkit Flow → Gemini 2.5-Flash
  Prompt: "Ordene estes endereços pelo caminho mais eficiente"
       │
  Resposta: lista ordenada + explicação em português
       │
  Log em Firestore: system-logs (tipo: 'ai_call')
       │
  UI: renderiza rota otimizada
  Técnico pode reordenar manualmente
```

---

## Fluxo de Manutenção Preventiva

```
Admin cria ServiceContract com frequência
       │
  preventive-maintenance-service.ts
  generatePreventiveTickets()
       │
  Para cada contrato ativo:
  ├── Verifica se já existe chamado aberto para o cliente
  ├── Calcula próxima data baseado em lastPreventiveDate + frequency
  ├── Se data ≤ hoje: cria ExternalTicket do tipo 'contrato'
  └── Notifica grupo WhatsApp do setor
```

---

## Coleções Firestore

```
users/                          # Perfis de usuário
  {userId}/
    devices/                    # Tokens de push notification por dispositivo
      {deviceId}

external-tickets/               # Chamados de clientes
internal-tickets/               # Atendimentos internos
clients/                        # Cadastro de clientes
serviceContracts/               # Contratos de manutenção
technicians/                    # Perfis de técnicos
sectors/                        # Setores/departamentos
checklists/                     # Checklists de serviço
system-logs/                    # Auditoria: AI calls, ticket events, API calls
notifications/                  # Registro de notificações enviadas
```

---

## Detecção de Plataforma

```typescript
// usePlatform() em src/hooks/use-platform.ts
Capacitor.isNativePlatform()
  → true  = Android/iOS nativo → mobile-layout.tsx
  → false = useIsMobile() (breakpoint)
              → true  = mobile-layout.tsx (browser mobile)
              → false = web-layout.tsx (desktop)
```

---

## Sistema de Notificações

```
Evento (novo chamado, preventiva, SLA expirado)
       │
  notification-service.ts
       │
  ┌────┴────┐
  │         │
WhatsApp   Web Push
(Z-API)   (VAPID)
  │         │
Mensagem  push-notification-service.ts
grupo/    → busca tokens do usuário no Firestore
número    → envia via web-push library
```

---

## Decisões Arquiteturais

| Decisão | Motivo |
|---|---|
| Next.js App Router (não Pages Router) | RSC, Server Actions para AI flows, melhor performance |
| Firebase Firestore (não REST API própria) | Tempo real nativo, escalabilidade, sem servidor backend separado |
| Genkit (não chamada direta à API Gemini) | Abstração de AI flows, logging automático, testabilidade dos prompts |
| `'use server'` nos flows AI | Evita expor API keys no cliente, execução server-side |
| Capacitor (não React Native) | Reaproveitamento total do codebase web existente |
| shadcn/ui (não Material UI) | Componentes copiados para o projeto, sem dependências pesadas, personalização total |
| Dual layout web/mobile | UX otimizada para cada plataforma sem duplicar lógica de negócio |
| `patch-package` | Correções necessárias em dependências sem forking |

---

## Limitações Conhecidas

1. Sem testes automatizados — zero cobertura de testes
2. TypeScript errors ignorados em build (`ignoreBuildErrors: true`)
3. `GEMINI_API_KEY` exposta ao cliente via `next.config.ts env`
4. Sem CI/CD pipeline
5. Sem rate limiting nas Server Actions de IA
6. Sem paginação Firestore — todas as coleções carregam completas (pode ser problema de escala)
7. Settings de Segurança e Backup são apenas placeholders visuais
