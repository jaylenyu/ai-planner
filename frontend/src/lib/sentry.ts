const SENSITIVE_FIELD_NAMES = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'password',
  'token',
  'access_token',
  'accesstoken',
  'refresh_token',
  'refreshtoken',
  'accessToken',
  'refreshToken',
  'code',
]);

const SENSITIVE_QUERY_PARAM_PATTERN =
  /([?&](?:token|code|password|access_token|refresh_token|accessToken|refreshToken)=)([^&#\s]+)/gi;

function redactString(value: string) {
  return value.replace(SENSITIVE_QUERY_PARAM_PATTERN, '$1[Filtered]');
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => {
        if (SENSITIVE_FIELD_NAMES.has(key.toLowerCase())) {
          return [key, '[Filtered]'];
        }

        return [key, sanitizeValue(item)];
      }),
    );
  }

  return value;
}

export function sanitizeSentryEvent<T>(event: T): T {
  return sanitizeValue(event) as T;
}
