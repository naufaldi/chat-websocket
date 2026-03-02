import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPassword123', description: 'Current password' })
  @IsString()
  @MinLength(1, { message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({ example: 'NewSecurePass456', description: 'New password (min 8 chars, must contain uppercase, lowercase, and number)' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(100, { message: 'Password must be at most 100 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  newPassword: string;

  @ApiProperty({ example: 'NewSecurePass456', description: 'Confirm new password' })
  @IsString()
  @MinLength(1, { message: 'Please confirm your password' })
  confirmPassword: string;
}
