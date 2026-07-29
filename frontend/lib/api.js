function getApiBaseUrl() {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url || url.includes('example.com')) {
    return '';
  }
  return url;
}

export const API_BASE_URL = getApiBaseUrl();

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

  let response;
  const targetUrl = `${API_BASE_URL}${endpoint}`;
  try {
    response = await fetch(targetUrl, config);
  } catch (err) {
    const host = API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    throw new Error(`Cannot reach the API server at ${host}. ${err.message}`);
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
