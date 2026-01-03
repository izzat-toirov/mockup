import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from '../mail/mail.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterAuthDto) {
    // Validate that both email and phone are provided (as required by DB schema)
    if (!dto.email) {
      throw new BadRequestException('Email is required');
    }
    if (!dto.phone) {
      throw new BadRequestException('Phone is required');
    }

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

    if (!user.otpExpires || user.otpExpires < new Date()) {
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

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    // Generate OTP for password reset
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with new OTP for password reset
    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        otpCode,
        otpExpires,
      },
    });

    // Send OTP via email for password reset
    await this.mailService.sendPasswordResetOtp(dto.email, otpCode);

    return { message: 'Password reset OTP sent successfully' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    // Check if OTP matches and is not expired
    if (user.otpCode !== dto.otp) {
      throw new BadRequestException('Invalid OTP code');
    }

    if (!user.otpExpires || user.otpExpires < new Date()) {
      throw new BadRequestException('OTP code has expired');
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update user's password and clear OTP
    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        password: hashedNewPassword,
        otpCode: null,
        otpExpires: null,
      },
    });

    return { message: 'Password reset successfully' };
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

    const jwtSecret = this.configService.get<string>('JWT_SECRET', {
      infer: true,
    });
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const refreshTokenSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      { infer: true },
    );
    if (!refreshTokenSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is not set');
    }

    const accessToken = this.jwt.sign(payload, {
      expiresIn: '15m',
      secret: jwtSecret,
    });

    const refreshToken = this.jwt.sign(payload, {
      expiresIn: '7d',
      secret: refreshTokenSecret,
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
