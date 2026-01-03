import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { Request } from 'express';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService, // ✅ DB dan tekshirish uchun
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request | any = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token mavjud emas');
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token noto‘g‘ri formatda');
    }

    let payload: any;
    const accessSecret = this.configService.get<string>('ACCESS_TOKEN_KEY');
    if (!accessSecret) {
      throw new Error('ACCESS_TOKEN_KEY environment variable is not set');
    }
    try {
      payload = await this.jwtService.verify(token, {
        secret: accessSecret,
      });
    } catch (error) {
      throw new UnauthorizedException('Token noto‘g‘ri yoki muddati tugagan');
    }

    if (!payload) {
      throw new UnauthorizedException('Token noto‘g‘ri');
    }

    // DB dan userni olish
    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Siz faol foydalanuvchi emassiz');
    }

    req.user = user; // ✅ faqat userni yozamiz, payloadni emas
    return true;
  }
}
