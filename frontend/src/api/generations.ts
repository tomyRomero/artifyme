import { request } from './client';
import type { Generation, GenerationRequest } from './types';

const GENERATIONS = '/api/v1/generations';

export function startGeneration(generation: GenerationRequest): Promise<Generation> {
  return request(GENERATIONS, { method: 'POST', body: generation });
}

export function getGeneration(id: string, signal?: AbortSignal): Promise<Generation> {
  return request(generationPath(id), { signal });
}

export async function getActiveGeneration(signal?: AbortSignal): Promise<Generation | null> {
  return (await request<Generation | undefined>(`${GENERATIONS}/active`, { signal })) ?? null;
}

export function cancelGeneration(id: string): Promise<Generation> {
  return request(generationPath(id), { method: 'DELETE' });
}

function generationPath(id: string): string {
  return `${GENERATIONS}/${encodeURIComponent(id)}`;
}

export function isInProgress(generation: Generation): boolean {
  return generation.status === 'queued' || generation.status === 'running';
}
