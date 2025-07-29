import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Delete,
  Param,
  Put,
  Query,
  BadRequestException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AuthService, AuthResult, AuthTokens } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { 
  SendEmailVerificationDto, 
  VerifyEmailDto, 
  ResendVerificationDto 
} from './dto/email-verification.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { Public } from './decorators/public.decorator';
import { User } from '../../shared/entities/user.entity';

interface RequestWithUser extends Request {
  user: User & { sessionId: string };
}

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string' },
            isActive: { type: 'boolean' },
            emailVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        tokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'number' },
            tokenType: { type: 'string' },
          },
        },
        sessionId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'Conflict - user already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async register(
    @Body(ValidationPipe) registerDto: RegisterDto,
    @Req() req: Request,
  ): Promise<AuthResult> {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('User-Agent') || 'Unknown';

    return this.authService.register(registerDto, ipAddress, userAgent);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with OTP' })
  @ApiResponse({
    status: 200,
    description: 'Email successfully verified and user logged in',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                username: { type: 'string' },
                fullName: { type: 'string' },
                role: { type: 'string' },
                isActive: { type: 'boolean' },
                emailVerified: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
                tokenType: { type: 'string' },
              },
            },
            sessionId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification code' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async verifyEmail(
    @Body(ValidationPipe) verifyEmailDto: VerifyEmailDto,
    @Req() req: Request,
  ): Promise<AuthResult> {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('User-Agent') || 'Unknown';

    const result = await this.authService.verifyEmail(verifyEmailDto, ipAddress, userAgent);
    return result.data;
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification OTP' })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent (if account exists)',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async resendEmailVerification(
    @Body(ValidationPipe) resendDto: ResendVerificationDto,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('User-Agent') || 'Unknown';

    return this.authService.resendEmailVerification(resendDto, ipAddress, userAgent);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string' },
            isActive: { type: 'boolean' },
            emailVerified: { type: 'boolean' },
            lastLoginAt: { type: 'string', format: 'date-time' },
          },
        },
        tokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'number' },
            tokenType: { type: 'string' },
          },
        },
        sessionId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid credentials' })
  @ApiResponse({ status: 403, description: 'Forbidden - too many attempts' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Req() req: Request & { user?: any },
  ): Promise<AuthResult> {
    // User is already authenticated by LocalAuthGuard, just complete the login process
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('User-Agent') || 'Unknown';

    return this.authService.completeLogin(req.user, loginDto, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresIn: { type: 'number' },
        tokenType: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid refresh token' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async refreshTokens(
    @Body(ValidationPipe) refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<AuthTokens> {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('User-Agent') || 'Unknown';

    return this.authService.refreshTokens(refreshTokenDto, ipAddress, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 204, description: 'User logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Req() req: RequestWithUser): Promise<void> {
    const { user } = req;
    
    if (!user.sessionId) {
      throw new UnauthorizedException('Session not found');
    }

    await this.authService.logout(user.sessionId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        username: { type: 'string' },
        fullName: { type: 'string' },
        role: { type: 'string' },
        status: { type: 'string' },
        emailVerified: { type: 'boolean' },
        avatarUrl: { type: 'string', nullable: true },
        bio: { type: 'string', nullable: true },
        location: { type: 'string', nullable: true },
        websiteUrl: { type: 'string', nullable: true },
        lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@GetUser() user: any): Promise<object> {
    // Return only the safe user data (no sensitive fields)
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      websiteUrl: user.websiteUrl,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 204, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid current password' })
  async changePassword(
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto,
    @GetUser() user: User,
    @Req() req: Request,
  ): Promise<void> {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('User-Agent') || 'Unknown';

    await this.authService.changePassword(user.id, changePasswordDto, ipAddress, userAgent);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 204, description: 'Password reset email sent (if user exists)' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async forgotPassword(
    @Body(ValidationPipe) forgotPasswordDto: ForgotPasswordDto,
    @Req() req: Request,
  ): Promise<void> {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('User-Agent') || 'Unknown';

    await this.authService.forgotPassword(forgotPasswordDto, ipAddress, userAgent);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 204, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid or expired token' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async resetPassword(
    @Body(ValidationPipe) resetPasswordDto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<void> {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('User-Agent') || 'Unknown';

    await this.authService.resetPassword(resetPasswordDto, ipAddress, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user active sessions' })
  @ApiResponse({
    status: 200,
    description: 'User active sessions',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          deviceInfo: { type: 'string' },
          deviceType: { type: 'string' },
          ipAddress: { type: 'string' },
          location: { type: 'string' },
          isCurrentSession: { type: 'boolean' },
          lastActivity: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserSessions(@GetUser() user: any): Promise<any[]> {
    return this.authService.getUserSessions(user.id, user.sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminate specific session' })
  @ApiResponse({ status: 204, description: 'Session terminated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - session not found or access denied' })
  async terminateSession(
    @Param('sessionId') sessionId: string,
    @GetUser() user: User,
  ): Promise<void> {
    await this.authService.terminateSession(user.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminate all other sessions' })
  @ApiResponse({ status: 204, description: 'All other sessions terminated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async terminateAllOtherSessions(@Req() req: RequestWithUser): Promise<void> {
    const { user } = req;
    
    if (!user.sessionId) {
      throw new UnauthorizedException('Session not found');
    }

    await this.authService.terminateAllOtherSessions(user.id, user.sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('security/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user security statistics' })
  @ApiResponse({
    status: 200,
    description: 'User security statistics',
    schema: {
      type: 'object',
      properties: {
        accountSecurity: {
          type: 'object',
          properties: {
            failedLoginAttempts: { type: 'number' },
            isLocked: { type: 'boolean' },
            lockedUntil: { type: 'string', format: 'date-time', nullable: true },
            lastLogin: { type: 'string', format: 'date-time', nullable: true },
            activeSessions: { type: 'number' },
          },
        },
        statistics: {
          type: 'object',
          properties: {
            totalAttempts: { type: 'number' },
            successfulAttempts: { type: 'number' },
            failedAttempts: { type: 'number' },
            successRate: { type: 'number' },
            uniqueIPs: { type: 'number' },
            periodDays: { type: 'number' },
          },
        },
        topFailureReasons: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              reason: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSecurityStats(@GetUser() user: any): Promise<any> {
    return this.authService.getUserSecurityStats(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('unlock-account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlock own account (if locked)' })
  @ApiResponse({ status: 204, description: 'Account unlocked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unlockAccount(@GetUser() user: any): Promise<void> {
    await this.authService.unlockUserAccount(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('security/attempts')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent login attempts for current user' })
  @ApiResponse({
    status: 200,
    description: 'Recent login attempts',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          result: { type: 'string' },
          type: { type: 'string' },
          ipAddress: { type: 'string' },
          userAgent: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLoginAttempts(@GetUser() user: any): Promise<any[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const attempts = await this.authService.getUserLoginAttempts(user.id, sevenDaysAgo);
    
    // Return sanitized attempt data (no sensitive info)
    return attempts.map(attempt => ({
      id: attempt.id,
      result: attempt.result,
      type: attempt.type,
      ipAddress: attempt.ipAddress,
      userAgent: attempt.userAgent?.substring(0, 100) + '...', // Truncate user agent
      createdAt: attempt.createdAt,
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Get('debug/user-info')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Debug: Get user security info' })
  async getUserDebugInfo(@GetUser() user: any): Promise<any> {
    return this.authService.getUserDebugInfo(user.id);
  }

  @Public()
  @Get('check-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if email is already registered' })
  @ApiQuery({ name: 'email', type: String, description: 'Email to check' })
  @ApiResponse({
    status: 200,
    description: 'Email availability check result',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async checkEmail(
    @Query('email') email: string,
  ): Promise<{ exists: boolean; message: string }> {
    if (!email) {
      throw new BadRequestException('Email parameter is required');
    }

    const exists = await this.authService.checkEmailExists(email);
    return {
      exists,
      message: exists ? 'Email is already registered' : 'Email is available',
    };
  }

  @Public()
  @Get('check-username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if username is already taken' })
  @ApiQuery({ name: 'username', type: String, description: 'Username to check' })
  @ApiResponse({
    status: 200,
    description: 'Username availability check result',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async checkUsername(
    @Query('username') username: string,
  ): Promise<{ exists: boolean; message: string }> {
    if (!username) {
      throw new BadRequestException('Username parameter is required');
    }

    const exists = await this.authService.checkUsernameExists(username);
    return {
      exists,
      message: exists ? 'Username is already taken' : 'Username is available',
    };
  }

  /**
   * Extract client IP address from request
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
    }
    
    return (
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }
}
