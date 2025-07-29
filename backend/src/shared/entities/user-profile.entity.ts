import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsOptional, IsBoolean, IsDateString, IsPhoneNumber, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity('user_profiles')
@Index(['isPublic'])
@Index(['location'])
@Index(['userId'], { unique: true })
export class UserProfile {
  @ApiProperty({ description: 'Unique identifier for the user profile' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'User ID this profile belongs to' })
  @Column({ name: 'user_id' })
  userId!: string;

  @ApiPropertyOptional({ description: 'User first name' })
  @Column({ name: 'first_name', length: 100, nullable: true })
  @IsOptional()
  @Length(1, 100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'User last name' })
  @Column({ name: 'last_name', length: 100, nullable: true })
  @IsOptional()
  @Length(1, 100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'User biography' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @Length(0, 1000, { message: 'Bio must not exceed 1000 characters' })
  bio?: string;

  @ApiPropertyOptional({ description: 'User location' })
  @Column({ length: 200, nullable: true })
  @IsOptional()
  @Length(1, 200)
  location?: string;

  @ApiPropertyOptional({ description: 'User website URL' })
  @Column({ length: 500, nullable: true })
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: 'User date of birth' })
  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: Date;

  @ApiPropertyOptional({ description: 'User phone number' })
  @Column({ name: 'phone_number', length: 20, nullable: true })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiProperty({ description: 'Whether profile is public', default: true })
  @Column({ name: 'is_public', default: true })
  @IsBoolean()
  isPublic!: boolean;

  @ApiProperty({ description: 'Whether user allows followers', default: true })
  @Column({ name: 'allow_followers', default: true })
  @IsBoolean()
  allowFollowers!: boolean;

  @ApiProperty({ description: 'Whether user allows direct messages', default: true })
  @Column({ name: 'allow_direct_messages', default: true })
  @IsBoolean()
  allowDirectMessages!: boolean;

  @ApiPropertyOptional({ description: 'Profile views count' })
  @Column({ name: 'view_count', default: 0 })
  viewCount!: number;

  @ApiPropertyOptional({ description: 'Additional profile metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata?: any;

  @ApiProperty({ description: 'Profile creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ description: 'Profile last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relationships
  @OneToOne(() => User, (user) => user.profile)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
