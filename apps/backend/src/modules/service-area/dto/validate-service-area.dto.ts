import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class ValidateServiceAreaDto {
  @ApiProperty({ example: '600099' })
  @Matches(/^\d{6}$/)
  pincode!: string;

  @ApiPropertyOptional({ example: 13.0827 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 80.2707 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}
