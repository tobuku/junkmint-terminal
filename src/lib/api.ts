import { supabase } from './supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL!; // e.g. https://junkmint.com

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchConnectionToken(): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/org/stripe/terminal/connection-token`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch connection token: ${res.status} ${body}`);
  }
  const { secret } = await res.json();
  return secret;
}

export async function createPaymentIntent(amountCents: number, description?: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/org/stripe/terminal/create-payment-intent`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ amount: amountCents, description }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create payment intent: ${res.status} ${body}`);
  }
  return res.json() as Promise<{ clientSecret: string }>;
}
