import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { User, UserRole, UserStatus } from '../../shared/entities/user.entity';
import { UserSessionService } from './user-session.service';
import { LoginAttemptService } from './login-attempt.service';
import { OtpService } from './services/otp.service';
import { EmailService } from './services/email.service';
import { ResponseService } from '../../shared/services/response.service';
import { StandardApiResponse } from '../../shared/interfaces/api-response.interface';

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
import { AttemptResult, AttemptType } from '../../shared/entities/login-attempt.entity';

export interface SanitizedUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  websiteUrl?: string;
  status: UserStatus;
  role: UserRole;
  authProvider?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  preferences?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthResult {
  user: SanitizedUser;
  tokens: AuthTokens;
  sessionId: string;
  requiresEmailVerification?: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  sessionId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userSessionService: UserSessionService,
    private readonly loginAttemptService: LoginAttemptService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * Register a new user with email verification
   */
  async register(
    registerDto: RegisterDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResult> {
    const { email, password, fullName, username } = registerDto;

    // Check rate limiting
    const isRateLimited = await this.loginAttemptService.isRateLimited(email, ipAddress);
    if (isRateLimited) {
      await this.loginAttemptService.recordAttempt(
        email,
        ipAddress,
        userAgent,
        AttemptResult.FAILED_RATE_LIMIT,
        AttemptType.REGISTRATION,
      );
      throw new ForbiddenException('Too many registration attempts. Please try again later.');
    }

    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: [{ email }, { username }],
      });

      if (existingUser) {
        await this.loginAttemptService.recordAttempt(
          email,
          ipAddress,
          userAgent,
          AttemptResult.FAILED_USER_NOT_FOUND,
          AttemptType.REGISTRATION,
        );
        
        if (existingUser.email === email) {
          throw new ConflictException('User with this email already exists');
        }
        throw new ConflictException('Username is already taken');
      }

      // Hash password
      const saltRounds = this.configService.get<number>('auth.saltRounds', 12);
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate email verification OTP
      const otpData = this.otpService.generateEmailVerificationOtp();

      // Create user
      const user = this.userRepository.create({
        email,
        passwordHash: hashedPassword,
        fullName,
        username,
        emailVerified: false,
        status: UserStatus.ACTIVE,
        role: UserRole.USER,
        emailVerificationToken: otpData.hashedCode,
        passwordResetExpires: otpData.expiresAt, // Reusing this field for OTP expiration
      });

      const savedUser = await this.userRepository.save(user);

      // Send verification email with OTP
      await this.emailService.sendEmailVerificationOtp(
        email, 
        otpData.code, 
        this.configService.get<number>('jwt.otpExpiration', 600) / 60 // Convert seconds to minutes
      );

      // Create session
      const session = await this.userSessionService.createSession(
        savedUser.id,
        ipAddress,
        userAgent,
      );

      // Generate tokens
      const tokens = await this.generateTokens(savedUser, session.id);

      // Record successful registration
      await this.loginAttemptService.recordAttempt(
        email,
        ipAddress,
        userAgent,
        AttemptResult.SUCCESS,
        AttemptType.REGISTRATION,
        { userId: savedUser.id, sessionId: session.id },
      );

  

      return {
        user: this.sanitizeUser(savedUser),
        tokens,
        sessionId: session.id,
        requiresEmailVerification: true,
      };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof ForbiddenException) {
        throw error;
      }

    
      throw new BadRequestException('Registration failed');
    }
  }

  /**
   * Verify email with OTP
   */
  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<StandardApiResponse<AuthResult>> {
    const { email, otp } = verifyEmailDto;

    try {
      const user = await this.userRepository.findOne({
        where: { email },
        select: ['id', 'email', 'emailVerified', 'emailVerificationToken', 'passwordResetExpires'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.emailVerified) {
        // Security: Don't allow login if email is already verified by another account
        // This prevents unauthorized access via the verification endpoint
        throw new BadRequestException('Email is already verified and associated with an existing account');
      }

      if (!user.emailVerificationToken || !user.passwordResetExpires) {
        throw new BadRequestException('No verification code found. Please request a new one.');
      }

      // Verify OTP
      const isValidOtp = this.otpService.verifyOtp(
        otp,
        user.emailVerificationToken,
        user.passwordResetExpires,
      );

      if (!isValidOtp) {
        await this.loginAttemptService.recordAttempt(
          email,
          ipAddress,
          userAgent,
          AttemptResult.FAILED_2FA,
          AttemptType.EMAIL_VERIFICATION,
          { userId: user.id },
        );
        throw new BadRequestException('Invalid or expired verification code');
      }

      // Update user as verified
      await this.userRepository.update(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        passwordResetExpires: null,
      });

      // Get updated user
      const updatedUser = await this.userRepository.findOne({
        where: { id: user.id },
      });

      if (!updatedUser) {
        throw new NotFoundException('User not found after verification');
      }

      // Send welcome email
      await this.emailService.sendWelcomeEmail(email, updatedUser.fullName);

      // Generate session and tokens for the newly verified user
      const session = await this.userSessionService.createSession(
        updatedUser.id,
        ipAddress,
        userAgent,
      );

      const tokens = await this.generateTokens(updatedUser, session.id);

      // Record successful verification
      await this.loginAttemptService.recordAttempt(
        email,
        ipAddress,
        userAgent,
        AttemptResult.SUCCESS,
        AttemptType.EMAIL_VERIFICATION,
        { userId: updatedUser.id },
      );

  

      return this.responseService.success(
        {
          user: this.sanitizeUser(updatedUser),
          tokens,
          sessionId: session.id,
        } as AuthResult,
        'Email verified successfully - logged in'
      );
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

     
      throw new BadRequestException('Email verification failed');
    }
  }

  /**
   * Resend email verification OTP
   */
  async resendEmailVerification(
    resendDto: ResendVerificationDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ success: boolean; message: string }> {
    const { email } = resendDto;

    try {
      const user = await this.userRepository.findOne({
        where: { email },
      });

      if (!user) {
        // Don't reveal if user exists
        return { success: true, message: 'If an account exists, verification email has been sent' };
      }

      if (user.emailVerified) {
        return { success: true, message: 'Email is already verified' };
      }

      // Generate new OTP
      const otpData = this.otpService.generateEmailVerificationOtp();

      // Update user with new OTP
      await this.userRepository.update(user.id, {
        emailVerificationToken: otpData.hashedCode,
        passwordResetExpires: otpData.expiresAt,
      });

      // Send new verification email
      await this.emailService.sendEmailVerificationOtp(
        email,
        otpData.code,
        this.configService.get<number>('jwt.otpExpiration', 600) / 60, // Convert seconds to minutes
      );



      return { success: true, message: 'Verification email sent' };
    } catch (error) {
    
      return { success: true, message: 'If an account exists, verification email has been sent' };
    }
  }

  /**
   * Authenticate user and create session
   */
  async login(
    loginDto: LoginDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResult> {
    const { email, password } = loginDto;

    // Check rate limiting
    const isRateLimited = await this.loginAttemptService.isRateLimited(email, ipAddress);
    if (isRateLimited) {
      await this.loginAttemptService.recordAttempt(
        email,
        ipAddress,
        userAgent,
        AttemptResult.FAILED_RATE_LIMIT,
        AttemptType.LOGIN,
      );
      throw new ForbiddenException('Too many login attempts. Please try again later.');
    }

    try {
      // Find user with additional fields for security checks
      const user = await this.userRepository.findOne({
        where: { email },
        select: ['id', 'email', 'passwordHash', 'fullName', 'username', 'role', 'status', 'emailVerified', 'failedLoginAttempts', 'lockedUntil'],
      });

      if (!user) {
        await this.loginAttemptService.recordAttempt(
          email,
          ipAddress,
          userAgent,
          AttemptResult.FAILED_USER_NOT_FOUND,
          AttemptType.LOGIN,
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if account is locked
     
      
      if (user.isLocked()) {
       
        
        await this.loginAttemptService.recordAttempt(
          email,
          ipAddress,
          userAgent,
          AttemptResult.FAILED_ACCOUNT_LOCKED,
          AttemptType.LOGIN,
          { userId: user.id },
        );
        throw new UnauthorizedException('Account is temporarily locked due to too many failed attempts. Please try again later.');
      }

      // Check if account is active
      if (user.status !== UserStatus.ACTIVE) {
        await this.loginAttemptService.recordAttempt(
          email,
          ipAddress,
          userAgent,
          AttemptResult.FAILED_ACCOUNT_DISABLED,
          AttemptType.LOGIN,
          { userId: user.id },
        );
        throw new UnauthorizedException('Account is disabled');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      
      if (!isPasswordValid) {
        await this.handleFailedLoginAttempt(user, email, ipAddress, userAgent);
      }

      // Reset failed attempts on successful password verification
      user.updateLastLogin();
      await this.userRepository.save(user);

      // Create session
      const session = await this.userSessionService.createSession(
        user.id,
        ipAddress,
        userAgent,
      );

      // Generate tokens
      const tokens = await this.generateTokens(user, session.id, loginDto.rememberMe);

      // Record successful login
      await this.loginAttemptService.recordAttempt(
        email,
        ipAddress,
        userAgent,
        AttemptResult.SUCCESS,
        AttemptType.LOGIN,
        { userId: user.id, sessionId: session.id },
      );

      // Update last login
      await this.userRepository.update(user.id, {
        lastLoginAt: new Date(),
      });

    

      return {
        user: this.sanitizeUser(user),
        tokens,
        sessionId: session.id,
        requiresEmailVerification: !user.emailVerified,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

    
      throw new UnauthorizedException('Login failed');
    }
  }

  /**
   * Refresh access token using refresh token (Enterprise Grade)
   */
  async refreshTokens(
    refreshTokenDto: RefreshTokenDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthTokens> {
    const { refreshToken } = refreshTokenDto;

    try {
      // Validate refresh token format
      if (!refreshToken.startsWith('rtk_')) {
        throw new UnauthorizedException('Invalid refresh token format');
      }

      // Find session by refresh token hash
      const session = await this.findSessionByRefreshToken(refreshToken);
      if (!session) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if refresh token is expired
      if (session.refreshTokenExpiresAt < new Date()) {
        await this.userSessionService.invalidateSession(session.id);
        throw new UnauthorizedException('Refresh token expired');
      }

      // Validate session is still active
      if (session.status !== 'active') {
        throw new UnauthorizedException('Session is no longer active');
      }

      // Get user
      const user = await this.userRepository.findOne({
        where: { id: session.userId },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        await this.userSessionService.invalidateSession(session.id);
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new tokens (refresh token rotation for security)
      const newTokens = await this.generateTokens(user, session.id);

      // Update session activity
      await this.userSessionService.updateSessionActivity(session.id, {
        ipAddress,
        userAgent,
      });

      // Record successful refresh
      await this.loginAttemptService.recordAttempt(
        user.email,
        ipAddress,
        userAgent,
        AttemptResult.SUCCESS,
        AttemptType.REFRESH_TOKEN,
        { userId: user.id, sessionId: session.id },
      );



      return newTokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

   
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(sessionId: string, userId: string): Promise<void> {
    try {
      await this.userSessionService.invalidateSession(sessionId);
    
    } catch (error) {
     
      throw new BadRequestException('Logout failed');
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'email', 'passwordHash'],
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        await this.loginAttemptService.recordAttempt(
          user.email,
          ipAddress,
          userAgent,
          AttemptResult.FAILED_PASSWORD,
          AttemptType.PASSWORD_RESET,
          { userId: user.id },
        );
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = this.configService.get<number>('auth.saltRounds', 12);
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await this.userRepository.update(userId, {
        passwordHash: hashedNewPassword,
      });

      // Invalidate all sessions except current one (force re-login on other devices)
      await this.userSessionService.invalidateUserSessions(userId);

      // Record successful password change
      await this.loginAttemptService.recordAttempt(
        user.email,
        ipAddress,
        userAgent,
        AttemptResult.SUCCESS,
        AttemptType.PASSWORD_RESET,
        { userId: user.id },
      );

    
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

   
      throw new BadRequestException('Password change failed');
    }
  }

  /**
   * Initiate password reset process with OTP
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const { email } = forgotPasswordDto;

    try {
      const user = await this.userRepository.findOne({
        where: { email },
      });

      if (!user) {
        // Don't reveal if user exists or not

        return;
      }

      // Generate reset OTP
      const otpData = this.otpService.generatePasswordResetOtp();

      // Save reset token
      await this.userRepository.update(user.id, {
        passwordResetToken: otpData.hashedCode,
        passwordResetExpires: otpData.expiresAt,
      });

      // Send password reset email with OTP
      await this.emailService.sendPasswordResetOtp(
        email,
        otpData.code,
        this.configService.get<number>('jwt.otpExpiration', 600) / 60, // Convert seconds to minutes
      );

      // Record password reset request
      await this.loginAttemptService.recordAttempt(
        email,
        ipAddress,
        userAgent,
        AttemptResult.SUCCESS,
        AttemptType.PASSWORD_RESET,
        { userId: user.id },
      );


    } catch (error) {

      // Don't throw error to prevent user enumeration
    }
  }

  /**
   * Reset password using OTP
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const { token: otp, newPassword } = resetPasswordDto;

    try {
      // Find user by email (assuming we get email from frontend)
      // For this implementation, we'll find by reset token existence
      const user = await this.userRepository.findOne({
        where: {
          passwordResetExpires: MoreThan(new Date()),
        },
        select: ['id', 'email', 'passwordResetToken', 'passwordResetExpires'],
      });

      if (!user || !user.passwordResetToken) {
        throw new BadRequestException('Invalid or expired reset code');
      }

      // Verify OTP
      const isValidOtp = this.otpService.verifyOtp(
        otp,
        user.passwordResetToken,
        user.passwordResetExpires,
      );

      if (!isValidOtp) {
        throw new BadRequestException('Invalid or expired reset code');
      }

      // Hash new password
      const saltRounds = this.configService.get<number>('auth.saltRounds', 12);
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear reset token
      await this.userRepository.update(user.id, {
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });

      // Invalidate all user sessions
      await this.userSessionService.invalidateUserSessions(user.id);

      // Record successful password reset
      await this.loginAttemptService.recordAttempt(
        user.email,
        ipAddress,
        userAgent,
        AttemptResult.SUCCESS,
        AttemptType.PASSWORD_RESET,
        { userId: user.id },
      );

 
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Password reset failed');
    }
  }

  /**
   * Complete login process after authentication (called from controller)
   */
  async completeLogin(
    user: User,
    loginDto: LoginDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResult> {
    try {
      // Create session
      const session = await this.userSessionService.createSession(
        user.id,
        ipAddress,
        userAgent,
      );

      // Generate tokens
      const tokens = await this.generateTokens(user, session.id, loginDto.rememberMe);

      // Update last login
      await this.userRepository.update(user.id, {
        lastLoginAt: new Date(),
      });

   

      return {
        user,
        tokens,
        sessionId: session.id,
        requiresEmailVerification: !user.emailVerified,
      };
    } catch (error) {
      throw new BadRequestException('Login completion failed');
    }
  }

  /**
   * Handle failed login attempt with account locking and email notifications
   */
  private async handleFailedLoginAttempt(
    user: User,
    email: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<never> {
    
    // Increment failed attempts and potentially lock account
    user.incrementFailedAttempts();
    const savedUser = await this.userRepository.save(user);
    

    // Record the failed attempt
    await this.loginAttemptService.recordAttempt(
      email,
      ipAddress,
      userAgent,
      AttemptResult.FAILED_PASSWORD,
      AttemptType.LOGIN,
      { userId: user.id },
    );
    
    const remainingAttempts = Math.max(0, 5 - savedUser.failedLoginAttempts);
    if (remainingAttempts === 0) {
      
      // Send account lockout email notification
      try {
        await this.emailService.sendAccountLockoutEmail(
          savedUser.email,
          savedUser.fullName,
          savedUser.lockedUntil,
          ipAddress,
          userAgent
        );
      } catch (emailError) {
        // Don't throw error here, the main authentication flow should continue
      }
      
      throw new UnauthorizedException('Account has been locked due to too many failed attempts. Please try again in 30 minutes.');
    } else {
      throw new UnauthorizedException(`Invalid credentials. ${remainingAttempts} attempts remaining before account lock.`);
    }
  }

  /**
   * Validate user credentials with security checks (for LocalStrategy)
   */
  async validateUserWithSecurity(
    email: string, 
    password: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<SanitizedUser | null> {
    // Check rate limiting
    const isRateLimited = await this.loginAttemptService.isRateLimited(email, ipAddress);
    if (isRateLimited) {
      await this.loginAttemptService.recordAttempt(
        email,
        ipAddress,
        userAgent,
        AttemptResult.FAILED_RATE_LIMIT,
        AttemptType.LOGIN,
      );
      throw new ForbiddenException('Too many login attempts. Please try again later.');
    }

    try {
      // Find user with additional fields for security checks
      const user = await this.userRepository.findOne({
        where: { email },
        select: ['id', 'email', 'passwordHash', 'fullName', 'username', 'role', 'status', 'emailVerified', 'failedLoginAttempts', 'lockedUntil'],
      });

      if (!user) {
        await this.loginAttemptService.recordAttempt(
          email,
          ipAddress,
          userAgent,
          AttemptResult.FAILED_USER_NOT_FOUND,
          AttemptType.LOGIN,
        );
        return null;
      }

      // Check if account is locked
      
      if (user.isLocked()) {
        
        await this.loginAttemptService.recordAttempt(
          email,
          ipAddress,
          userAgent,
          AttemptResult.FAILED_ACCOUNT_LOCKED,
          AttemptType.LOGIN,
          { userId: user.id },
        );
        throw new UnauthorizedException('Account is temporarily locked due to too many failed attempts. Please try again later.');
      }

      // Check if account is active
      if (user.status !== UserStatus.ACTIVE) {
        await this.loginAttemptService.recordAttempt(
          email,
          ipAddress,
          userAgent,
          AttemptResult.FAILED_ACCOUNT_DISABLED,
          AttemptType.LOGIN,
          { userId: user.id },
        );
        return null;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      
      if (!isPasswordValid) {
        await this.handleFailedLoginAttempt(user, email, ipAddress, userAgent);
      }

      // Reset failed attempts on successful password verification
      user.updateLastLogin();
      await this.userRepository.save(user);

      // Record successful validation
      await this.loginAttemptService.recordAttempt(
        email,
        ipAddress,
        userAgent,
        AttemptResult.SUCCESS,
        AttemptType.LOGIN,
        { userId: user.id },
      );


      // Return sanitized user (without password hash)
      return this.sanitizeUser(user);
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

      return null;
    }
  }

  /**
   * Get user by ID (for JWT strategy)
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { id },
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate JWT payload and return user
   */
  async validateJwtPayload(payload: JwtPayload): Promise<User | null> {
    try {
      // Validate session
      const session = await this.userSessionService.findValidSession(
        payload.sessionId,
        payload.sub,
      );
      
      if (!session) {
        return null;
      }

      // Get user
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        return null;
      }

      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate access and refresh tokens (Enterprise Grade)
   */
  async generateTokens(user: User, sessionId: string, rememberMe: boolean = false): Promise<AuthTokens> {
    // Access Token (JWT) - Short-lived, contains user info
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId,
      type: 'access',
    };

    const accessTokenExpiresIn = this.configService.get<number>('jwt.accessTokenExpiration', 900); // 15 minutes
    
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: accessTokenExpiresIn,
    });

    // Refresh Token (Opaque) - Long-lived, stored in database
    const refreshToken = this.generateSecureRefreshToken();
    const refreshTokenExpiresIn = rememberMe 
      ? this.configService.get<number>('jwt.refreshTokenLongExpiration', 2592000) // 30 days for "remember me"
      : this.configService.get<number>('jwt.refreshTokenExpiration', 604800); // 7 days normal

    const refreshTokenExpiry = new Date(Date.now() + refreshTokenExpiresIn * 1000);

    // Store refresh token in database with metadata
    await this.storeRefreshToken(refreshToken, user.id, sessionId, refreshTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiresIn,
      tokenType: 'Bearer',
    };
  }

  /**
   * Generate cryptographically secure refresh token (Enterprise Standard)
   */
  private generateSecureRefreshToken(): string {
    // Generate 256-bit (32 bytes) random token
    const randomBytes = crypto.randomBytes(32);
    
    // Convert to base64url (URL-safe, no padding)
    const refreshToken = randomBytes
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    // Add prefix for token identification
    return `rtk_${refreshToken}`;
  }

  /**
   * Store refresh token in database with metadata
   */
  private async storeRefreshToken(
    refreshToken: string, 
    userId: string, 
    sessionId: string, 
    expiresAt: Date
  ): Promise<void> {
    try {
      // Hash the refresh token before storing (additional security)
      const hashedToken = await bcrypt.hash(refreshToken, 10);
      
      // Store in user_sessions table with additional metadata
      await this.userSessionService.updateSessionRefreshToken(sessionId, {
        refreshTokenHash: hashedToken,
        refreshTokenExpiresAt: expiresAt,
        lastRefreshedAt: new Date(),
      });

    } catch (error) {
      throw new Error('Failed to generate session tokens');
    }
  }

  /**
   * Find session by refresh token hash
   */
  private async findSessionByRefreshToken(refreshToken: string): Promise<any> {
    // Get all active sessions with refresh tokens
    const sessions = await this.userSessionService.getSessionsWithRefreshTokens();

    // Compare hashed tokens (constant-time comparison for security)
    for (const session of sessions) {
      if (session.refreshTokenHash) {
        const isValid = await bcrypt.compare(refreshToken, session.refreshTokenHash);
        if (isValid) {
          return session;
        }
      }
    }

    return null;
  }

  /**
   * Invalidate refresh token
   */
  async invalidateRefreshToken(refreshToken: string): Promise<void> {
    const session = await this.findSessionByRefreshToken(refreshToken);
    if (session) {
      await this.userSessionService.clearRefreshToken(session.id);
    }
  }

  /**
   * Remove sensitive data from user object (Enterprise Security)
   */
  private sanitizeUser(user: User): SanitizedUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      websiteUrl: user.website, // Use website virtual property
      status: user.status,
      role: user.role,
      authProvider: user.authProvider,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      lastActiveAt: user.lastActiveAt,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Explicitly exclude sensitive fields:
      // passwordHash, passwordResetToken, passwordResetExpires, 
      // emailVerificationToken, twoFactorSecret, providerId,
      // failedLoginAttempts, lockedUntil, metadata
    };
  }

  /**
   * Get user's active sessions (sanitized for security)
   */
  async getUserSessions(userId: string, currentSessionId?: string): Promise<any[]> {
    return this.userSessionService.getUserActiveSessionsSanitized(userId, currentSessionId);
  }

  /**
   * Get user's security statistics
   */
  async getUserSecurityStats(userId: string): Promise<any> {
    try {
      // Get user's login attempts from the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const attempts = await this.loginAttemptService.getUserAttempts(userId, thirtyDaysAgo);
      
      // Calculate statistics
      const totalAttempts = attempts.length;
      const successfulAttempts = attempts.filter(a => a.result === AttemptResult.SUCCESS && a.type === AttemptType.LOGIN).length;
      const failedAttempts = totalAttempts - successfulAttempts;
      const successRate = totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 100;

      // Group failure reasons
      const failureReasons = attempts
        .filter(a => a.result !== AttemptResult.SUCCESS)
        .reduce((acc, attempt) => {
          const reason = this.getFailureReasonText(attempt.result);
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const topFailureReasons = Object.entries(failureReasons)
        .map(([reason, count]) => ({ reason, count: count as number }))
        .sort((a, b) => (b.count as number) - (a.count as number))
        .slice(0, 5);

      // Get unique IPs
      const uniqueIPs = new Set(attempts.map(a => a.ipAddress)).size;

      // Get current user info for account status
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['failedLoginAttempts', 'lockedUntil', 'lastLoginAt'],
      });

      // Get recent sessions count
      const activeSessions = await this.userSessionService.getUserActiveSessions(userId);

      return {
        accountSecurity: {
          failedLoginAttempts: user?.failedLoginAttempts || 0,
          isLocked: user?.isLocked() || false,
          lockedUntil: user?.lockedUntil || null,
          lastLogin: user?.lastLoginAt || null,
          activeSessions: activeSessions.length,
        },
        statistics: {
          totalAttempts,
          successfulAttempts,
          failedAttempts,
          successRate,
          uniqueIPs,
          periodDays: 30,
        },
        topFailureReasons,
        recommendations: this.getSecurityRecommendations(user, attempts),
      };
    } catch (error) {
      return {
        accountSecurity: {
          failedLoginAttempts: 0,
          isLocked: false,
          lockedUntil: null,
          lastLogin: null,
          activeSessions: 0,
        },
        statistics: {
          totalAttempts: 0,
          successfulAttempts: 0,
          failedAttempts: 0,
          successRate: 100,
          uniqueIPs: 0,
          periodDays: 30,
        },
        topFailureReasons: [],
        recommendations: [],
      };
    }
  }

  /**
   * Convert attempt result to human readable text
   */
  private getFailureReasonText(result: AttemptResult): string {
    const reasonMap = {
      [AttemptResult.FAILED_PASSWORD]: 'Invalid Password',
      [AttemptResult.FAILED_USER_NOT_FOUND]: 'User Not Found',
      [AttemptResult.FAILED_ACCOUNT_LOCKED]: 'Account Locked',
      [AttemptResult.FAILED_ACCOUNT_DISABLED]: 'Account Disabled',
      [AttemptResult.FAILED_2FA]: 'Two-Factor Authentication Failed',
      [AttemptResult.FAILED_RATE_LIMIT]: 'Rate Limited',
      [AttemptResult.FAILED_SUSPICIOUS]: 'Suspicious Activity',
    };
    return reasonMap[result] || 'Unknown Error';
  }

  /**
   * Generate security recommendations based on user's activity
   */
  private getSecurityRecommendations(user: Partial<User> | null, attempts: any[]): string[] {
    const recommendations: string[] = [];

    if (user?.failedLoginAttempts > 0) {
      recommendations.push('Consider changing your password if you notice unauthorized login attempts');
    }

    if (user?.isLocked()) {
      recommendations.push('Your account is currently locked. Wait for the lockout period to expire or contact support');
    }

    const recentFailures = attempts.filter(a => 
      a.result !== AttemptResult.SUCCESS && 
      new Date(a.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (recentFailures.length > 3) {
      recommendations.push('Multiple failed login attempts detected in the last week. Enable two-factor authentication for better security');
    }

    const uniqueIPs = new Set(attempts.map(a => a.ipAddress)).size;
    if (uniqueIPs > 3) {
      recommendations.push('Logins from multiple IP addresses detected. Review your active sessions and revoke any suspicious ones');
    }

    if (recommendations.length === 0) {
      recommendations.push('Your account security looks good! Consider enabling two-factor authentication for additional protection');
    }

    return recommendations;
  }

  /**
   * Unlock a user account (admin function)
   */
  async unlockUserAccount(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'email', 'failedLoginAttempts', 'lockedUntil'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.isLocked()) {
        return; // Already unlocked
      }

      user.resetFailedAttempts();
      await this.userRepository.save(user);

    } catch (error) {
      throw new BadRequestException('Failed to unlock account');
    }
  }

  /**
   * Get user's login attempts
   */
  async getUserLoginAttempts(userId: string, since: Date): Promise<any[]> {
    return this.loginAttemptService.getUserAttempts(userId, since);
  }

  /**
   * Debug: Get user security info with raw database data
   */
  async getUserDebugInfo(userId: string): Promise<any> {
    try {
      // Get user with security fields
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'email', 'failedLoginAttempts', 'lockedUntil', 'lastLoginAt', 'createdAt'],
      });

      // Get login attempts debug info
      const attempts = await this.loginAttemptService.getDebugAttempts(userId, user?.email);

      return {
        user: {
          id: user?.id,
          email: user?.email,
          failedLoginAttempts: user?.failedLoginAttempts,
          isLocked: user?.isLocked(),
          lockedUntil: user?.lockedUntil,
          lastLoginAt: user?.lastLoginAt,
          createdAt: user?.createdAt,
        },
        attempts,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Terminate specific session
   */
  async terminateSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.userSessionService.findValidSession(sessionId, userId);
    if (!session) {
      throw new ForbiddenException('Session not found or access denied');
    }

    await this.userSessionService.invalidateSession(sessionId);
  }

  /**
   * Terminate all user sessions except current
   */
  async terminateAllOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    await this.userSessionService.invalidateUserSessionsExcept(userId, currentSessionId);
  }

  /**
   * Check if email already exists
   */
  async checkEmailExists(email: string): Promise<boolean> {
    // Email validation is handled by class-validator decorators in DTOs
    // and ValidationPipe in the controller, so we don't need manual validation here
    
    const user = await this.userRepository.findOne({ 
      where: { email: email.toLowerCase() },
      select: ['id', 'emailVerified']
    });
    
    // Return true if user exists (regardless of verification status)
    // This prevents enumeration of verified vs unverified accounts
    return !!user;
  }

  /**
   * Check if username already exists
   */
  async checkUsernameExists(username: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ 
      where: { username: username.toLowerCase() },
      select: ['id']
    });
    return !!user;
  }
}
