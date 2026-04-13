import crypto from 'crypto';

const BASE_URL = process.env.TUYA_BASE_URL ?? 'https://openapi.tuyaeu.com';
const CLIENT_ID = process.env.TUYA_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET ?? '';

interface TuyaToken {
  access_token: string;
  expire_time: number;
  refresh_token: string;
  uid: string;
}

// In-memory token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function hmacSha256(secret: string, content: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(content)
    .digest('hex')
    .toUpperCase();
}

function buildSign(
  clientId: string,
  secret: string,
  timestamp: string,
  nonce: string,
  accessToken: string,
  method: string,
  path: string,
  body: string = '',
): string {
  const contentHash = sha256(body);
  const stringToSign = [method, contentHash, '', path].join('\n');
  const signStr = clientId + accessToken + timestamp + nonce + stringToSign;
  return hmacSha256(secret, signStr);
}

function buildHeaders(
  accessToken: string,
  method: string,
  path: string,
  body: string = '',
): Record<string, string> {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const sign = buildSign(
    CLIENT_ID,
    CLIENT_SECRET,
    timestamp,
    nonce,
    accessToken,
    method,
    path,
    body,
  );

  return {
    'client_id': CLIENT_ID,
    'sign': sign,
    'sign_method': 'HMAC-SHA256',
    't': timestamp,
    'nonce': nonce,
    'access_token': accessToken,
    'Content-Type': 'application/json',
  };
}

async function getToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const path = '/v1.0/token?grant_type=1';
  const timestamp = now.toString();
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const sign = buildSign(
    CLIENT_ID,
    CLIENT_SECRET,
    timestamp,
    nonce,
    '',
    'GET',
    path,
  );

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      'client_id': CLIENT_ID,
      'sign': sign,
      'sign_method': 'HMAC-SHA256',
      't': timestamp,
      'nonce': nonce,
    },
  });

  const data = await response.json() as { success: boolean; result: TuyaToken; msg?: string };

  if (!data.success) {
    throw new Error(`Tuya auth failed: ${data.msg ?? 'Unknown error'}`);
  }

  cachedToken = {
    token: data.result.access_token,
    expiresAt: now + data.result.expire_time * 1000,
  };

  return cachedToken.token;
}

export async function tuyaSwitchOn(deviceId: string): Promise<void> {
  const token = await getToken();
  const path = `/v1.0/devices/${deviceId}/commands`;
  const body = JSON.stringify({
    commands: [{ code: 'switch_1', value: true }],
  });

  const headers = buildHeaders(token, 'POST', path, body);

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body,
  });

  const data = await response.json() as { success: boolean; msg?: string };
  if (!data.success) {
    throw new Error(`Tuya switch on failed: ${data.msg ?? 'Unknown error'}`);
  }
}

export async function tuyaSwitchOff(deviceId: string): Promise<void> {
  const token = await getToken();
  const path = `/v1.0/devices/${deviceId}/commands`;
  const body = JSON.stringify({
    commands: [{ code: 'switch_1', value: false }],
  });

  const headers = buildHeaders(token, 'POST', path, body);

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body,
  });

  const data = await response.json() as { success: boolean; msg?: string };
  if (!data.success) {
    throw new Error(`Tuya switch off failed: ${data.msg ?? 'Unknown error'}`);
  }
}

export async function tuyaGetStatus(deviceId: string): Promise<{
  online: boolean;
  switchOn: boolean;
}> {
  try {
    const token = await getToken();
    const path = `/v1.0/devices/${deviceId}/status`;
    const headers = buildHeaders(token, 'GET', path);

    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json() as {
      success: boolean;
      result?: Array<{ code: string; value: unknown }>;
    };

    if (!data.success || !data.result) {
      return { online: false, switchOn: false };
    }

    const switchStatus = data.result.find((s) => s.code === 'switch_1');
    return {
      online: true,
      switchOn: switchStatus?.value === true,
    };
  } catch {
    return { online: false, switchOn: false };
  }
}
