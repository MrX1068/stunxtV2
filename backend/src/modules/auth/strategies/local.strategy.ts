import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true, // This allows us to access the request object
    });
  }

  async validate(req: any, email: string, password: string): Promise<any> {
    // Extract IP and User-Agent from request
    const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    // Store these in the request for the controller to use
    req.authContext = { ipAddress, userAgent };
    
    // Use the enhanced validateUser method that includes security checks
    const user = await this.authService.validateUserWithSecurity(email, password, ipAddress, userAgent);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
