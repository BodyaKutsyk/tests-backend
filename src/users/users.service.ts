import { Injectable } from '@nestjs/common';
import { MoreThan, Repository, Equal, QueryFailedError } from 'typeorm';
import { User } from '../entities/user.js';
import { InjectRepository } from '@nestjs/typeorm';
import { CursorDto } from '../types/cursor.dto.js';
import { encodeCursor } from '../utils/encode-cursor.js';
import { PaginatedResponse } from '../types/response.js';
import { CreateUserDto } from './types/user.dto.js';
import { encodeBase64 } from '../utils/base64.js';
import { ConflictProblem } from '../exceptions/problem-errors.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}
  async getAll(
    limit: number,
    cursor?: CursorDto,
  ): Promise<PaginatedResponse<User>> {
    const users = await this.usersRepo.find({
      ...(!!cursor && {
        where: [
          { createdAt: MoreThan(cursor.createdAt) },
          { createdAt: Equal(cursor.createdAt), id: MoreThan(cursor.id) },
        ],
      }),
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
    const lastItem = users[users.length - 1];
    const nextCursor = encodeCursor({
      id: lastItem.id,
      createdAt: lastItem.createdAt,
    });

    return {
      items: users,
      nextCursor,
    };
  }

  async getById(id: string): Promise<User> {
    return this.usersRepo.findOneOrFail({ where: { id } });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { password, ...parsed } = createUserDto;
    // TODO: encoded like that before adding auth
    const passwordHash = encodeBase64(password);
    try {
      return await this.usersRepo.save({ ...parsed, passwordHash });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        error.driverError.code === '23505'
      ) {
        throw new ConflictProblem({
          detail: 'User with this email is already exists!',
        });
      }
      throw error;
    }
  }

  async update(
    id: string,
    updateUserDto: Partial<CreateUserDto>,
  ): Promise<User> {
    const { password, ...parsed } = updateUserDto;
    return this.usersRepo.save({ id, ...parsed });
  }

  async delete(id: string): Promise<void> {
    await this.usersRepo.softDelete(id);
  }
}
