import { Field, ObjectType } from '@nestjs/graphql';
import { Class } from 'src/class/entities/class.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

@ObjectType()
@Entity({ name: 'comment' })
export class Comment {
  @PrimaryColumn()
  @Field(() => String)
  comment_id: string;

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'class_id' })
  @Field(() => Class, { nullable: true })
  class: Class;

  @Column({ name: 'content' })
  @Field()
  display_name: string;

  @Column()
  @Field(() => String)
  type: string;

  @Column({
    type: 'text',
    array: true,
    default: [],
    nullable: true,
  })
  @Field(() => [String])
  type_list: string[];

  @Column()
  @Field(() => String)
  topic: string;
}
