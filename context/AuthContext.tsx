'use client';

/**
 * AuthContext — token-based auth.
 *
 * Security model for localStorage:
 * - 'fidge_token'  : auth token — safe to store (opaque, server validates it)
 * - 'fidge_user'   : display-only cache — NEVER used to credit points/energy/gems.
 *                    Sensitive reward fields (points, gems, pcedoEarned) are STRIPPED
 *                    before saving so DevTools manipulation cannot inflate them.
 * - 'fidge_energy' : energy cache for smooth UI between page loads. Energy is read
 *                    as a MINIMUM (Math.min with server value) on restore, so inflating
 *                    it in DevTools has no effect — the server always wins upward.
 *
 * On every page load, /auth/me is called to get fresh authoritative values from
 * the server, overwriting anything in localStorage.
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
  cooldownSeconds: number;
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

/**
 * Fields that are SAFE to cache locally (display / identity only).
 * Reward fields (points, gems, pcedoEarned, spinPoints, questPoints) are
 * intentionally excluded so DevTools manipulation has zero effect.
 */
interface SafeUserCache {
  loggedIn:    boolean;
  userId:      number | null;
  email:       string | null;
  username:    string | null;
  avatarColor: string | null;
  referralCode:string | null;
  activeSkin:  string;
}

function saveUser(s: AuthState) {
  try {
    // Only persist non-sensitive fields — reward values come from server only
    const safe: SafeUserCache = {
      loggedIn:    s.loggedIn,
      userId:      s.userId,
      email:       s.email,
      username:    s.username,
      avatarColor: s.avatarColor,
      referralCode:s.referralCode,
      activeSkin:  s.activeSkin,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(safe));
  } catch {}
}

function loadUser(): SafeUserCache | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw || !TokenStore.get()) return null;
    return JSON.parse(raw) as SafeUserCache;
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
  pcedoEarned: 0, gems: 0, energy: 100, adsWatched: 0, cooldownSeconds: 0,
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
    cooldownSeconds: u.cooldown_seconds ?? 0,
    referralCode: u.referral_code ?? null,
    activeSkin:   u.active_skin ?? 'Obsidian',
  };
}

/**
 * Merge persisted energy into server state.
 * Energy is taken as Math.min(persisted, server) — the server value wins
 * whenever the cached value is higher (i.e. user tried to inflate it in DevTools).
 */
function withPersistedEnergy(base: AuthState): AuthState {
  const p = loadPersistedEnergy();
  if (!p) return base;
  // Never let localStorage push energy ABOVE what the server reported
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
    // Paint from safe identity cache immediately — no reward values, no flash
    const cached = loadUser();
    if (cached?.loggedIn) {
      setState(prev => ({
        ...prev,
        loggedIn:    cached.loggedIn,
        userId:      cached.userId,
        email:       cached.email,
        username:    cached.username,
        avatarColor: cached.avatarColor,
        referralCode:cached.referralCode,
        activeSkin:  cached.activeSkin,
      }));
    }

    const token = TokenStore.get();
    if (!token) {
      setHydrated(true);
      return;
    }

    // Verify token and get authoritative values from server
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
    // Use server value directly — never blend with localStorage here
    cache(userToState(user));
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
