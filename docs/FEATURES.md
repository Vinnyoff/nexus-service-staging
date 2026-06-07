# Funcionalidades — EuroInfo Suite

## Legenda de Status

| Status | Descrição |
|---|---|
| ✅ Completo | Implementado e em produção |
| 🔄 Parcial | Implementado mas incompleto |
| ❌ Placeholder | UI criada mas sem lógica real |
| 📋 Planejado | Documentado mas não iniciado |

---

## 1. Autenticação e Controle de Acesso

**Status:** ✅ Completo

**Funcionalidades:**
- Login com email e senha (Firebase Auth)
- Redirecionamento automático para `/dashboard` após login
- Proteção de rotas (redirect para `/login` se não autenticado)
- Bloqueio de usuários inativos com logout automático
- 5 roles: `admin`, `gerente`, `encarregado`, `tecnico`, `vendedor`
- Permissões granulares por módulo (`ModulePermissions`)
- Sistema de convite por email (`accept-invitation`)
- Usuário master para desenvolvimento (`dev@nexus.com`)

**Arquivos:**
- `src/hooks/use-auth.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/accept-invitation/page.tsx`
- `src/lib/types.ts` (tipos `User`, `Role`, `ModulePermissions`)

---

## 2. Dashboard

**Status:** ✅ Completo

**Funcionalidades:**
- Métricas em tempo real via Firestore `onSnapshot`
- Filtros de período: hoje, esta semana, este mês, últimos N meses
- Cards de estatísticas: total de chamados, por status, por tipo
- Gráfico de visão geral (chamados ao longo do tempo)
- Gráfico de distribuição por status
- Estatísticas por setor
- Card de rotas ativas
- Card de localização da equipe
- Feed de atividade recente
- Lista de chamados recentes
- Dialog de boas-vindas (first-time)

**Arquivos:**
- `src/app/(app)/dashboard/page.tsx`
- `src/components/dashboard/`

---

## 3. Chamados Externos (Clientes)

**Status:** ✅ Completo

**Funcionalidades:**

*Gestão de chamados:*
- Criação de chamados com cliente, setor, técnico, prioridade, tipo
- Tipos: `padrão`, `contrato`, `urgente`, `agendado`, `retorno`
- Status workflow: `pendente` → `em andamento` → `concluído` / `cancelado`
- Atribuição e reatribuição de técnicos
- Agendamento de data/hora
- Filtros avançados: status, tipo, técnico, setor, data, prioridade
- Tabela com paginação e ordenação (TanStack Table)
- Cards para visualização mobile

*Operações de campo (técnico):*
- Check-in no chamado (registra horário e localização)
- Check-out ao finalizar (registra duração)
- Preenchimento de checklist durante atendimento
- Captura de fotos de evidência
- Relatório técnico com observações e fotos
- Assinatura digital do cliente (`signature-pad.tsx`)

*Comunicação:*
- Notificação WhatsApp ao setor quando chamado criado
- Notificação WhatsApp ao cliente
- Sistema de comentários e notas por chamado
- Rastreamento de SLA com alertas de expiração

**Arquivos:**
- `src/app/(app)/external-tickets/page.tsx`
- `src/app/(app)/external-tickets/[id]/page.tsx`
- `src/components/external-tickets/`

---

## 4. Atendimentos Internos

**Status:** ✅ Completo

**Funcionalidades:**
- CRUD de tarefas internas
- Status: `pendente`, `em andamento`, `concluído`, `cancelado`
- Prioridade com flag visual
- Atribuição por departamento
- Filtros e busca

**Arquivos:**
- `src/app/(app)/internal-tickets/page.tsx`
- `src/components/internal-tickets/`

---

## 5. Otimização de Rotas (IA)

**Status:** ✅ Completo

**Funcionalidades:**
- Seleção de chamados pendentes para incluir na rota
- Coleta da localização atual do técnico
- Envio para Genkit/Gemini 2.5-Flash
- Retorno de ordem otimizada com explicação em português
- Visualização da rota com endereços e chamados
- Reordenação manual pelo técnico (drag ou botões)
- Log de cada chamada AI no Firestore
- Salva ordem preferida do técnico no Firestore

**Arquivos:**
- `src/app/(app)/routes/page.tsx`
- `src/components/routes/route-optimizer.tsx`
- `src/components/routes/optimized-route-list.tsx`
- `src/ai/flows/optimize-technician-routes.ts`

---

## 6. Manutenção Preventiva

**Status:** ✅ Completo

**Funcionalidades:**
- Criação de contratos de serviço com frequência (semanal, mensal, trimestral, etc.)
- Checklists padrão por contrato
- Geração automática de chamados preventivos baseado na frequência
- Verificação de duplicatas (não cria se já existe chamado aberto)
- Notificação WhatsApp ao grupo do setor
- Tracking de `lastPreventiveDate` e próxima data prevista

**Arquivos:**
- `src/app/(app)/contracts/page.tsx`
- `src/components/contracts/`
- `src/lib/services/preventive-maintenance-service.ts`

---

## 7. Planejamento de Rotas Preventivas (IA)

**Status:** ✅ Completo

**Funcionalidades:**
- Lista de pontos de suporte a visitar
- Configuração de endereço inicial e período
- IA sugere agrupamento geográfico por dia
- Resumo em Markdown da lógica de planejamento
- Gestão de pontos de suporte (CRUD)

**Arquivos:**
- `src/app/(app)/planning/page.tsx`
- `src/components/planning/support-points-manager.tsx`
- `src/ai/flows/plan-preventive-routes.ts`

---

## 8. Relatórios

**Status:** ✅ Completo

**Sub-módulos:**

*Relatório Resumo (IA):*
- Análise de chamados por período
- Insights de tendências, padrões de problemas, produtividade
- Sugestões de melhoria geradas por IA
- Saída em Markdown renderizado
- Exportação PDF (jsPDF) e Excel (XLSX)

*Relatório Interativo (IA):*
- Interface de chat com dados dos chamados
- Perguntas e respostas sobre operações
- Histórico de conversa

*Relatório Geral:*
- Filtros de data e escopo de usuário
- Visualizações com Recharts

**Arquivos:**
- `src/app/(app)/reports/`
- `src/ai/flows/generate-ticket-report-summary.ts`
- `src/ai/flows/interactive-report-flow.ts`

---

## 9. Agenda / Calendário

**Status:** ✅ Completo

**Funcionalidades:**
- Visualização de chamados em calendário (React Big Calendar)
- Chamados agendados aparecem como eventos
- Criação e visualização de eventos de preventiva
- Filtros por técnico e setor

**Arquivos:**
- `src/app/(app)/schedule/page.tsx`

---

## 10. Rastreamento de Localização

**Status:** ✅ Completo

**Funcionalidades:**
- Visualização da localização em tempo real dos técnicos
- Filtros por técnico e setor
- Cards com endereço atual e chamado ativo
- Integração com Capacitor GPS no mobile

**Arquivos:**
- `src/app/(app)/location/page.tsx`
- `src/components/location/`

---

## 11. Histórico

**Status:** ✅ Completo

**Funcionalidades:**
- Histórico de rotas por técnico e data
- Histórico de chamados concluídos
- Filtros por período e técnico
- Visualização de rotas passadas com endereços

**Arquivos:**
- `src/app/(app)/history/page.tsx`
- `src/components/history/`

---

## 12. Gestão de Clientes

**Status:** ✅ Completo

**Funcionalidades:**
- CRUD completo de clientes
- Informações de contato e endereço
- Configuração de horas de SLA
- IDs de integração (EuroInfo, Rondo)
- Histórico de chamados por cliente
- Vinculação a contratos de serviço

**Arquivos:**
- `src/app/(app)/clients/page.tsx`
- `src/components/clients/`

---

## 13. Gestão de Técnicos

**Status:** ✅ Completo

**Funcionalidades:**
- CRUD de perfis de técnicos
- Vinculação ao usuário do sistema
- Atribuição a setores
- Status ativo/inativo
- Histórico de rotas por técnico
- Filtros avançados

**Arquivos:**
- `src/app/(app)/technicians/page.tsx`
- `src/components/technicians/`

---

## 14. Gestão de Usuários

**Status:** ✅ Completo

**Funcionalidades:**
- CRUD de usuários (admin only)
- Atribuição de roles
- Vinculação a setores
- Sistema de convite
- Ativação/desativação

**Arquivos:**
- `src/app/(app)/users/page.tsx`
- `src/components/technicians/users-table.tsx`

---

## 15. Setores

**Status:** ✅ Completo

**Funcionalidades:**
- CRUD de setores/departamentos
- Número WhatsApp ou grupo para notificações
- Vinculação de técnicos ao setor
- Estatísticas por setor no dashboard

**Arquivos:**
- `src/app/(app)/sectors/page.tsx`
- `src/components/sectors/`

---

## 16. Checklists

**Status:** ✅ Completo

**Funcionalidades:**
- CRUD de checklists de serviço
- Itens com fotos opcionais por tarefa
- Associação a contratos e setores
- Preenchimento durante atendimento com estado persistido

**Arquivos:**
- `src/app/(app)/checklists/page.tsx`
- `src/components/checklists/`

---

## 17. Monitoramento do Sistema

**Status:** ✅ Completo

**Funcionalidades:**
- Log de eventos em tempo real
- Tipos: AI calls, ticket creation, API calls (WhatsApp)
- Status de integrações (WhatsApp, Web Push)
- Filtros por tipo de evento e período

**Arquivos:**
- `src/app/(app)/monitoring/page.tsx`

---

## 18. Notificações

**Status:** ✅ Completo

**Funcionalidades:**
- Sino de notificações no topbar
- Notificações in-app armazenadas no Firestore
- Web Push para navegadores e PWA
- Notificações nativas Android via Capacitor
- Fallback: WhatsApp se push não disponível

**Arquivos:**
- `src/components/notification-bell.tsx`
- `src/components/push/PushBoot.tsx`
- `src/lib/services/notification-service.ts`
- `src/lib/services/push-notification-service.ts`

---

## 19. Configurações

| Sub-módulo | Status | Observação |
|---|---|---|
| Aparência (dark mode) | ✅ Completo | next-themes |
| Navegação mobile | ✅ Completo | Customização de atalhos |
| Segurança (senha, 2FA) | ❌ Placeholder | UI existe, sem lógica |
| Backup de dados | ❌ Placeholder | UI existe, sem lógica |

---

## 20. PWA e Mobile

**Status:** ✅ Completo

**Funcionalidades:**
- Instalável em mobile (manifest.json)
- Service worker com offline caching (next-pwa)
- App Android nativo via Capacitor
- Layout adaptativo (bottom nav em mobile)
- Customização de links no bottom nav

---

## Backlog / Features Futuras

| Feature | Prioridade | Descrição |
|---|---|---|
| Testes automatizados | Alta | Zero cobertura atualmente |
| Paginação Firestore | Alta | Carregar dados por chunks |
| Settings > Segurança | Média | Troca de senha real, 2FA |
| Settings > Backup | Média | Export/import de dados |
| App iOS | Baixa | Capacitor suporta, falta provisioning |
| Offline mode completo | Baixa | Sync quando volta à internet |
| Notificações por e-mail | Baixa | Alternativa ao WhatsApp |
