import { Field, ObjectType } from '@nestjs/graphql';
import { Faculty } from 'src/faculty/entities/faculty.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../enums/role.enum';
import { Lecturer } from 'src/lecturer/entities/lecturer.entity';

@ObjectType()
@Entity()
export class UserEntity {
  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => Role)
  @Column({ type: 'enum', enum: Object.values(Role) })
  role: string;

  @Field(() => String)
  @Column({ default: '', nullable: true })
  displayName: string;

  @Field(() => String)
  @Column()
  username: string;

  @ManyToOne(() => Faculty, { nullable: true })
  faculty?: Faculty;

  @ManyToOne(() => Lecturer, { nullable: true })
  lecturer?: Lecturer;

  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  password: string;

  @Field(() => Date, { nullable: true, defaultValue: new Date() })
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    default: new Date(),
  })
  lastAccess: Date;

  @Field(() => Date, { nullable: true, defaultValue: new Date() })
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    default: new Date(),
  })
  lastSendEmail: Date;
}
