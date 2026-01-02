import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: createUserDto.email }, { phone: createUserDto.phone }],
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'User with this email or phone already exists',
      );
    }

    // Hash password if provided
    let hashedPassword = createUserDto.password;
    if (createUserDto.password) {
      hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    }

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        isActive: true, // Auto-activate for direct creation (not registration)
      },
    });

    // Return user without sensitive data
    const { password, otpCode, otpExpires, hashedRefreshToken, ...result } =
      user;
    return result;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        region: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        password: true,
        otpCode: true,
        otpExpires: true,
        hashedRefreshToken: true,
      },
    });

    return users.map((user) => {
      const { password, otpCode, otpExpires, hashedRefreshToken, ...result } =
        user;
      return result;
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        assets: true,
        orders: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            totalPrice: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Return user without sensitive data
    const { password, otpCode, otpExpires, hashedRefreshToken, ...result } =
      user;
    return result;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check for duplicate email/phone if provided
    if (updateUserDto.email && existingUser.email !== updateUserDto.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: { email: updateUserDto.email },
      });
      if (emailExists) {
        throw new BadRequestException('Email already in use');
      }
    }

    if (updateUserDto.phone && existingUser.phone !== updateUserDto.phone) {
      const phoneExists = await this.prisma.user.findFirst({
        where: { phone: updateUserDto.phone },
      });
      if (phoneExists) {
        throw new BadRequestException('Phone number already in use');
      }
    }

    // Hash password if provided
    let hashedPassword = existingUser.password;
    if (updateUserDto.password) {
      hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        password: hashedPassword,
      },
    });

    // Return user without sensitive data
    const { password, otpCode, otpExpires, hashedRefreshToken, ...result } =
      updatedUser;
    return result;
  }

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: `User with ID ${id} has been deleted` };
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }
}
