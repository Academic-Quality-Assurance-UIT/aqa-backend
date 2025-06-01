import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PointByCriteriaDTO {
  @Field()
  criteria: string;

  @Field(() => Float)
  avg_point: number;
}
