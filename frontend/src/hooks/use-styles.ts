import { useQuery } from '@tanstack/react-query';
import { listStyles } from '@/api/styles';

// The styles only change with a new API release
export function useStyles() {
  return useQuery({ queryKey: ['styles'], queryFn: ({ signal }) => listStyles(signal), staleTime: Infinity });
}
