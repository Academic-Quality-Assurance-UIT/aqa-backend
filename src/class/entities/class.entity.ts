import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Lecturer } from 'src/lecturer/entities/lecturer.entity';
import { Point } from 'src/point/entities/point.entity';
import { Semester } from 'src/semester/entities/semester.entity';
import { Subject } from 'src/subject/entities/subject.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';

@ObjectType()
@Entity({ name: 'class' })
export class Class {
  @PrimaryColumn()
  @Field(() => String)
  class_id: string;

  @Column()
  @Field()
  display_name: string;

  @ManyToOne(() => Semester)
  @JoinColumn({ name: 'semester_id' })
  semester: Semester;

  @Column()
  semester_id: string;

  @Column()
  @Field()
  program: string;

  @Column()
  @Field()
  class_type: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column()
  subject_id: string;

  @ManyToOne(() => Lecturer, (lecturer) => lecturer.classes)
  @JoinColumn({ name: 'lecturer_id' })
  lecturer: Lecturer;

  @Column()
  lecturer_id: string;

  @Column()
  @Field(() => Int, { nullable: true, defaultValue: 0 })
  total_student: number;

  @Column()
  @Field(() => Int, { nullable: true, defaultValue: 0 })
  participating_student: number;

  @OneToMany(() => Point, (point) => point.class)
  points: Point[];
}
