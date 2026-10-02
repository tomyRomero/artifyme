import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listDevices, signOutDevice } from '@/api/account';
import type { DeviceSession } from '@/api/types';
import { useSession } from '@/lib/session';

export const devicesKey = ['devices'] as const;

export function useDevices() {
  const signedIn = useSession().status === 'signedIn';
  return useQuery({
    queryKey: devicesKey,
    queryFn: ({ signal }) => listDevices(signal),
    enabled: signedIn,
    select: (devices) => [...devices].sort((a, b) => Number(b.current) - Number(a.current)),
  });
}

export function useSignOutDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signOutDevice,
    onSuccess: (_result, id) => {
      queryClient.setQueryData<DeviceSession[]>(devicesKey, (devices) => devices?.filter((device) => device.id !== id));
      return queryClient.invalidateQueries({ queryKey: devicesKey });
    },
  });
}
