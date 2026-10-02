import { useQuery } from '@tanstack/react-query';
import { getProfile } from '@/api/account';
import { useSession } from '@/lib/session';

export const profileKey = ['profile'] as const;

export function useProfile() {
  const signedIn = useSession().status === 'signedIn';
  return useQuery({
    queryKey: profileKey,
    queryFn: ({ signal }) => getProfile(signal),
    enabled: signedIn,
  });
}
