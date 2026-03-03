import crypto from 'crypto';
import env from '../../config/env';

type PowensHttpMethod = 'GET' | 'POST';

type PowensRequestOptions = {
  path: string;
  method?: PowensHttpMethod;
  apiKey?: string;
  body?: unknown;
};

const buildUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, env.POWENS_API_URL).toString();
};

const encryptPayload = (payload: string) => {
  const publicKey = JSON.parse(env.POWENS_ENCRYPTION_PUBLIC_KEY);
  const keyObject = crypto.createPublicKey({
    key: Buffer.from(
      `-----BEGIN PUBLIC KEY-----\n${publicKey.n}\n-----END PUBLIC KEY-----`,
      'utf-8'
    ),
    format: 'pem'
  });

  return crypto.publicEncrypt(
    {
      key: keyObject,
      padding: crypto.constants.RSA_PKCS1_PADDING
    },
    Buffer.from(payload)
  ).toString('base64');
};

export const powensRequest = async <T = unknown>({
  path,
  method = 'GET',
  apiKey = env.POWENS_CONFIG_KEY,
  body
}: PowensRequestOptions): Promise<T> => {
  const url = buildUrl(path);
  const headers: Record<string, string> = {
    Authorization: `Token ${apiKey}`,
    'Content-Type': 'application/json'
  };

  const fetchOptions: RequestInit = {
    method,
    headers
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur Powens (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
};

export const powensEncryptedRequest = <T = unknown>({
  path,
  method = 'POST',
  payload
}: {
  path: string;
  method?: PowensHttpMethod;
  payload: unknown;
}) => {
  const encrypted = encryptPayload(JSON.stringify(payload));
  return powensRequest<T>({
    path,
    method,
    body: { data: encrypted }
  });
};


