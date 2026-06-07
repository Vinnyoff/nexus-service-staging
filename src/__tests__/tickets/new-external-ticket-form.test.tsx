import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewExternalTicketForm } from '@/components/external-tickets/new-external-ticket-form';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/firebase/config', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, name: string) => name),
  getDocs: vi.fn(async (ref: string) => {
    if (ref === 'sectors') {
      return {
        docs: [
          { id: 'sector-1', data: () => ({ name: 'Suporte TI', status: 'active', whatsappGroup: '' }) },
        ],
      };
    }
    return { docs: [] };
  }),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'u1', role: 'admin', sectorIds: ['sector-1'] },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/hooks/use-debounce', () => ({
  useDebounce: (v: unknown) => v,
}));

// Substitui Radix Select por <select> nativo para interação em JSDOM
vi.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange, value, children, disabled }: any) => (
    <select
      data-testid="native-select"
      onChange={(e) => onValueChange?.(e.target.value)}
      value={value ?? ''}
      disabled={disabled}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <option value="">{placeholder}</option>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

// Simplifica Popover (combobox de cliente usa portal que não funciona em JSDOM)
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderForm(overrides: {
  onFinished?: () => void;
  onSave?: () => Promise<void>;
} = {}) {
  const onFinished = overrides.onFinished ?? vi.fn();
  const onSave = overrides.onSave ?? vi.fn().mockResolvedValue(undefined);
  render(<NewExternalTicketForm onFinished={onFinished} onSave={onSave} />);
  return { onFinished, onSave };
}

async function fillStep1(clientName = 'Empresa ABC', description = 'Servidor fora do ar') {
  await userEvent.type(screen.getByPlaceholderText(/nome da empresa ou cliente/i), clientName);
  await userEvent.type(screen.getByPlaceholderText(/descreva o problema/i), description);
}

async function advanceToStep2() {
  await fillStep1();
  await userEvent.click(screen.getByRole('button', { name: /próximo/i }));
  await waitFor(() => screen.getByText(/informações de contato/i));
}

async function advanceToStep3() {
  await advanceToStep2();
  await userEvent.click(screen.getByRole('button', { name: /próximo/i }));
  // Usa getByRole('heading') porque o texto também aparece no indicador de steps
  await waitFor(() => screen.getByRole('heading', { name: /atribuição e agendamento/i }));
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('NewExternalTicketForm — renderização inicial', () => {
  it('exibe o step 1 ao abrir o formulário', async () => {
    renderForm();
    expect(screen.getByText(/informações do cliente e problema/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/nome da empresa ou cliente/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/descreva o problema/i)).toBeInTheDocument();
  });

  it('exibe os steps 1, 2 e 3 no indicador de progresso', () => {
    renderForm();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

describe('NewExternalTicketForm — validação do step 1', () => {
  it('exibe erro quando clientName está vazio ao avançar', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: /próximo/i }));
    await waitFor(() =>
      expect(screen.getByText(/o nome do cliente é obrigatório/i)).toBeInTheDocument(),
    );
  });

  it('exibe erro quando description está vazia ao avançar', async () => {
    renderForm();
    await userEvent.type(screen.getByPlaceholderText(/nome da empresa ou cliente/i), 'Empresa X');
    await userEvent.click(screen.getByRole('button', { name: /próximo/i }));
    await waitFor(() =>
      expect(screen.getByText(/a descrição é obrigatória/i)).toBeInTheDocument(),
    );
  });

  it('não avança para o step 2 com campos inválidos', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: /próximo/i }));
    await waitFor(() =>
      expect(screen.getByText(/informações do cliente e problema/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/informações de contato/i)).not.toBeInTheDocument();
  });
});

describe('NewExternalTicketForm — navegação entre steps', () => {
  it('avança para o step 2 com dados válidos no step 1', async () => {
    renderForm();
    await advanceToStep2();
    expect(screen.getByText(/informações de contato e endereço/i)).toBeInTheDocument();
  });

  it('avança para o step 3 a partir do step 2', async () => {
    renderForm();
    await advanceToStep3();
    expect(screen.getByRole('heading', { name: /atribuição e agendamento/i })).toBeInTheDocument();
  });

  it('volta ao step 1 ao clicar em "Anterior"', async () => {
    renderForm();
    await advanceToStep2();
    await userEvent.click(screen.getByRole('button', { name: /anterior/i }));
    await waitFor(() =>
      expect(screen.getByText(/informações do cliente e problema/i)).toBeInTheDocument(),
    );
  });
});

describe('NewExternalTicketForm — botão Cancelar', () => {
  it('chama onFinished ao clicar em Cancelar', async () => {
    const { onFinished } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });
});

describe('NewExternalTicketForm — submissão (step 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chama onSave com type "padrão" para chamado padrão', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSave });

    await advanceToStep3();

    // Seleciona o setor no select nativo (mockado)
    const selects = screen.getAllByTestId('native-select');
    await userEvent.selectOptions(selects[0], 'sector-1');

    await userEvent.click(screen.getByRole('button', { name: /salvar chamado/i }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'padrão' }),
      ),
    );
  });

  it('chama onSave com type "urgente" quando urgente está marcado', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSave });

    // Step 1: preenche campos e marca urgente
    await userEvent.type(screen.getByPlaceholderText(/nome da empresa ou cliente/i), 'Empresa XYZ');
    await userEvent.type(screen.getByPlaceholderText(/descreva o problema/i), 'Sistema caiu agora');
    await userEvent.click(screen.getByLabelText(/urgente/i));
    await userEvent.click(screen.getByRole('button', { name: /próximo/i }));
    await waitFor(() => screen.getByText(/informações de contato/i));

    // Step 2
    await userEvent.click(screen.getByRole('button', { name: /próximo/i }));
    await waitFor(() => screen.getByRole('heading', { name: /atribuição e agendamento/i }));

    // Step 3: seleciona setor
    const selects = screen.getAllByTestId('native-select');
    await userEvent.selectOptions(selects[0], 'sector-1');

    await userEvent.click(screen.getByRole('button', { name: /salvar chamado/i }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'urgente' }),
      ),
    );
  });

  it('chama onSave com type "contrato" quando contrato está marcado', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSave });

    // Step 1: desmarca padrão, marca contrato
    await userEvent.type(screen.getByPlaceholderText(/nome da empresa ou cliente/i), 'Cliente Contrato');
    await userEvent.type(screen.getByPlaceholderText(/descreva o problema/i), 'Manutenção preventiva mensal');
    await userEvent.click(screen.getByLabelText(/padrão/i));   // desmarca padrão
    await userEvent.click(screen.getByLabelText(/contrato/i)); // marca contrato
    await userEvent.click(screen.getByRole('button', { name: /próximo/i }));
    await waitFor(() => screen.getByText(/informações de contato/i));

    // Step 2
    await userEvent.click(screen.getByRole('button', { name: /próximo/i }));
    await waitFor(() => screen.getByRole('heading', { name: /atribuição e agendamento/i }));

    // Step 3
    const selects = screen.getAllByTestId('native-select');
    await userEvent.selectOptions(selects[0], 'sector-1');

    await userEvent.click(screen.getByRole('button', { name: /salvar chamado/i }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'contrato' }),
      ),
    );
  });

  it('inclui slaExpiresAt quando SLA customizado é definido', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSave });

    await advanceToStep3();

    const selects = screen.getAllByTestId('native-select');
    await userEvent.selectOptions(selects[0], 'sector-1');

    // Marca SLA customizado e preenche as horas
    await userEvent.click(screen.getByLabelText(/definir um sla customizado/i));
    await userEvent.type(screen.getByPlaceholderText(/ex: 4/i), '8');

    await userEvent.click(screen.getByRole('button', { name: /salvar chamado/i }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ slaExpiresAt: expect.any(String) }),
      ),
    );
  });
});
