import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './jwt.strategy';

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; username: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email ya registrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.users.create({
        email: dto.email,
        username: dto.username,
        passwordHash,
      });
      return this.sign(user);
    } catch (e) {
      if ((e as { code?: string }).code === '23505') {
        throw new ConflictException('Email o username ya en uso');
      }
      throw e;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Credenciales invalidas');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales invalidas');
    return this.sign(user);
  }

  private sign(user: { id: string; email: string; username: string }): AuthResponse {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const token = this.jwt.sign(payload);
    return {
      token,
      user: { id: user.id, email: user.email, username: user.username },
    };
  }
}
