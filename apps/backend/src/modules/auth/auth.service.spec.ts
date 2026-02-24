import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';

describe('AuthService', () => {
  let authService: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    password: '',
    avatarUrl: null,
    refreshToken: null,
    refreshTokenExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockUser.password = await bcrypt.hash('password123', 12);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            create: jest.fn(),
            updatePassword: jest.fn(),
            updateRefreshToken: jest.fn(),
            stripPassword: jest.fn().mockImplementation((user) => {
              const { password, refreshToken, ...rest } = user;
              return rest;
            }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_ACCESS_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      userService.create.mockResolvedValue(mockUser);

      const result = await authService.register({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      });

      expect(result.user).toBeDefined();
      expect(result.tokens.accessToken).toBe('mock-token');
      expect(result.tokens.refreshToken).toBe('mock-token');
      expect(userService.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      });
    });

    it('should throw ConflictException for duplicate email', async () => {
      userService.create.mockRejectedValue(
        new ConflictException('Email already registered'),
      );

      await expect(
        authService.register({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully and return tokens', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);

      const result = await authService.login('test@example.com', 'password123');

      expect(result.user).toBeDefined();
      expect(result.tokens.accessToken).toBe('mock-token');
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login('wrong@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.login('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should clear refresh token', async () => {
      await authService.logout('user-1');

      expect(userService.updateRefreshToken).toHaveBeenCalledWith(
        'user-1',
        null,
        null,
      );
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens for valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
      const userWithRefresh = {
        ...mockUser,
        refreshToken: hashedRefreshToken,
        refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'test@example.com',
      });
      userService.findByEmail.mockResolvedValue(userWithRefresh);

      const result = await authService.refreshTokens(refreshToken);

      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });

    it('should throw for expired/invalid JWT refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(
        authService.refreshTokens('expired-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for mismatched refresh token', async () => {
      const hashedRefreshToken = await bcrypt.hash('different-token', 12);
      const userWithRefresh = {
        ...mockUser,
        refreshToken: hashedRefreshToken,
        refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'test@example.com',
      });
      userService.findByEmail.mockResolvedValue(userWithRefresh);

      await expect(
        authService.refreshTokens('wrong-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('should change password and clear refresh token', async () => {
      userService.findById.mockResolvedValue(mockUser);

      await authService.changePassword('user-1', 'password123', 'newpassword123');

      expect(userService.updatePassword).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
      );
      expect(userService.updateRefreshToken).toHaveBeenCalledWith(
        'user-1',
        null,
        null,
      );
    });

    it('should throw UnauthorizedException for wrong current password', async () => {
      userService.findById.mockResolvedValue(mockUser);

      await expect(
        authService.changePassword('user-1', 'wrongpassword', 'newpassword123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if new password matches current', async () => {
      await expect(
        authService.changePassword('user-1', 'password123', 'password123'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
