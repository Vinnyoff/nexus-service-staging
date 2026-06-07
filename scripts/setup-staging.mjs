/**
 * Script de setup do ambiente de homologação (staging).
 * Cria o usuário admin no Firebase Auth e o documento correspondente no Firestore.
 *
 * Uso:
 *   node scripts/setup-staging.mjs
 *
 * Requer o arquivo .env.staging preenchido com as credenciais do projeto staging.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Lê as variáveis do .env.staging ──────────────────────────────────────────

function loadEnvStaging() {
  const envPath = resolve(__dirname, '..', '.env.staging');
  const raw = readFileSync(envPath, 'utf-8');
  const vars = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    vars[key] = value;
  }
  return vars;
}

const env = loadEnvStaging();
const API_KEY    = env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PROJECT_ID = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!API_KEY || !PROJECT_ID) {
  console.error('❌  Preencha NEXT_PUBLIC_FIREBASE_API_KEY e NEXT_PUBLIC_FIREBASE_PROJECT_ID no .env.staging');
  process.exit(1);
}

// ── Admin user a ser criado ───────────────────────────────────────────────────

const ADMIN_EMAIL    = 'admin@euroinfo-staging.com';
const ADMIN_PASSWORD = 'Admin@Staging123';
const ADMIN_NAME     = 'Administrador Staging';

// ── Firebase Auth REST API ────────────────────────────────────────────────────

async function createAuthUser(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (data?.error?.message === 'EMAIL_EXISTS') {
      console.log('⚠️  Usuário já existe no Auth. Fazendo login para obter o UID...');
      return signInUser(email, password);
    }
    throw new Error(`Auth error: ${JSON.stringify(data?.error)}`);
  }
  return data; // { localId, idToken, ... }
}

async function signInUser(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Sign-in error: ${JSON.stringify(data?.error)}`);
  return data;
}

// ── Firestore REST API ────────────────────────────────────────────────────────

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean')  return { booleanValue: val };
  if (typeof val === 'number')   return { integerValue: String(val) };
  if (typeof val === 'string')   return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return { fields };
}

async function upsertFirestoreDoc(collection, docId, data, idToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(toFirestoreDoc(data)),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(`Firestore error: ${JSON.stringify(result?.error)}`);
  return result;
}

// ── Documento do usuário admin ────────────────────────────────────────────────

function buildAdminUserDoc(uid, email, name) {
  const allPermissions = {
    dashboard: true, externalTickets: true, internalTickets: true,
    routes: true, location: true, planning: true, history: true,
    reports: true, clients: true, contracts: true, technicians: true,
    users: true, sectors: true, checklists: true, monitoring: true,
    settings: true, schedule: true,
  };

  return {
    id: uid,
    name,
    email,
    role: 'admin',
    status: 'active',
    sectorIds: [],
    permissions: allPermissions,
    createdAt: new Date().toISOString(),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚀  Setup do ambiente de staging (projeto: ${PROJECT_ID})\n`);

  // 1. Criar/recuperar usuário admin no Auth
  console.log(`📧  Criando usuário admin: ${ADMIN_EMAIL}`);
  let authUser;
  try {
    authUser = await createAuthUser(ADMIN_EMAIL, ADMIN_PASSWORD);
  } catch (err) {
    if (err.message.includes('OPERATION_NOT_ALLOWED')) {
      console.error('\n❌  Email/Password sign-in não está habilitado no projeto staging.');
      console.error('    Acesse: Firebase Console → Authentication → Sign-in method → Email/Password → Habilitar\n');
      process.exit(1);
    }
    throw err;
  }

  const uid = authUser.localId;
  const idToken = authUser.idToken;
  console.log(`✅  Usuário criado! UID: ${uid}\n`);

  // 2. Criar documento na coleção users
  console.log(`📄  Criando documento em Firestore: users/${uid}`);
  const userDoc = buildAdminUserDoc(uid, ADMIN_EMAIL, ADMIN_NAME);
  await upsertFirestoreDoc('users', uid, userDoc, idToken);
  console.log(`✅  Documento criado!\n`);

  // 3. Resumo
  console.log('─'.repeat(50));
  console.log('✅  Setup concluído!');
  console.log('');
  console.log('  Credenciais do admin de staging:');
  console.log(`  Email:  ${ADMIN_EMAIL}`);
  console.log(`  Senha:  ${ADMIN_PASSWORD}`);
  console.log('');
  console.log('  Para acessar o ambiente:');
  console.log('  npm run dev:staging  →  http://localhost:9003');
  console.log('─'.repeat(50));
}

main().catch(err => {
  console.error('\n❌  Erro durante o setup:', err.message);
  process.exit(1);
});
