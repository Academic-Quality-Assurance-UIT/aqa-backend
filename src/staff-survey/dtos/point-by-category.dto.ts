import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PointByCategoryDTO {
  @Field()
  category: string;

  @Field(() => Float)
  avg_point: number;
}
