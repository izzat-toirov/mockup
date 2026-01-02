import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { MailService } from '../mail/mail.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterAuthDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.phone }],
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'User with this email or phone already exists',
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user with OTP
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
        region: dto.region,
        address: dto.address,
        role: dto.role,
        otpCode,
        otpExpires,
      },
    });

    // Send OTP via email
    await this.mailService.sendOtp(dto.email, otpCode);

    // Return user without sensitive data
    const {
      password,
      otpCode: _,
      otpExpires: __,
      hashedRefreshToken,
      ...result
    } = user;
    return result;
  }

  async login(dto: LoginAuthDto) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ForbiddenException(
        'Your account is not activated. Please verify your OTP.',
      );
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        region: user.region,
        address: user.address,
        isActive: user.isActive,
      },
      ...tokens,
    };
  }

  async sendOtp(dto: SendOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with new OTP
    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        otpCode,
        otpExpires,
      },
    });

    // Send OTP via email
    await this.mailService.sendOtp(dto.email, otpCode);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    // Check if OTP matches and is not expired
    if (user.otpCode !== dto.otpCode) {
      throw new BadRequestException('Invalid OTP code');
    }

    if (user.otpExpires < new Date()) {
      throw new BadRequestException('OTP code has expired');
    }

    // Activate user and clear OTP
    const updatedUser = await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        isActive: true,
        otpCode: null,
        otpExpires: null,
      },
    });

    // Return user without sensitive data
    const { password, otpCode, otpExpires, hashedRefreshToken, ...result } =
      updatedUser;
    return result;
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException('Access denied');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );

    if (!refreshTokenMatches) {
      throw new ForbiddenException('Access denied');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: number) {
    await this.prisma.user.updateMany({
      where: { id: userId, hashedRefreshToken: { not: null } },
      data: { hashedRefreshToken: null },
    });
  }

  async generateTokens(userId: number, email: string, role: string) {
    const payload = {
      sub: userId,
      email,
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: '15m',
      secret: process.env.JWT_SECRET || 'default_secret_key',
    });

    const refreshToken = this.jwt.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_key',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async updateRefreshToken(userId: number, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }
}
