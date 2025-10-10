import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { RequestUserDto } from './dto/user.dto';
import * as crypto from 'crypto';
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
    const { valid, staffName, error } = await this.verifyBearerToken(token);

    if (valid) {
      const user = await this.userService.findByDisplayName(staffName);
      if (user) return user;
      else throw new UnauthorizedException('User not found');
    } else {
      throw new UnauthorizedException(error);
    }
  }

  async verifyBearerToken(token) {
    const secret = this.configService.get<string>('SECRET_KEY');
    try {
      const parts = token.split('.');
      if (parts.length !== 2) {
        return { valid: false, error: 'Invalid token format' };
      }

      const [data, providedSignature] = parts;

      const lastDashIndex = data.lastIndexOf('-');
      if (lastDashIndex === -1) {
        return { valid: false, error: 'Invalid data format' };
      }

      const staffName = data.substring(0, lastDashIndex);
      const timestamp = data.substring(lastDashIndex + 1);

      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(data);
      const calculatedSignature = hmac.digest('base64');

      if (calculatedSignature !== providedSignature) {
        return { valid: false, error: 'Invalid signature' };
      }

      const tokenAge = Date.now() - parseInt(timestamp);
      const maxAge = 3600000;

      if (tokenAge > maxAge) {
        return { valid: false, error: 'Token expired' };
      }

      return {
        valid: true,
        staffName: staffName,
        timestamp: parseInt(timestamp),
        age: tokenAge,
      };
    } catch (error) {
      return { valid: false, error: error.message };
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
