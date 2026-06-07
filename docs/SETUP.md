# Setup — EuroInfo Suite

## Pré-requisitos

| Requisito | Versão mínima | Verificar |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| npm | 10+ | `npm --version` |
| Git | qualquer | `git --version` |
| Conta Firebase | — | console.firebase.google.com |
| Conta Google AI Studio | — | aistudio.google.com (para Gemini) |
| Conta Z-API | — | z-api.io (para WhatsApp, opcional) |

---

## 1. Clonar e Instalar

```bash
git clone <repo-url>
cd Sistema-funcional-01-2026
npm install
```

> O `npm install` executa automaticamente `patch-package` via `postinstall`.

---

## 2. Configurar Firebase

### 2.1 Criar projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **Add project**
3. Escolha um nome (ex: `euroinfo-suite`)
4. Habilite ou desabilite Google Analytics conforme preferência
5. Clique em **Create project**

### 2.2 Habilitar Authentication

1. No menu esquerdo: **Build → Authentication**
2. Clique em **Get started**
3. Na aba **Sign-in method**, habilite **Email/Password**

### 2.3 Criar banco Firestore

1. No menu esquerdo: **Build → Firestore Database**
2. Clique em **Create database**
3. Escolha **Start in production mode** (recomendado) ou test mode
4. Selecione uma região próxima (ex: `us-east1` ou `southamerica-east1`)

### 2.4 Criar Firebase Storage

1. No menu esquerdo: **Build → Storage**
2. Clique em **Get started**
3. Use as regras padrão inicialmente

### 2.5 Registrar app web

1. No Overview do projeto, clique no ícone `</>` (web)
2. Dê um nome ao app (ex: `EuroInfo Web`)
3. Copie o objeto `firebaseConfig` exibido

---

## 3. Configurar Variáveis de Ambiente

Copie o arquivo exemplo:

```bash
cp .env.example .env
```

Preencha o `.env` com os valores reais:

```bash
# Firebase — valores do firebaseConfig copiado no passo 2.5
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Google AI — obtenha em aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSy...

# Z-API WhatsApp — opcional, obtenha em app.z-api.io
NEXT_PUBLIC_ZAPI_INSTANCE_ID=
NEXT_PUBLIC_ZAPI_INSTANCE_TOKEN=
NEXT_PUBLIC_ZAPI_CLIENT_TOKEN=

# Google Analytics — opcional, obtenha no GA4
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Web Push — gere com: npm run generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BF...
VAPID_PRIVATE_KEY=...
```

### Gerar chaves VAPID (para push notifications)

```bash
npm run generate-vapid-keys
# Copie as chaves geradas para o .env
```

---

## 4. Criar Usuário Administrador Inicial

### Opção A — Usuário de desenvolvimento (sem Firebase)

O sistema possui um usuário master hardcoded para desenvolvimento:
- **Email:** `dev@nexus.com`
- **Senha:** `123456`

Este usuário tem acesso total e não requer Firebase configurado. Use apenas em desenvolvimento.

### Opção B — Usuário real no Firebase

1. No console Firebase, vá em **Authentication → Users**
2. Clique em **Add user**
3. Informe email e senha do administrador
4. Copie o UID gerado

Depois, no Firestore, crie um documento na coleção `users` com o UID como ID:

```json
{
  "name": "Administrador",
  "email": "admin@suaempresa.com",
  "role": "admin",
  "status": "active",
  "sectorIds": [],
  "permissions": {
    "dashboard": true,
    "externalTickets": true,
    "internalTickets": true,
    "routes": true,
    "location": true,
    "planning": true,
    "history": true,
    "reports": true,
    "clients": true,
    "contracts": true,
    "technicians": true,
    "users": true,
    "sectors": true,
    "checklists": true,
    "monitoring": true,
    "settings": true,
    "schedule": true
  },
  "createdAt": "<timestamp atual>"
}
```

---

## 5. Rodar em Desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:9002](http://localhost:9002)

> A porta padrão é **9002**, não 3000.

---

## 6. Configurar Z-API (WhatsApp) — Opcional

1. Crie conta em [app.z-api.io](https://app.z-api.io)
2. Crie uma instância
3. Escaneie o QR Code com o WhatsApp desejado
4. Copie o **Instance ID**, **Instance Token** e **Client Token** para o `.env`
5. Teste acessando o endpoint de status da instância

> Sem Z-API configurado, as notificações WhatsApp simplesmente não serão enviadas (sem erro crítico).

---

## 7. Configurar Google AI (Gemini)

1. Acesse [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Clique em **Create API Key**
3. Copie a chave para `GEMINI_API_KEY` no `.env`

Para testar os flows de IA separadamente:

```bash
npm run genkit:dev
# Abre a UI do Genkit em http://localhost:4000
```

> Sem Gemini configurado, as funcionalidades de IA (otimização de rotas, relatórios AI) falharão com erro.

---

## 8. Build para Produção

```bash
npm run build
npm start
```

> **Atenção:** O build ignora erros TypeScript e ESLint (`ignoreBuildErrors: true`). Mesmo com warnings, o build completa.

---

## 9. App Android (Capacitor)

### Pré-requisitos adicionais

- Android Studio instalado
- JDK 17+
- Android SDK configurado

### Build Android

```bash
# 1. Build web primeiro
npm run build

# 2. Sync com Capacitor
npx cap sync android

# 3. Abrir no Android Studio
npx cap open android

# 4. No Android Studio: Build → Generate Signed Bundle/APK
```

**Configuração do app:** `capacitor.config.ts`
```typescript
{
  appId: 'com.nexusservice.app',
  appName: 'Nexus Service',
  webDir: 'out'  // ou 'build' dependendo da config
}
```

---

## 10. Verificação Final

Após o setup, verifique que o seguinte funciona:

- [ ] Login com usuário de dev (`dev@nexus.com` / `123456`)
- [ ] Dashboard carrega (sem erro de Firebase)
- [ ] Criar um chamado externo
- [ ] Chamado aparece no dashboard em tempo real
- [ ] Otimização de rota (requer GEMINI_API_KEY)
- [ ] Notificações push (requer VAPID keys configuradas)
- [ ] WhatsApp (requer Z-API configurado)

---

## Problemas Comuns

**Erro: Firebase: Error (auth/invalid-api-key)**
→ Verifique `NEXT_PUBLIC_FIREBASE_API_KEY` no `.env`

**Erro: Firestore permission denied**
→ Verifique as regras no Firebase Console > Firestore > Rules

**AI flows retornam erro**
→ Verifique `GEMINI_API_KEY` no `.env` e quota da API

**Porto 9002 ocupado**
→ Edite `package.json`: `"dev": "next dev --turbopack -p OUTRAPORTA"`

**`patch-package` falha no install**
→ Execute `npm install` novamente; se persistir, delete `node_modules` e reinstale
