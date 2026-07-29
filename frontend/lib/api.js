// The API is a separate Express service — it is never same-origin with the
// frontend. Returning '' for an unset NEXT_PUBLIC_API_URL used to send every
// call to the Vercel deployment itself, where `/api/auth/login` does not exist,
// so a missing env var surfaced as an unexplained 404 ("API error") on the
// login form instead of a configuration problem. Keep this empty rather than
// guessing an origin, and let apiCall() name the real fault.
function getApiBaseUrl() {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url || url.includes('example.com')) {
    return '';
  }
  return url.replace(/\/+$/, '');
}

export const API_BASE_URL = getApiBaseUrl();

export const isApiConfigured = Boolean(API_BASE_URL);

const NOT_CONFIGURED_MESSAGE =
  'The API server address is not configured. Set NEXT_PUBLIC_API_URL to the deployed backend URL and redeploy the frontend.';

export async function apiCall(endpoint, method = 'GET', data = null, token = null) {
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  if (data && !isFormData) headers['Content-Type'] = 'application/json';

  const config = {
    method,
    headers,
    ...(data && { body: isFormData ? data : JSON.stringify(data) })
  };

  if (!isApiConfigured) {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  }

  let response;
  const targetUrl = `${API_BASE_URL}${endpoint}`;
  try {
    response = await fetch(targetUrl, config);
  } catch (err) {
    throw new Error(`Cannot reach the API server at ${API_BASE_URL}. ${err.message}`);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'API error' }));
    throw new Error(error.error || 'API error');
  }

  return response.json();
}

export function getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

export function setToken(token) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
}
