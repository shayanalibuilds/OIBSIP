const ACCESS_KEY = 'ovenly.accessToken';
const REFRESH_KEY = 'ovenly.refreshToken';

export const tokenStore = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function refreshTokens(): Promise<boolean> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    tokenStore.set(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, headers = {} } = opts;
  const url = `${BASE}${path}`;

  const doFetch = (token: string | null): Promise<Response> => {
    const h: Record<string, string> = { ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (auth && token) h['Authorization'] = `Bearer ${token}`;
    return fetch(url, {
      method,
      headers: h,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
  };

  let token = auth ? tokenStore.getAccess() : null;
  let res = await doFetch(token);

  // 401 -> try refresh once, then retry
  if (res.status === 401 && auth) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      token = tokenStore.getAccess();
      res = await doFetch(token);
    }
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.error?.message ?? `Request failed with ${res.status}`;
    const code = data?.error?.code;
    const details = data?.error?.details;
    // If we got an auth error after refresh attempt, clear tokens.
    if (res.status === 401) {
      tokenStore.clear();
    }
    throw new ApiError(res.status, msg, code, details);
  }

  return data as T;
}

export const api = {
  get: <T>(p: string, opts?: RequestOptions) => request<T>(p, { ...opts, method: 'GET' }),
  post: <T>(p: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(p, { ...opts, method: 'POST', body }),
  patch: <T>(p: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(p, { ...opts, method: 'PATCH', body }),
  del: <T>(p: string, opts?: RequestOptions) => request<T>(p, { ...opts, method: 'DELETE' }),
  base: BASE,
};

// ---- typed endpoints ----

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  emailVerified: boolean;
}

export interface CatalogItem {
  id: string;
  name: string;
  slug: string;
  category: 'base' | 'sauce' | 'cheese' | 'vegetable';
  priceMinor: number;
  price: number;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
}

export interface OrderPublic {
  id: string;
  status: 'received' | 'in_kitchen' | 'out_for_delivery' | 'delivered' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'failed' | 'refunded';
  priceMinor: number;
  price: number;
  quantity: number;
  base: { id: string; name: string; priceMinor: number };
  sauce: { id: string; name: string; priceMinor: number };
  cheese: { id: string; name: string; priceMinor: number };
  vegetables: { id: string; name: string; priceMinor: number }[];
  statusHistory: { status: string; at: string; note?: string }[];
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminInventoryItem {
  id: string;
  name: string;
  slug: string;
  category: 'base' | 'sauce' | 'cheese' | 'vegetable';
  priceMinor: number;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  isLow: boolean;
  lastNotifiedAt?: string | null;
  updatedAt: string;
}

export const apiAuth = {
  register: (input: { name: string; email: string; password: string }) =>
    api.post<{ user: UserPublic; message: string; etherealPreviewUrl?: string }>('/api/auth/register', input, {
      auth: false,
    }),
  verifyEmail: (input: { email: string; token: string }) =>
    api.post<{ user: UserPublic; message: string }>('/api/auth/verify-email', input, { auth: false }),
  login: (input: { email: string; password: string }) =>
    api.post<{ user: UserPublic; accessToken: string; refreshToken: string }>('/api/auth/login', input, {
      auth: false,
    }),
  forgotPassword: (input: { email: string }) =>
    api.post<{ message: string }>('/api/auth/forgot-password', input, { auth: false }),
  resetPassword: (input: { email: string; token: string; password: string }) =>
    api.post<{ message: string }>('/api/auth/reset-password', input, { auth: false }),
  logout: (input: { refreshToken: string }) =>
    api.post<{ ok: boolean }>('/api/auth/logout', input),
  me: () => api.get<{ user: UserPublic }>('/api/me'),
  adminLogin: (input: { email: string; password: string }) =>
    api.post<{ user: UserPublic; accessToken: string; refreshToken: string }>('/api/admin/login', input, {
      auth: false,
    }),
};

export const apiCatalog = {
  list: () => api.get<{ items: CatalogItem[] }>('/api/catalog'),
};

export const apiOrders = {
  create: (input: {
    baseId: string;
    sauceId: string;
    cheeseId: string;
    vegetableIds: string[];
    quantity: number;
  }) => api.post<{ order: OrderPublic }>('/api/orders', input),
  listMine: () => api.get<{ orders: OrderPublic[] }>('/api/orders'),
  get: (id: string) => api.get<{ order: OrderPublic }>(`/api/orders/${id}`),
};

export const apiPayments = {
  createRazorpayOrder: (orderId: string) =>
    api.post<{ razorpayOrderId: string; amount: number; currency: string; keyId: string; orderId: string }>(
      '/api/payments/razorpay/order',
      { orderId },
    ),
  verify: (input: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => api.post<{ orderId: string; status: string }>('/api/payments/razorpay/verify', input),
  devMock: (orderId: string) =>
    api.post<{ orderId: string; status: string; paymentId: string }>('/api/payments/dev/mock-success', {
      orderId,
    }),
};

export const apiAdmin = {
  listInventory: () => api.get<{ items: AdminInventoryItem[] }>('/api/admin/inventory'),
  patchInventory: (id: string, patch: Partial<AdminInventoryItem>) =>
    api.patch<{ item: AdminInventoryItem }>(`/api/admin/inventory/${id}`, patch),
  listOrders: (status?: string) =>
    api.get<{ orders: OrderPublic[] }>(`/api/admin/orders${status ? `?status=${status}` : ''}`),
  changeOrderStatus: (id: string, status: string, note?: string) =>
    api.patch<{ order: OrderPublic }>(`/api/admin/orders/${id}/status`, { status, note }),
};
