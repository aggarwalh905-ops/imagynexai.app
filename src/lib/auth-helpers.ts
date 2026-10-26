export function getPermanentUserId(token: string | null): string | null {
  if (!token) return null;

  try {
    // 1. Agar standard JWT hai
    if (token.includes('.')) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(decodeURIComponent(escape(atob(base64))));
      const uid = payload.sub || payload.user_id || payload.username || payload.email;
      if (uid) return `pol_${uid}`;
    }

    // 2. Agar API Key / raw string hai (e.g., sk_qTpfxEDSGHDqp...)
    // Exact same prefix slice match karein jo login ke waqt use hua tha
    return `pol_${token.slice(0, 16)}`;
  } catch {
    return `pol_${token.slice(0, 16)}`;
  }
}