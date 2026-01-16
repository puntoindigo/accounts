import crypto from 'crypto';

export interface EmbedTokenPayload {
  email: string;
  name: string | null;
  isAdmin: boolean;
  iat: number;
  exp: number;
}

const toBase64Url = (input: Buffer | string) => {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const fromBase64Url = (input: string) => {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = padded.length % 4 ? 4 - (padded.length % 4) : 0;
  return Buffer.from(padded + '='.repeat(padLength), 'base64').toString('utf8');
};

export const signEmbedToken = (payload: EmbedTokenPayload, secret: string) => {
  const body = toBase64Url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret).update(body).digest();
  return `${body}.${toBase64Url(signature)}`;
};

export const verifyEmbedToken = (token: string, secret: string) => {
  const [body, signature] = token.split('.');
  if (!body || !signature) {
    return null;
  }
  const expected = toBase64Url(crypto.createHmac('sha256', secret).update(body).digest());
  if (expected !== signature) {
    return null;
  }
  try {
    const payload = JSON.parse(fromBase64Url(body)) as EmbedTokenPayload;
    if (!payload?.email || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};
