import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CursorDto } from '../types/cursor.dto.js';
import { Cursor } from '../decorators/cursor.decorator.js';
import { PaginatedResponse } from '../types/response.js';
import { Role, User } from '../entities/user.js';
import { CreateUserDto } from './types/user.dto.js';
import { Roles } from '../decorators/roles.decorator.js';
import { type AuthenticatedRequest } from '../types/request.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.Admin)
  @Get()
  getAll(
    @Query('limit') limit: number = 10,
    @Cursor() cursor?: CursorDto,
  ): Promise<PaginatedResponse<User>> {
    return this.usersService.getAll(limit, cursor);
  }

  @Get(':id')
  getById(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    id: string,
  ): Promise<User> {
    return this.usersService.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    updateUserDto: Partial<CreateUserDto>,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    return this.usersService.delete(id);
  }
}
