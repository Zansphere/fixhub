import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CustomerQueryDto extends PaginationDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ obj, key }) => obj[key] === 'true' ? true : obj[key] === 'false' ? false : obj[key])
  @IsBoolean()
  isActive?: boolean;
}

export class TechnicianQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: VerificationStatus })
  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ obj, key }) => obj[key] === 'true' ? true : obj[key] === 'false' ? false : obj[key])
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ obj, key }) => obj[key] === 'true' ? true : obj[key] === 'false' ? false : obj[key])
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive!: boolean;
}

export class VerifyTechnicianDto {
  @ApiProperty({ enum: VerificationStatus, example: VerificationStatus.VERIFIED })
  @IsEnum(VerificationStatus)
  status!: VerificationStatus;

  @ApiPropertyOptional({ example: 'Documents missing' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionNote?: string;
}
