const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchAdminApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: { message: string; code: string } }> {
  const url = `${API_URL}${path}`;

  const defaultHeaders: Record<string, string> = {};

  if (process.env.NEXT_PUBLIC_ADMIN_SECRET) {
    defaultHeaders['x-admin-secret'] = process.env.NEXT_PUBLIC_ADMIN_SECRET;
  }

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('atelier_admin_token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  if (options.body && !(typeof window !== 'undefined' && options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      cache: 'no-store',
    });

    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err.message || 'Failed to communicate with API server',
      },
    };
  }
}

/**
 * Upload an image file to Cloudinary via backend admin API
 */
export async function uploadMediaToCloudinary(file: File): Promise<{
  success: boolean;
  data?: { url: string; secureUrl: string; publicId: string };
  error?: { message: string };
}> {
  const formData = new FormData();
  formData.append('file', file);

  return fetchAdminApi<{ url: string; secureUrl: string; publicId: string }>(
    '/api/v1/admin/uploads',
    {
      method: 'POST',
      body: formData,
    }
  );
}
