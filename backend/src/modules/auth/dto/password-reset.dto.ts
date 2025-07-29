import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'user@example.com'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string; 
}

export class ResetPasswordDto {
  @ApiProperty({ 
    description: 'Password reset token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;

  @ApiProperty({ 
    description: 'New password',
    example: 'NewPassword123!'
  })
  @IsNotEmpty({ message: 'New password is required' })
  newPassword: string;

  @ApiProperty({ 
    description: 'New password confirmation',
    example: 'NewPassword123!'
  })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmPassword: string;
}
