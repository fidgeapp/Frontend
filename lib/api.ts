/**
 * Fidge Backend API Client — Email Auth (Token-based)
 *
 * Auth uses a simple token stored in localStorage.
 * The token is sent as X-Auth-Token header on every authenticated request.
 * No cookies, no CORS session issues.
 */

const BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  'https://backend-production-app.up.railway.app/api';

// ── Token storage ─────────────────────────────────────────────────────────────

export const TokenStore = {
  get: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem('fidge_token') : null,
  set: (t: string) =>
    typeof window !== 'undefined' && localStorage.setItem('fidge_token', t),
  clear: () =>
    typeof window !== 'undefined' && localStorage.removeItem('fidge_token'),
};

// ── Core fetch ────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const url = `${BASE}/${cleanPath}`;
  const token = TokenStore.get();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['X-Auth-Token'] = token;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FidgeUser {
  id:               number;
  email:            string;
  username:         string;
  avatar_color:     string;
  points:           number;
  spin_points:      number;
  quest_points:     number;
  pcedo_earned:     number;
  gems:             number;
  referral_code:    string;
  referral_count:   number;
  active_skin:      string;
  email_verified:   boolean;
  energy:           number;
  ads_watched:      number;
  cooldown_seconds: number;
}

export interface FidgeSkin {
  id:         number;
  name:       string;
  rarity:     string;
  gem_cost:   number;
  shade:      string;
  image_url?: string | null;
  active:     boolean;
  is_default: boolean;
  owned?:     boolean;
  source?:    string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const Auth = {
  registerSendOtp: (data: { email: string; username: string; password: string; ref_code?: string }) =>
    apiFetch<any>('auth/register/send-otp', { method: 'POST', body: JSON.stringify(data) }),

  registerVerify: async (data: { email: string; username: string; password: string; otp: string; ref_code?: string }) => {
    const res = await apiFetch<any>('auth/register/verify', { method: 'POST', body: JSON.stringify(data) });
    if (res.token) TokenStore.set(res.token);
    return res;
  },

  login: async (data: { email: string; password: string }) => {
    const res = await apiFetch<any>('auth/login', { method: 'POST', body: JSON.stringify(data) });
    if (res.token) TokenStore.set(res.token);
    return res;
  },

  logout: async () => {
    await apiFetch<any>('auth/logout', { method: 'POST' }).catch(() => {});
    TokenStore.clear();
  },

  me: () => apiFetch<any>('auth/me'),
};

// ── Spinner ───────────────────────────────────────────────────────────────────

export const Spinner = {
  sync: (points_earned: number, energy_used: number) =>
    apiFetch<any>('spinner/sync', { method: 'POST', body: JSON.stringify({ points_earned, energy_used }) }),

  sessionEnd: (total_points: number, total_energy_used: number) =>
    apiFetch<any>('spinner/session-end', { method: 'POST', body: JSON.stringify({ total_points, total_energy_used }) }),

  watchAd: () =>
    apiFetch<any>('spinner/watch-ad', { method: 'POST' }),
};

// ── Wheel ─────────────────────────────────────────────────────────────────────

export const Wheel = {
  segments: () => apiFetch<any>('wheel/segments'),
  spin: ()     => apiFetch<any>('wheel/spin', { method: 'POST' }),
};

// ── Profile ───────────────────────────────────────────────────────────────────

export const Profile = {
  get: () => apiFetch<any>('profile'),

  convertPoints: (points: number) =>
    apiFetch<any>('profile/convert-points', { method: 'POST', body: JSON.stringify({ points }) }),

  setSkin: (skin_name: string) =>
    apiFetch<any>('profile/set-skin', { method: 'POST', body: JSON.stringify({ skin_name }) }),

  confirmQuest: (id: number) =>
    apiFetch<any>(`profile/quests/${id}/confirm`, { method: 'POST' }),

  withdrawPcedo: (amount: number, wallet_address: string) =>
    apiFetch<any>('profile/withdraw-pcedo', { method: 'POST', body: JSON.stringify({ amount, wallet_address }) }),

  myWithdrawals: () =>
    apiFetch<any>('profile/withdrawals'),

  deleteWithdrawal: (id: number) =>
    apiFetch<any>(`profile/withdrawals/${id}`, { method: 'DELETE' }),
};

// ── Shop ──────────────────────────────────────────────────────────────────────

export const Shop = {
  skins: ()              => apiFetch<any>('shop/skins'),
  purchase: (id: number) => apiFetch<any>(`shop/skins/${id}/purchase`, { method: 'POST' }),
};

// ── Leaderboard ───────────────────────────────────────────────────────────────

export const Leaderboard = {
  get: () => apiFetch<any>('leaderboard'),
};

// ── Coupons ───────────────────────────────────────────────────────────────────

export const Coupons = {
  redeem: (code: string) =>
    apiFetch<any>('coupons/redeem', { method: 'POST', body: JSON.stringify({ code }) }),
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const AdminTokenStore = {
  get: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem('fidge_admin_token') : null,
  set: (t: string) =>
    typeof window !== 'undefined' && localStorage.setItem('fidge_admin_token', t),
  clear: () =>
    typeof window !== 'undefined' && localStorage.removeItem('fidge_admin_token'),
};

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const url = `${BASE}/${cleanPath}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Admin-Token': AdminTokenStore.get() ?? '',
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

export const Admin = {
  /**
   * Step 1: call with username + password only → backend sends OTP, returns { requires_2fa: true }
   * Step 2: call again with username + password + otp + totp_code → returns { token }
   *
   * Uses raw fetch (not apiFetch) so that 202 is NOT treated as an error.
   */
  login: async (
    username: string,
    password: string,
    otp?: string,
    totp_code?: string,
  ) => {
    const res = await fetch(`${BASE}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        ...(otp       ? { otp }       : {}),
        ...(totp_code ? { totp_code } : {}),
      }),
    });

    const data = await res.json();

    // 202 = credentials valid, OTP email sent — not an error
    if (res.status === 202) return data;

    // 200 = fully authenticated — store token
    if (res.ok && data.token) {
      AdminTokenStore.set(data.token);
      return data;
    }

    // anything else is a real error
    throw new Error(data.error ?? `Login failed: ${res.status}`);
  },

  logout: () => { AdminTokenStore.clear(); },

  stats:        ()                       => adminFetch<any>('admin/stats'),
  users:        (page = 1, search = '')  => adminFetch<any>(`admin/users?page=${page}&search=${search}`),
  coupons:      (filter = '', search = '') => adminFetch<any>(`admin/coupons?filter=${filter}&search=${search}`),
  createCoupon: (data: unknown)          => adminFetch<any>('admin/coupons', { method: 'POST', body: JSON.stringify(data) }),
  toggleCoupon: (id: number)             => adminFetch<any>(`admin/coupons/${id}/toggle`, { method: 'PATCH' }),
  deleteCoupon: (id: number)             => adminFetch<any>(`admin/coupons/${id}`, { method: 'DELETE' }),
  banUser:      (id: number)             => adminFetch<any>(`admin/users/${id}/ban`, { method: 'PATCH' }),
};

// ── Marketplace ───────────────────────────────────────────────────────────────

export const Marketplace = {
  packages: () =>
    apiFetch<any>('marketplace/packages', { method: 'GET' }),

  initiate: (gem_amount: number) =>
    apiFetch<any>('marketplace/initiate', { method: 'POST', body: JSON.stringify({ gem_amount }) }),

  submitTx: (request_id: number, tx_hash: string) =>
    apiFetch<any>('marketplace/submit-tx', { method: 'POST', body: JSON.stringify({ request_id, tx_hash }) }),

  status: () =>
    apiFetch<any>('marketplace/status', { method: 'GET' }),
};
