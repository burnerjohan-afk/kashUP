import env from '../../config/env';

type HttpMethod = 'GET' | 'POST';

type RequestOptions = {
  path: string;
  method?: HttpMethod;
  body?: unknown;
};

const buildUrl = (path: string) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalized, env.DRIMIFY_API_URL).toString();
};

export const drimifyRequest = async <T = unknown>({ path, method = 'GET', body }: RequestOptions): Promise<T> => {
  const url = buildUrl(path);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.DRIMIFY_API_KEY}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Drimify error (${response.status}): ${error}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
};


