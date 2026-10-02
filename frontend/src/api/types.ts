export interface UserProfile {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface SessionTokens {
  sessionId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface DeviceSession {
  id: string;
  platform: string;
  deviceModel: string | null;
  appVersion: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

export interface Registration {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export type BrushType = 'pen' | 'pencil' | 'marker';

// SVG path segments in artboard units, with the color, width and brush
export interface Stroke {
  path: string[];
  color: string;
  size: number;
  // A pen when it's missing, as on older strokes
  brush?: BrushType | null;
}

export interface ArtworkSummary {
  id: string;
  title: string;
  description: string | null;
  creationDateTime: string;
  imageUrl: string | null;
}

export interface GalleryFilters {
  search: string;
  style: string | null;
  sort: 'newest' | 'oldest';
}

export interface ArtworkPage {
  items: ArtworkSummary[];
  hasMore: boolean;
}

export interface ArtworkDetails {
  id: string;
  title: string;
  description: string | null;
  style: string | null;
  creationDateTime: string;
  sketchImageUrl: string | null;
  aiImageUrl: string | null;
  paths: Stroke[];
  // Older artworks have none
  howItWasMade: HowItWasMade | null;
}

export interface HowItWasMade {
  outlineImageUrl: string | null;
  prompt: string;
  model: string | null;
  device: string | null;
  seed: number;
  steps: number;
  startedAt: string | null;
  finishedAt: string;
}

export interface Style {
  id: string;
  name: string;
  // Added to the prompt after the description
  words: string;
}

export interface ArtworkChanges {
  title?: string;
  description?: string;
}

export type GenerationStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type GenerationError = 'filtered' | 'generation_failed' | 'interrupted';

export interface Generation {
  id: string;
  status: GenerationStatus;
  error: GenerationError | null;
  step: number;
  totalSteps: number;
  position: number | null;
  seed: number | null;
  artworkId: string | null;
  createdAt: string;
  startedAt: string | null;
  // The latest step as a data URI, while it runs
  preview: string | null;
}

export interface GenerationRequest {
  sketch: string;
  description: string;
  title: string;
  style?: string;
  paths: Stroke[];
  artworkId?: string;
}
