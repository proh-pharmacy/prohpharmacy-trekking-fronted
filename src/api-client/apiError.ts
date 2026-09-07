import axios from 'axios';

export interface ApiError {
  code: string;
  message: string;
}

/**
 * Robust extractor for backend ApiError { code: string, message: string }
 * Conforms to 00-api-conventions.md
 */
export function getApiError(error: unknown): ApiError | null {
  if (!error || typeof error !== 'object') return null;

  // Check axios or generic response with data
  const errObj = error as {
    isAxiosError?: boolean;
    response?: {
      data?: unknown;
      status?: number;
    };
    message?: string;
  };

  const data = errObj.response?.data;

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;

    // 1. Standard shape: { code: "400" | 400, message: "Invalid email or password." }
    if (typeof record.message === 'string' && record.message.trim().length > 0) {
      return {
        code: record.code ? String(record.code) : String(errObj.response?.status || '400'),
        message: record.message,
      };
    }

    // 2. ASP.NET / RFC 7807 ProblemDetails fallback: { title: "..." }
    if (typeof record.title === 'string' && record.title.trim().length > 0) {
      return {
        code: String(record.status || errObj.response?.status || '400'),
        message: record.title,
      };
    }

    // 3. Validation errors map: { errors: { Email: ["..."] } }
    if (record.errors && typeof record.errors === 'object') {
      const errorMap = record.errors as Record<string, string[] | string>;
      const firstKey = Object.keys(errorMap)[0];
      if (firstKey) {
        const val = errorMap[firstKey];
        const msg = Array.isArray(val) ? val[0] : String(val);
        if (msg) {
          return {
            code: record.code ? String(record.code) : '422',
            message: msg,
          };
        }
      }
    }
  }

  // 4. If data is directly a plain string
  if (typeof data === 'string' && data.trim().length > 0 && !data.startsWith('<')) {
    return {
      code: String(errObj.response?.status || '400'),
      message: data,
    };
  }

  // 5. Fallback if it's an AxiosError without response body but has network message
  if (axios.isAxiosError(error) && error.message) {
    return {
      code: String(error.response?.status || error.code || '500'),
      message: error.message,
    };
  }

  return null;
}
