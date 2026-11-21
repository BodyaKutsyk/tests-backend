import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Optional } from '@nestjs/common';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @Optional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @Optional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @IsNotEmpty()
  @IsString()
  passwordHash: string;
}
