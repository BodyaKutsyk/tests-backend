import { IsDate, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CursorDto {
  @IsUUID()
  id: string;
  @Transform(({ value }) => new Date(value))
  @IsDate()
  createdAt: Date;
}