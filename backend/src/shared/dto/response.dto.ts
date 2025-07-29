import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class SafeUserDto {
  @Expose()
  @ApiProperty({ description: 'User ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Username' })
  username: string;

  @Expose()
  @ApiProperty({ description: 'Full name' })
  fullName: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Avatar URL' })
  avatarUrl?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'User bio' })
  bio?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Location' })
  location?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Website URL' })
  websiteUrl?: string;

  @Expose()
  @ApiProperty({ description: 'User status' })
  status: string;

  @Expose()
  @ApiProperty({ description: 'User role' })
  role: string;

  @Expose()
  @ApiProperty({ description: 'Email verification status' })
  emailVerified: boolean;

  @Expose()
  @ApiProperty({ description: 'Last active timestamp' })
  lastActiveAt: Date;

  @Expose()
  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;

  // Explicitly exclude sensitive fields (even though @Exclude() handles this)
  // This serves as documentation of what we're protecting
  // passwordHash: EXCLUDED
  // email: EXCLUDED (only for public member lists)
  // emailVerificationToken: EXCLUDED
  // passwordResetToken: EXCLUDED
  // twoFactorSecret: EXCLUDED
  // failedLoginAttempts: EXCLUDED
  // lockedUntil: EXCLUDED
  // preferences: EXCLUDED (may contain sensitive settings)
  // metadata: EXCLUDED (may contain sensitive data)
}

@Exclude()
export class PrivateUserDto extends SafeUserDto {
  @Expose()
  @ApiProperty({ description: 'User email (only visible to self and admins)' })
  email: string;

  @Expose()
  @ApiPropertyOptional({ description: 'User preferences (only visible to self)' })
  preferences?: Record<string, any>;

  @Expose()
  @ApiProperty({ description: 'Two-factor authentication status' })
  twoFactorEnabled: boolean;

  @Expose()
  @ApiProperty({ description: 'Last login timestamp' })
  lastLoginAt: Date;
}

@Exclude()
export class CommunityMemberResponseDto {
  @Expose()
  @ApiProperty({ description: 'Membership ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Community ID' })
  communityId: string;

  @Expose()
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @Expose()
  @ApiProperty({ description: 'Member role in community' })
  role: string;

  @Expose()
  @ApiProperty({ description: 'Member status' })
  status: string;

  @Expose()
  @ApiProperty({ description: 'Join date' })
  joinedAt: Date;

  @Expose()
  @ApiPropertyOptional({ description: 'Join method' })
  joinMethod?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Member nickname in community' })
  nickname?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Member bio in community' })
  bio?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Member color/theme' })
  color?: string;

  @Expose()
  @ApiProperty({ description: 'Message count' })
  messageCount: number;

  @Expose()
  @ApiProperty({ description: 'Space count' })
  spaceCount: number;

  @Expose()
  @ApiProperty({ description: 'Reputation score' })
  reputation: number;

  @Expose()
  @ApiProperty({ description: 'Warning count' })
  warningCount: number;

  @Expose()
  @ApiProperty({ description: 'Last activity timestamp' })
  lastActivityAt: Date;

  @Expose()
  @Transform(({ obj }) => obj.user ? new SafeUserDto() : null)
  @ApiProperty({ description: 'User information', type: SafeUserDto })
  user: SafeUserDto;

  // Excluded sensitive fields:
  // customPermissions: EXCLUDED (internal use only)
  // deniedPermissions: EXCLUDED (internal use only)
  // isMuted: EXCLUDED (only for moderation)
  // mutedUntil: EXCLUDED (only for moderation)
  // restrictionReason: EXCLUDED (only for moderation)
  // invitedBy: EXCLUDED (privacy)
  // notifyOnMessages: EXCLUDED (private preferences)
  // notifyOnMentions: EXCLUDED (private preferences)
  // notifyOnRoleChanges: EXCLUDED (private preferences)
  // notifyOnEvents: EXCLUDED (private preferences)
  // settings: EXCLUDED (private data)
  // metadata: EXCLUDED (internal use)
}

@Exclude()
export class SpaceMemberResponseDto {
  @Expose()
  @ApiProperty({ description: 'Membership ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Space ID' })
  spaceId: string;

  @Expose()
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @Expose()
  @ApiProperty({ description: 'Member role in space' })
  role: string;

  @Expose()
  @ApiProperty({ description: 'Member status' })
  status: string;

  @Expose()
  @ApiProperty({ description: 'Join date' })
  joinedAt: Date;

  @Expose()
  @ApiPropertyOptional({ description: 'Join method' })
  joinMethod?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Member nickname in space' })
  nickname?: string;

  @Expose()
  @ApiProperty({ description: 'Message count in space' })
  messageCount: number;

  @Expose()
  @ApiProperty({ description: 'Reputation in space' })
  reputation: number;

  @Expose()
  @ApiProperty({ description: 'Last activity in space' })
  lastActivityAt: Date;

  @Expose()
  @Transform(({ obj }) => obj.user ? new SafeUserDto() : null)
  @ApiProperty({ description: 'User information', type: SafeUserDto })
  user: SafeUserDto;

  // Similar exclusions as CommunityMemberResponseDto
}
