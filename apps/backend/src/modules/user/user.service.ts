import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: { email: string; name: string; password: string }) {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
      },
    });
  }

  async updateProfile(userId: string, data: { name?: string; avatarUrl?: string | null }) {
    await this.findById(userId);

    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async updatePassword(userId: string, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async updateRefreshToken(userId: string, hashedToken: string | null, expiresAt: Date | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: hashedToken,
        refreshTokenExpiresAt: expiresAt,
      },
    });
  }

  async searchUsers(query: string) {
    if (query.length < 2) return [];

    return this.prisma.user.findMany({
      where: {
        deactivatedAt: null,
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
      take: 10,
    });
  }

  stripPassword(user: { password: string; refreshToken?: string | null; refreshTokenExpiresAt?: Date | null; [key: string]: unknown }) {
    const { password, refreshToken, refreshTokenExpiresAt, ...result } = user;
    return result;
  }
}
