export function hasTokenRole(accessToken: string | null, role: string): boolean {
  if (!accessToken) return false;
  try {
    // El frontend solo usa el claim para adaptar la interfaz; el backend siempre valida la autorización real.
    const encodedPayload = accessToken.split('.')[1];
    if (!encodedPayload) return false;
    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
    const payload = JSON.parse(atob(base64)) as Record<string, unknown>;
    // Se aceptan los nombres habituales porque .NET puede serializar ClaimTypes.Role como una URI completa.
    const claim = payload['role'] ?? payload['roles'] ?? payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    return (Array.isArray(claim) ? claim : [claim]).includes(role);
  } catch {
    return false;
  }
}
