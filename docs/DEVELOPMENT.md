# Guia de Desenvolvimento — EuroInfo Suite

## Fluxo de Trabalho Recomendado

```
1. Criar branch a partir de main
2. npm run dev (porta 9002)
3. Desenvolver feature
4. npm run typecheck (verificar TypeScript)
5. npm run lint (verificar ESLint)
6. Testar manualmente no browser
7. Commit com mensagem descritiva
8. Pull request para main
```

---

## Estrutura de um Novo Módulo

Para adicionar um novo módulo ao sistema, siga este padrão:

### 1. Criar a página

```
src/app/(app)/nome-modulo/page.tsx
```

```tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/page-header';
import type { MeuTipo } from '@/lib/types';

export default function NomeModuloPage() {
  const { user } = useAuth();
  const [dados, setDados] = useState<MeuTipo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'minha-colecao'),
      (snapshot) => {
        setDados(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeuTipo)));
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader title="Nome do Módulo" description="Descrição do módulo" />
      {/* conteúdo */}
    </div>
  );
}
```

### 2. Adicionar tipos em `src/lib/types.ts`

```typescript
export interface MeuTipo {
  id: string;
  // campos...
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. Registrar na navegação em `src/lib/nav-items.ts`

```typescript
{
  href: '/nome-modulo',
  label: 'Nome do Módulo',
  icon: IconName,           // de lucide-react
  roles: ['admin', 'gerente'], // quais roles têm acesso
}
```

### 4. Criar componentes em `src/components/nome-modulo/`

Padrão de nomenclatura:
- `nome-modulo-table.tsx` — listagem em tabela
- `new-nome-modulo-form.tsx` — formulário de criação
- `edit-nome-modulo-form.tsx` — formulário de edição
- `nome-modulo-details.tsx` — visualização de detalhes
- `nome-modulo-filter-bar.tsx` — barra de filtros

---

## Padrão de Formulário com React Hook Form + Zod

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
});

type FormValues = z.infer<typeof formSchema>;

export function MeuForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: '', email: '' },
  });

  async function onSubmit(values: FormValues) {
    await addDoc(collection(db, 'minha-colecao'), {
      ...values,
      createdAt: new Date(),
    });
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Salvar
        </Button>
      </form>
    </Form>
  );
}
```

---

## Padrão de Dialog para CRUD

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button onClick={() => setIsOpen(true)}>Novo Item</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Criar Item</DialogTitle>
    </DialogHeader>
    <MeuForm onSuccess={() => setIsOpen(false)} />
  </DialogContent>
</Dialog>
```

---

## Criar um Flow de IA (Genkit)

Os flows ficam em `src/ai/flows/` e devem sempre ter `'use server'` no topo.

```typescript
'use server';

import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { db } from '@/firebase/config';
import { addDoc, collection } from 'firebase/firestore';

const InputSchema = z.object({
  dado: z.string(),
  userId: z.string(),
});

const OutputSchema = z.object({
  resultado: z.string(),
});

export async function meuFlow(input: z.infer<typeof InputSchema>) {
  const result = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: `Analise: ${input.dado}`,
    output: { schema: OutputSchema },
  });

  // Logar no Firestore
  await addDoc(collection(db, 'system-logs'), {
    type: 'ai_call',
    description: 'meu-flow executado',
    userId: input.userId,
    createdAt: new Date(),
  });

  return result.output!;
}
```

Para testar flows em isolamento:

```bash
npm run genkit:dev
# Acesse http://localhost:4000
# Selecione o flow, preencha o input, execute
```

---

## Controle de Acesso em Componentes

```tsx
import { useAuth } from '@/hooks/use-auth';

function MinhaFeature() {
  const { user } = useAuth();

  // Verificar role
  if (user?.role !== 'admin' && user?.role !== 'gerente') {
    return <p>Acesso negado</p>;
  }

  // Verificar permissão de módulo
  if (!user?.permissions?.externalTickets) {
    return null;
  }

  return <div>Conteúdo restrito</div>;
}
```

---

## Notificações

### Enviar notificação WhatsApp + Push

```typescript
import { sendNotification } from '@/lib/services/notification-service';

await sendNotification({
  phone: '5511999999999',       // número ou group ID
  message: 'Mensagem aqui',
  userId: 'user-id',            // para também enviar push
});
```

### Registrar dispositivo para push (já feito automaticamente pelo PushBoot)

```typescript
import { registerDevice } from '@/lib/services/push-notification-service';
await registerDevice(userId);
```

---

## Convenções de Commit

```
feat: adiciona módulo de relatórios por setor
fix: corrige SLA não sendo calculado para chamados urgentes
refactor: extrai lógica de filtros para hook customizado
docs: atualiza guia de setup
chore: atualiza dependências
```

---

## Verificações Antes de Commit

```bash
# TypeScript
npm run typecheck

# Lint
npm run lint

# Build (valida que o app compila)
npm run build
```

> **Nota:** `ignoreBuildErrors: true` faz o build passar mesmo com erros TS. Use `npm run typecheck` para ver os erros reais.

---

## Estrutura de Pastas Resumida

```
src/
├── ai/
│   ├── genkit.ts          # Inicialização Genkit — não modificar
│   ├── dev.ts             # Entry point dev — não modificar
│   └── flows/             # ← Adicionar novos flows aqui
├── app/
│   ├── (auth)/            # Rotas de auth — raramente modificar
│   └── (app)/             # ← Adicionar novas páginas aqui
├── components/
│   ├── ui/                # shadcn/ui — não modificar manualmente
│   └── [modulo]/          # ← Adicionar componentes aqui
├── firebase/
│   └── config.ts          # Não modificar — apenas importar db, storage
├── hooks/                 # ← Adicionar hooks customizados aqui
├── lib/
│   ├── types.ts           # ← Adicionar novos tipos aqui
│   ├── nav-items.ts       # ← Adicionar itens de nav aqui
│   └── services/          # ← Adicionar serviços aqui
└── ...
```

---

## Adicionando Componentes shadcn/ui

```bash
npx shadcn@latest add [component-name]
# Exemplos:
npx shadcn@latest add accordion
npx shadcn@latest add data-table
npx shadcn@latest add calendar
```

Os componentes são adicionados em `src/components/ui/` e podem ser customizados.

---

## Dark Mode

O tema é controlado por `next-themes`. Para usar corretamente:

```tsx
// Classes Tailwind com dark mode automático (via CSS variables)
<div className="bg-background text-foreground">
  <span className="text-muted-foreground">texto suave</span>
  <Button variant="default">usa bg-primary automaticamente</Button>
</div>
```

As variáveis CSS estão em `src/app/globals.css`. Evite usar cores fixas (`bg-white`, `text-gray-900`) para manter compatibilidade com dark mode.

---

## Testes (Estado Atual)

**Nenhum framework de teste está configurado.** Todo teste é manual.

Para adicionar testes no futuro, a recomendação seria:
- **Unit/Integration:** Vitest + React Testing Library
- **E2E:** Playwright

Por enquanto, valide manualmente os seguintes fluxos ao modificar código crítico:

1. Login/logout
2. Criar chamado externo
3. Atribuir técnico
4. Check-in/check-out
5. Dashboard atualiza em tempo real
6. Otimização de rota (se modificar flows AI)
