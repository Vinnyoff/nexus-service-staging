# API e Integrações — EuroInfo Suite

## 1. Server Actions (Genkit AI Flows)

Todos os fluxos de IA são Server Actions Next.js, marcados com `'use server'` e localizados em `src/ai/flows/`.

Eles são chamados diretamente de componentes cliente como funções assíncronas — Next.js serializa automaticamente os parâmetros.

---

### `optimizeTechnicianRoutes`

**Arquivo:** `src/ai/flows/optimize-technician-routes.ts`

**Propósito:** Retorna a ordem otimizada de visitas para um técnico, minimizando deslocamento.

**Input:**
```typescript
{
  currentLocation: string;       // Ex: "Rua das Flores, 123, São Paulo, SP"
  ticketAddresses: string[];     // Lista de endereços dos chamados pendentes
  userId: string;                // Para log de auditoria
}
```

**Output:**
```typescript
{
  optimizedOrder: string[];      // Endereços na ordem otimizada
  explanation: string;           // Justificativa em português
}
```

**Modelo AI:** Gemini 2.5-Flash  
**Efeito colateral:** Registra chamada em `system-logs` no Firestore

---

### `generateTicketReportSummary`

**Arquivo:** `src/ai/flows/generate-ticket-report-summary.ts`

**Propósito:** Analisa dados de chamados e gera resumo executivo com insights.

**Input:**
```typescript
{
  externalTickets: ExternalTicket[];
  internalTickets: InternalTicket[];
  users: User[];
  sectors: Sector[];
  context: string;               // Período e filtros aplicados
  userId: string;
}
```

**Output:**
```typescript
{
  summary: string;               // Markdown com análise completa
  suggestions: string[];         // Lista de sugestões de melhoria
}
```

**Modelo AI:** Gemini 2.5-Flash  
**Efeito colateral:** Registra chamada em `system-logs`

---

### `planPreventiveRoutes`

**Arquivo:** `src/ai/flows/plan-preventive-routes.ts`

**Propósito:** Gera plano de rotas preventivas para um período, agrupando clientes geograficamente.

**Input:**
```typescript
{
  clients: Client[];             // Clientes que precisam de visita
  startAddress: string;          // Endereço de partida
  periodDays: number;            // Número de dias para distribuir
  sectorName: string;
  userId: string;
}
```

**Output:**
```typescript
{
  routesByDay: {
    day: number;
    routes: { clientName: string; address: string; }[];
  }[];
  summary: string;               // Markdown explicando a lógica
}
```

---

### `interactiveReportFlow`

**Arquivo:** `src/ai/flows/interactive-report-flow.ts`

**Propósito:** Chat interativo sobre dados operacionais.

**Input:**
```typescript
{
  question: string;
  externalTickets: ExternalTicket[];
  internalTickets: InternalTicket[];
  users: User[];
  sectors: Sector[];
  conversationHistory: { role: string; content: string; }[];
  userId: string;
}
```

**Output:**
```typescript
{
  answer: string;                // Resposta em Markdown
}
```

---

### `fetchWhatsAppGroups`

**Arquivo:** `src/ai/flows/fetch-whatsapp-groups.ts`

**Propósito:** Busca lista de grupos WhatsApp disponíveis na instância Z-API.

**Input:** nenhum

**Output:**
```typescript
{
  groups: { id: string; name: string; }[];
}
```

---

## 2. Z-API (WhatsApp)

**Documentação:** https://developer.z-api.io/  
**Serviço:** `src/lib/services/notification-service.ts`

### Enviar mensagem para número individual

```
POST https://api.z-api.io/instances/{INSTANCE_ID}/token/{INSTANCE_TOKEN}/send-text
Headers:
  Client-Token: {CLIENT_TOKEN}
Body:
{
  "phone": "5511999999999",
  "message": "Texto da mensagem"
}
```

### Enviar mensagem para grupo

```
POST https://api.z-api.io/instances/{INSTANCE_ID}/token/{INSTANCE_TOKEN}/send-text
Body:
{
  "phone": "{GROUP_ID}",       // ID do grupo WhatsApp
  "message": "Texto da mensagem"
}
```

### Listar grupos disponíveis

```
GET https://api.z-api.io/instances/{INSTANCE_ID}/token/{INSTANCE_TOKEN}/chats?page=1&pageSize=100
Headers:
  Client-Token: {CLIENT_TOKEN}
```

**Variáveis de ambiente necessárias:**
- `NEXT_PUBLIC_ZAPI_INSTANCE_ID`
- `NEXT_PUBLIC_ZAPI_INSTANCE_TOKEN`
- `NEXT_PUBLIC_ZAPI_CLIENT_TOKEN`

---

## 3. Firebase Firestore

**Configuração:** `src/firebase/config.ts`

### Padrão de leitura em tempo real

```typescript
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';

const unsubscribe = onSnapshot(
  query(collection(db, 'external-tickets'), where('status', '==', 'pendente')),
  (snapshot) => {
    const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTickets(tickets);
  }
);

// Cleanup no useEffect
return () => unsubscribe();
```

### Padrão de escrita

```typescript
import { addDoc, updateDoc, deleteDoc, doc, collection } from 'firebase/firestore';

// Criar
await addDoc(collection(db, 'external-tickets'), ticketData);

// Atualizar
await updateDoc(doc(db, 'external-tickets', ticketId), { status: 'concluído' });

// Deletar
await deleteDoc(doc(db, 'external-tickets', ticketId));
```

### Coleções e seus campos principais

**`users`**
```typescript
{
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'gerente' | 'encarregado' | 'tecnico' | 'vendedor';
  status: 'active' | 'inactive' | 'pending_invitation';
  sectorIds: string[];
  permissions: ModulePermissions;
  avatarUrl?: string;
  phone?: string;
  mobileNavPreferences?: MobileNavPreferences;
  createdAt: Timestamp;
}
```

**`external-tickets`**
```typescript
{
  id: string;
  title: string;
  description: string;
  status: 'pendente' | 'em andamento' | 'concluído' | 'cancelado';
  type: 'padrão' | 'contrato' | 'urgente' | 'agendado' | 'retorno';
  priority: 'baixa' | 'média' | 'alta' | 'urgente';
  clientId: string;
  sectorId: string;
  assignedTechnicianId?: string;
  scheduledDate?: Timestamp;
  slaHours?: number;
  slaExpiresAt?: Timestamp;
  checkInTime?: Timestamp;
  checkOutTime?: Timestamp;
  checklistId?: string;
  checklistState?: ChecklistTaskState[];
  technicalReport?: TechnicalReport;
  comments: Comment[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**`clients`**
```typescript
{
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address: Address;
  slaHours?: number;
  euroInfoId?: string;
  rondoId?: string;
  createdAt: Timestamp;
}
```

**`system-logs`**
```typescript
{
  id: string;
  type: 'ai_call' | 'ticket_created' | 'api_call' | 'user_action';
  description: string;
  userId: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
}
```

---

## 4. Firebase Storage

**Uso:** Upload de fotos em relatórios técnicos e checklists

```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase/config';

const storageRef = ref(storage, `tickets/${ticketId}/photos/${fileName}`);
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);
```

**Estrutura de paths:**
```
tickets/{ticketId}/photos/{fileName}     # Fotos de chamados
reports/{ticketId}/signatures/{fileName} # Assinaturas digitais
avatars/{userId}/{fileName}              # Fotos de perfil
```

---

## 5. Web Push Notifications

**Biblioteca:** `web-push` (server-side)  
**Serviço:** `src/lib/services/push-notification-service.ts`

### Registrar dispositivo

Chamado automaticamente pelo `PushBoot.tsx` quando usuário loga:

```typescript
// Salva token no Firestore
await addDoc(
  collection(db, 'users', userId, 'devices'),
  { token: subscriptionObject, createdAt: new Date() }
);
```

### Enviar notificação

```typescript
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:admin@euroinfo.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

await webpush.sendNotification(subscription, JSON.stringify({
  title: 'Novo chamado',
  body: 'Chamado #123 foi atribuído a você',
  icon: '/icon-192x192.png'
}));
```

**Gerar novas chaves VAPID:**
```bash
npm run generate-vapid-keys
```

---

## 6. Google Analytics 4

**Componente:** `src/components/google-analytics.tsx`  
**Variável:** `NEXT_PUBLIC_GA_ID` (ex: `G-XXXXXXXXXX`)

O componente é incluído no root layout e rastreia automaticamente page views via `gtag`.

---

## 7. Autenticação Firebase

```typescript
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import app from '@/firebase/config';
import { getAuth } from 'firebase/auth';

const auth = getAuth(app);

// Login
await signInWithEmailAndPassword(auth, email, password);

// Logout
await signOut(auth);
```

**Observação:** Não usar `getAuth()` diretamente em componentes — usar `useAuth()` hook.
