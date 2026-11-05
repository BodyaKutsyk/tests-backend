import { Injectable } from '@nestjs/common';
import { Equal, MoreThan, QueryFailedError, Repository } from 'typeorm';
import { User } from '../entities/user.js';
import { InjectRepository } from '@nestjs/typeorm';
import { CursorDto } from '../types/cursor.dto.js';
import { encodeCursor } from '../utils/encode-cursor.js';
import { PaginatedResponse } from '../types/response.js';
import { CreateUserDto } from './types/user.dto.js';
import { encodeBase64 } from '../utils/base64.js';
import {
  ConflictProblem,
  NotFoundProblem,
} from '../exceptions/problem-errors.js';
import { Quota, QuotaType } from '../entities/quota.js';

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

    if (!users.length) {
      return {
        items: users,
      };
    }

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
    const user = await this.usersRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundProblem({ detail: `User ${id} not found` });
    }

    return user;
  }

  async getWithQuota(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id },
      relations: { quotas: true },
    });

    if (!user) {
      throw new NotFoundProblem({ detail: `User ${id} not found` });
    }

    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { password, ...parsed } = createUserDto;
    const basicStorageQuota: Partial<Quota> = {
      maxLimit: 104_857_600,
      quotaType: QuotaType.Storage,
    };
    const basicGenerationQuota: Partial<Quota> = {
      maxLimit: 1000,
      quotaType: QuotaType.Generation,
    };

    // TODO: encoded like that before adding auth
    const passwordHash = encodeBase64(password);
    try {
      return await this.usersRepo.save({
        ...parsed,
        passwordHash,
        quotas: [basicStorageQuota, basicGenerationQuota],
      });
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
