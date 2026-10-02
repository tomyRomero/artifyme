import { request } from './client';
import type { Style } from './types';

export function listStyles(signal?: AbortSignal): Promise<Style[]> {
  return request('/api/v1/styles', { auth: false, signal });
}
