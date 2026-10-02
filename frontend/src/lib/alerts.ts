import { Alert } from 'react-native';
import { ApiError } from '@/api/client';

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Try again.';
}

// Stays quiet when the session ended, since that was already announced
export function alertError(title: string, error: unknown) {
  if (error instanceof ApiError && error.sessionEnded) {
    return;
  }
  if (!(error instanceof ApiError)) {
    console.error(error);
  }
  Alert.alert(title, errorMessage(error));
}
