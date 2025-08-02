// Main store exports
export * from './api';
export * from './auth';
export * from './posts';
export * from './chat';
export * from './socket';

// Type exports
export type { 
  User, 
  LoginCredentials, 
  RegisterData, 
  AuthResult
} from './auth';

export type {
  Post,
  Community,
  Space,
  CreatePostData,
  CreateCommunityData,
  CreateSpaceData,
  PostFilters
} from './posts';

export type {
  ApiResponse,
  PaginatedResponse,
  ApiError
} from './api';

// Hook exports for convenience
export { useAuth, useProfile } from './auth';
export { usePosts, useCommunities, useSpaces } from './posts';
export { useChat } from './chat';
