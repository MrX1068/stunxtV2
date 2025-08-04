import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SpaceSecurityService, SpaceContentAccessRequest } from '../space-security.service';
import { SetMetadata } from '@nestjs/common';

export const SPACE_CONTENT_ACCESS = 'space_content_access';
export const SpaceContentAccess = (
  contentType: 'posts' | 'messages' | 'threads',
  action: 'read' | 'write' | 'delete' | 'moderate' = 'read'
) => SetMetadata(SPACE_CONTENT_ACCESS, { contentType, action });

@Injectable()
export class SpaceAccessGuard implements CanActivate {
  constructor(
    private readonly spaceSecurityService: SpaceSecurityService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
   
    
    const request = context.switchToHttp().getRequest();
    const { communityId, id: spaceId } = request.params;
    const userId = request.user?.id;
 

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get metadata from decorator
    const accessRequirement = this.reflector.get<{
      contentType: 'posts' | 'messages' | 'threads';
      action: 'read' | 'write' | 'delete' | 'moderate';
    }>(SPACE_CONTENT_ACCESS, context.getHandler());
    

    // Default to posts/read if no specific requirement
    const contentType = accessRequirement?.contentType || 
      this.inferContentTypeFromPath(request.path); // Remove default fallback to 'posts'
    const action = accessRequirement?.action || 
      this.inferActionFromMethod(request.method) || 'read';
      

    try {
      const accessRequest: SpaceContentAccessRequest = {
        communityId,
        spaceId,
        userId,
        contentType, // Can be undefined for dynamic detection
        action,
      };

      const result = await this.spaceSecurityService.validateSpaceContentAccess(accessRequest);
    

      // Attach access info to request for use in controllers
      request.spaceAccess = result;

      return result.allowed;
    } catch (error) {
      throw new ForbiddenException(`Space access denied: ${error.message}`);
    }
  }

  private inferContentTypeFromPath(path: string): 'posts' | 'messages' | 'threads' | null {
    if (path.includes('/messages')) return 'messages';
    if (path.includes('/posts')) return 'posts';
    if (path.includes('/threads')) return 'threads';
    if (path.includes('/content')) {
      // For /content endpoint, we need to determine based on space type
      // This will be handled in the security service
      return null;
    }
    return null;
  }

  private inferActionFromMethod(method: string): 'read' | 'write' | 'delete' | 'moderate' {
    switch (method.toLowerCase()) {
      case 'get': return 'read';
      case 'post': return 'write';
      case 'put':
      case 'patch': return 'write';
      case 'delete': return 'delete';
      default: return 'read';
    }
  }
}
