import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { CurrentUser } from 'src/user/decorator/user.decorator';
import { UserEntity } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
import { RequestUserDto } from './dto/user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthDto } from './dto/auth.dto';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly jwtService: JwtService,
    private authService: AuthService,
    private userService: UserService,
  ) {}

  @Mutation(() => AuthDto)
  async login(@Args() credential: RequestUserDto) {
    const user = await this.authService.validateUser(credential);
    if (user) return this.authService.login(user);
    else throw new UnauthorizedException();
  }

  @Mutation(() => AuthDto)
  async loginIntegration(@Args('token') token: string) {
    const user = await this.authService.validateUserByToken(token);
    if (user) return this.authService.login(user);
    else throw new UnauthorizedException();
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => UserEntity)
  async currentUser(@CurrentUser() user: UserEntity) {
    return this.userService.findByUsername(user.username);
  }
}
