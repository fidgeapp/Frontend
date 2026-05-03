'use client';

/**
 * AuthContext — token-based auth.
 *
 * On login/register: backend returns a token → stored in localStorage as 'fidge_token'
 * On every request: token sent as X-Auth-Token header (handled by api.ts)
 * On mount: if token exists in localStorage, call /auth/me to restore session
 * On logout: token deleted from localStorage + invalidated on server
 */

import {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from 'react';
import { Auth, TokenStore, Spinner as SpinnerApi, type FidgeUser } from '@/lib/api';

// ── State ─────────────────────────────────────────────────────────────────────

interface AuthState {
  loggedIn:     boolean;
  userId:       number | null;
  email:        string | null;
  username:     string | null;
  avatarColor:  string | null;
  points:       number;
  spinPoints:   number;
  questPoints:  number;
  pcedoEarned:  number;
  gems:         number;
  energy:       number;
  adsWatched:   number;
  referralCode: string | null;
  activeSkin:   string;
}

export interface AuthContextType extends AuthState {
  hydrated:          boolean;
  loading:           boolean;
  error:             string | null;
  login:             (user: FidgeUser) => void;
  logout:            () => Promise<void>;
  clearError:        () => void;
  syncSpinner:       (pointsEarned: number, energyUsed: number) => Promise<{ energy: number; points: number }>;
  watchAd:           () => Promise<{ energy: number; ads_watched: number; cooldown_seconds: number }>;
  applyUserPatch:    (patch: Partial<FidgeUser & { active_skin: string }>) => void;
  persistEnergy:     (energy: number, adsWatched: number) => void;
  refreshFromServer: () => Promise<void>;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const USER_KEY   = 'fidge_user';
const ENERGY_KEY = 'fidge_energy';

function saveUser(s: AuthState) {
  try { localStorage.setItem(USER_KEY, JSON.stringify(s)); } catch {}
}
function loadUser(): AuthState | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    // Only use cache if a token also exists
    if (!raw || !TokenStore.get()) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function clearUser() {
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ENERGY_KEY);
  } catch {}
}

export function loadPersistedEnergy(): { energy: number; adsWatched: number; cooldownUntil: number } | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(ENERGY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.date !== new Date().toDateString()) {
      localStorage.removeItem(ENERGY_KEY);
      return null;
    }
    return {
      energy:        Number(parsed.energy),
      adsWatched:    Number(parsed.adsWatched),
      cooldownUntil: Number(parsed.cooldownUntil ?? 0),
    };
  } catch { return null; }
}

export function saveEnergyCache(energy: number, adsWatched: number, cooldownUntil = 0) {
  try {
    localStorage.setItem(ENERGY_KEY, JSON.stringify({
      energy, adsWatched, cooldownUntil, date: new Date().toDateString(),
    }));
  } catch {}
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const EMPTY: AuthState = {
  loggedIn: false, userId: null, email: null, username: null,
  avatarColor: null, points: 0, spinPoints: 0, questPoints: 0,
  pcedoEarned: 0, gems: 0, energy: 100, adsWatched: 0,
  referralCode: null, activeSkin: 'Obsidian',
};

function userToState(u: FidgeUser): AuthState {
  return {
    loggedIn:     true,
    userId:       u.id,
    email:        u.email,
    username:     u.username,
    avatarColor:  u.avatar_color,
    points:       u.points,
    spinPoints:   u.spin_points,
    questPoints:  u.quest_points,
    pcedoEarned:  u.pcedo_earned,
    gems:         u.gems,
    energy:       u.energy,
    adsWatched:   u.ads_watched,
    referralCode: u.referral_code ?? null,
    activeSkin:   u.active_skin ?? 'Obsidian',
  };
}

function withPersistedEnergy(base: AuthState): AuthState {
  const p = loadPersistedEnergy();
  if (!p) return base;
  return { ...base, energy: Math.min(p.energy, base.energy), adsWatched: p.adsWatched };
}

// ── Context ───────────────────────────────────────────────────────────────────

const Ctx = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state,    setState]    = useState<AuthState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const cache = useCallback((s: AuthState) => {
    setState(s);
    if (s.loggedIn) saveUser(s); else clearUser();
  }, []);

  // ── Mount: restore session from token ─────────────────────────────────────
  useEffect(() => {
    // Paint from cache immediately — no flash
    const cached = loadUser();
    if (cached) setState(cached);

    const token = TokenStore.get();
    if (!token) {
      setHydrated(true);
      return;
    }

    // Verify token is still valid with server
    Auth.me()
      .then(({ user }) => cache(withPersistedEnergy(userToState(user))))
      .catch(() => {
        TokenStore.clear();
        clearUser();
        setState(EMPTY);
      })
      .finally(() => setHydrated(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback((user: FidgeUser) => {
    cache(withPersistedEnergy(userToState(user)));
  }, [cache]);

  const logout = useCallback(async () => {
    await Auth.logout();
    clearUser();
    setState(EMPTY);
  }, []);

  const refreshFromServer = useCallback(async () => {
    const { user } = await Auth.me();
    cache(withPersistedEnergy(userToState(user)));
  }, [cache]);

  const syncSpinner = useCallback(async (pointsEarned: number, energyUsed: number) => {
    const res = await SpinnerApi.sync(pointsEarned, energyUsed);
    setState(prev => {
      const next = { ...prev, points: res.points, spinPoints: res.spin_points };
      saveUser(next);
      return next;
    });
    return { energy: res.energy, points: res.points };
  }, []);

  const watchAd = useCallback(async () => {
    const res = await SpinnerApi.watchAd();
    // If backend says there's a cooldown, compute and persist the exact end timestamp
    const cooldownUntil = res.cooldown_seconds > 0
      ? Date.now() + res.cooldown_seconds * 1000
      : 0;
    saveEnergyCache(res.energy, res.ads_watched, cooldownUntil);
    setState(prev => {
      const next = { ...prev, energy: res.energy, adsWatched: res.ads_watched };
      saveUser(next);
      return next;
    });
    return res;
  }, []);

  const persistEnergy = useCallback((energy: number, adsWatched: number) => {
    saveEnergyCache(energy, adsWatched);
    setState(prev => {
      const next = { ...prev, energy, adsWatched };
      saveUser(next);
      return next;
    });
  }, []);

  const applyUserPatch = useCallback((patch: Partial<FidgeUser & { active_skin: string }>) => {
    setState(prev => {
      const next: AuthState = {
        ...prev,
        ...(patch.points       != null && { points:      patch.points }),
        ...(patch.spin_points  != null && { spinPoints:  patch.spin_points }),
        ...(patch.quest_points != null && { questPoints: patch.quest_points }),
        ...(patch.pcedo_earned != null && { pcedoEarned: patch.pcedo_earned }),
        ...(patch.gems         != null && { gems:        patch.gems }),
        ...(patch.energy       != null && { energy:      patch.energy }),
        ...(patch.ads_watched  != null && { adsWatched:  patch.ads_watched }),
        ...(patch.active_skin  != null && { activeSkin:  patch.active_skin }),
      };
      saveUser(next);
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{
      ...state, hydrated, loading, error,
      login, logout,
      clearError: () => setError(null),
      syncSpinner, watchAd, persistEnergy, applyUserPatch,
      refreshFromServer,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
