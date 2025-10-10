import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
  ) {}

  async create(user: UserDto): Promise<UserEntity> {
    if (await this.userRepo.findOneBy({ username: user.username })) {
      throw new ConflictException('Conflict');
    }
    return this.userRepo.save({
      ...user,
      password: await bcrypt.hash(user.password, 0),
      ...(user.facultyId
        ? {
            faculty: { faculty_id: user.facultyId || undefined },
          }
        : {}),
      ...(user.lecturerId
        ? {
            lecturer: { lecturer_id: user.lecturerId || undefined },
          }
        : {}),
    });
  }

  async findByUsername(username: string) {
    return this.userRepo.findOne({
      where: { username },
      relations: { faculty: true, lecturer: true },
    });
  }

  async findByDisplayName(displayName: string) {
    return this.userRepo.findOne({
      where: { displayName },
      relations: { faculty: true, lecturer: true },
    });
  }

  async findAll(name?: string) {
    return this.userRepo
      .createQueryBuilder('User')
      .leftJoinAndSelect('User.faculty', 'Faculty')
      .leftJoinAndSelect('User.lecturer', 'Lecturer')
      .where(
        name
          ? `unaccent(User.displayName) ilike ('%' || unaccent(:keyword) || '%')`
          : '',
        { keyword: name || '' },
      )
      .orWhere(
        name
          ? `unaccent(User.username) ilike ('%' || unaccent(:keyword) || '%')`
          : '',
        { keyword: name || '' },
      )
      .getMany();
  }

  async findById(id: string) {
    return this.userRepo.findOne({
      where: { id },
      relations: { faculty: true, lecturer: true },
    });
  }

  async update(id: string, userDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) throw new Error('User not found');

    Object.assign(user, userDto);

    if (userDto.password) {
      user.password = await bcrypt.hash(userDto.password, 0);
    }

    return this.userRepo.save({
      ...user,
      ...(userDto.facultyId
        ? {
            faculty: { faculty_id: userDto.facultyId || undefined },
          }
        : {}),
      ...(userDto.lecturerId
        ? {
            lecturer: { lecturer_id: userDto.lecturerId || undefined },
          }
        : {}),
    });
  }

  remove(id: string) {
    return this.userRepo.delete({ id });
  }
}
