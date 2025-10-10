import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { RequestUserDto } from './dto/user.dto';
import crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(userRequest: RequestUserDto): Promise<UserEntity> {
    const user = await this.userService.findByUsername(userRequest.username);
    if (user && (await bcrypt.compare(userRequest.password, user.password)))
      return user;
    else throw new UnauthorizedException();
  }

  async validateUserByToken(token: string): Promise<UserEntity> {
    const { valid, staffName } = await this.verifyBearerToken(token);

    if (valid) {
      const user = await this.userService.findByDisplayName(staffName);
      if (user) return user;
      else throw new UnauthorizedException('User not found');
    } else {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async verifyBearerToken(token) {
    const secret = this.configService.get<string>('SECRET_KEY');
    try {
      const [data, signature] = token.split('.');
      if (!data || !signature) {
        return { valid: false, reason: 'Invalid token format' };
      }

      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(data);
      const expectedSignature = hmac.digest('base64');

      // Timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
      if (!isValid) {
        return { valid: false, reason: 'Invalid signature' };
      }

      const [staffName, timestampStr] = data.split('-');
      const timestamp = parseInt(timestampStr, 10);
      if (isNaN(timestamp)) {
        return { valid: false, reason: 'Invalid timestamp' };
      }

      // Optional: check expiry (e.g., 5 minutes)
      const now = Date.now();
      const FIVE_MINUTES = 5 * 60 * 1000;
      if (now - timestamp > FIVE_MINUTES) {
        return { valid: false, reason: 'Token expired' };
      }

      return { valid: true, staffName, timestamp };
    } catch (err) {
      return { valid: false, reason: err.message };
    }
  }

  async login(user: UserEntity) {
    const payload = { ...user, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '100d' }),
      user,
    };
  }
}
