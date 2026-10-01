export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'include',
    });

    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.replace('/?session=expired');
    }

    return res;
  } catch (err) {
    // Return a safe 503 response on network drops or dev server reload
    return new Response(JSON.stringify({ error: 'Network unavailable. Please retry.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
