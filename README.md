# EuroInfo Suite

> Sistema de gerenciamento de serviços de campo com IA integrada, PWA e app Android nativo.

![Status](https://img.shields.io/badge/status-em%20produção-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-15.3.8-black)
![Firebase](https://img.shields.io/badge/Firebase-11.9.1-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

---

## O que é

O **EuroInfo Suite** é uma plataforma SaaS completa para gestão de equipes técnicas de campo. Permite que empresas de serviços gerenciem chamados de clientes, atendimentos internos, rotas de técnicos e manutenção preventiva — tudo em tempo real, com inteligência artificial e comunicação via WhatsApp.

**Principais funcionalidades:**
- Chamados externos (clientes) e atendimentos internos com workflow completo
- Otimização de rotas com Gemini AI
- Relatórios inteligentes gerados por IA
- Manutenção preventiva automatizada com notificações WhatsApp
- App Android nativo (Capacitor) + PWA instalável
- Dashboard em tempo real com métricas operacionais
- RBAC com 5 níveis de acesso

---

## Instalação Rápida

```bash
git clone <repo-url>
cd Sistema-funcional-01-2026
npm install
cp .env.example .env
# Preencha o .env com suas credenciais Firebase e Gemini
npm run dev
```

Acesse: **http://localhost:9002**

Login de desenvolvimento: `dev@nexus.com` / `123456`

Para configuração completa (Firebase, Z-API, push notifications, Android): [docs/SETUP.md](docs/SETUP.md)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15.3.8 (App Router) |
| UI | React 18 + shadcn/ui + Tailwind CSS |
| Banco de dados | Firebase Firestore (tempo real) |
| Autenticação | Firebase Auth |
| IA | Google Genkit + Gemini 2.5-Flash |
| Mobile | Capacitor 6 (Android) + PWA |
| Notificações | Z-API (WhatsApp) + Web Push |
| Relatórios | jsPDF + XLSX |

---

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Pré-requisitos, configuração passo a passo, variáveis de ambiente |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitetura, fluxos de dados, decisões técnicas |
| [docs/FEATURES.md](docs/FEATURES.md) | Lista completa de funcionalidades e status de cada uma |
| [docs/API.md](docs/API.md) | Server Actions (IA), integrações Firebase, Z-API, Web Push |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Padrões de código, como adicionar features, convenções |
| [CLAUDE.md](CLAUDE.md) | Memória do projeto para Claude Code (AI assistant) |

---

## Scripts

```bash
npm run dev          # Desenvolvimento (http://localhost:9002)
npm run build        # Build de produção
npm start            # Servidor de produção
npm run typecheck    # Verificar TypeScript
npm run lint         # Verificar ESLint
npm run genkit:dev   # UI de debug dos flows de IA
```

---

## Licença

Privado — uso interno EuroInfo.
