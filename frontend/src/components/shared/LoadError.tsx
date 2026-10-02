import { ApiError } from '@/api/client';
import { EmptyState } from '@/components/ui';

interface LoadErrorProps {
  title: string;
  error: unknown;
  onRetry: () => void;
}

// No answer at all could be the phone's connection or the server, so it doesn't claim either
export function LoadError({ title, error, onRetry }: LoadErrorProps) {
  const unreachable = error instanceof ApiError && error.status === 0;

  return (
    <EmptyState
      title={title}
      body={
        unreachable
          ? "ArtifyMe can't be reached. Check your connection, then try again."
          : 'Something went wrong on our side. Try again shortly.'
      }
      action={{ label: 'Retry', onPress: onRetry }}
    />
  );
}
