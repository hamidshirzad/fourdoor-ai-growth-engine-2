const AUTH0_DOMAIN = (process.env.AUTH0_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
export const AUTH0_CLIENT_ID = (process.env.AUTH0_CLIENT_ID || '').trim();
const AUTH0_CLIENT_SECRET = (process.env.AUTH0_CLIENT_SECRET || '').trim();

export function isAuth0Enabled() {
  return Boolean(AUTH0_DOMAIN && AUTH0_CLIENT_ID && AUTH0_CLIENT_SECRET);
}

function auth0Url(path) {
  if (!AUTH0_DOMAIN || !/^[a-z0-9.-]+$/i.test(AUTH0_DOMAIN)) throw new Error('Auth0 is not configured');
  return `https://${AUTH0_DOMAIN}${path}`;
}

export function getAuth0AuthorizationUrl({ redirectUri, state, codeChallenge }) {
  if (!isAuth0Enabled()) throw new Error('Auth0 is not configured');
  const url = new URL(auth0Url('/authorize'));
  url.search = new URLSearchParams({ response_type: 'code', client_id: AUTH0_CLIENT_ID, redirect_uri: redirectUri,
    scope: 'openid profile email', state, code_challenge: codeChallenge, code_challenge_method: 'S256' }).toString();
  return url.toString();
}

export async function authenticateWithAuth0Code({ code, redirectUri, codeVerifier }) {
  if (!isAuth0Enabled()) throw new Error('Auth0 is not configured');
  const tokenResponse = await fetch(auth0Url('/oauth/token'), {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET, code, redirect_uri: redirectUri, code_verifier: codeVerifier })
  });
  if (!tokenResponse.ok) throw new Error('Auth0 code exchange failed');
  const tokens = await tokenResponse.json();
  if (!tokens.access_token) throw new Error('Auth0 did not return an access token');
  const profileResponse = await fetch(auth0Url('/userinfo'), { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  if (!profileResponse.ok) throw new Error('Auth0 profile request failed');
  return profileResponse.json();
}
