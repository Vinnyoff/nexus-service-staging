import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { getDoc } from 'firebase/firestore';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock('@/firebase/config', () => ({
  default: {},
  db: {},
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AuthStateCallback = (user: { uid: string } | null) => void | Promise<void>;

let triggerAuthState: AuthStateCallback = () => {};

function setupAuthStateListener() {
  vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
    triggerAuthState = callback as AuthStateCallback;
    return vi.fn();
  });
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

function makeFirestoreUser(overrides: Partial<{
  id: string; name: string; status: 'active' | 'inactive'; role: string;
}> = {}) {
  const base = { id: 'uid-1', name: 'João', email: 'joao@test.com', role: 'admin', status: 'active', sectorIds: [], permissions: {} };
  return { ...base, ...overrides };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAuth — login()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthStateListener();
  });

  it('retorna true e chama signInWithEmailAndPassword com sucesso', async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValueOnce({} as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.login('user@test.com', 'senha123');
    });

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'user@test.com',
      'senha123',
    );
    expect(success).toBe(true);
  });

  it('retorna false e exibe toast quando credenciais são inválidas', async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce(
      new Error('auth/wrong-password'),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.login('user@test.com', 'errada');
    });

    expect(success).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });
});

describe('useAuth — onAuthStateChanged (observer de sessão)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthStateListener();
  });

  it('define user no contexto quando usuário ativo existe no Firestore', async () => {
    const userData = makeFirestoreUser({ status: 'active' });
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      id: userData.id,
      data: () => userData,
    } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await triggerAuthState({ uid: userData.id });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user?.id).toBe(userData.id);
    expect(result.current.user?.name).toBe(userData.name);
  });

  it('faz signOut e exibe toast quando usuário está inativo', async () => {
    const userData = makeFirestoreUser({ status: 'inactive' });
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      id: userData.id,
      data: () => userData,
    } as any);
    vi.mocked(signOut).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await triggerAuthState({ uid: userData.id });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', title: 'Acesso Negado' }),
    );
  });

  it('faz signOut quando o documento do usuário não existe no Firestore', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false } as any);
    vi.mocked(signOut).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await triggerAuthState({ uid: 'uid-fantasma' });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
  });

  it('define user como null e para loading quando não há sessão ativa', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await triggerAuthState(null);
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('inicializa sectorIds como array vazio se o campo estiver ausente', async () => {
    const userData = makeFirestoreUser({ status: 'active' });
    const { sectorIds: _removed, ...withoutSectorIds } = userData as any;

    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      id: userData.id,
      data: () => withoutSectorIds,
    } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await triggerAuthState({ uid: userData.id });
    });

    await waitFor(() => expect(result.current.user).not.toBeNull());
    expect(result.current.user?.sectorIds).toEqual([]);
  });
});

describe('useAuth — logout()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthStateListener();
  });

  it('chama signOut e redireciona para /login', async () => {
    // Simula sessão ativa
    const userData = makeFirestoreUser({ status: 'active' });
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      id: userData.id,
      data: () => userData,
    } as any);
    vi.mocked(signOut).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await triggerAuthState({ uid: userData.id });
    });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.logout();
    });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(result.current.user).toBeNull();
  });

  it('não chama signOut para o usuário mock de desenvolvimento', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Injeta o usuário mock diretamente no contexto
    act(() => {
      result.current.setUser({ id: 'mock-admin-id', name: 'Dev', role: 'admin' } as any);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(signOut).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
