import { useAuth } from '../context/AuthContext';

/**
 * Geeft de huidige gebruikersrol terug en handige afgeleiden booleans.
 *
 * Rollen:
 *   admin  — volledige toegang + admin panel
 *   ringer — eigen data beheren (default)
 *   viewer — eigen data alleen lezen
 */
export function useRole() {
  const { profile } = useAuth();
  const rol = profile?.rol || 'ringer';

  return {
    rol,
    isAdmin:  rol === 'admin',
    isRinger: rol === 'ringer',
    isViewer: rol === 'viewer',
    canAdd:    rol !== 'viewer',
    canEdit:   rol !== 'viewer',
    canDelete: rol !== 'viewer',
  };
}
