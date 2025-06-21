import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/dto/Paginated.dto';

@InputType()
export class StaffSurveyPointDTO {
  @Field(() => Int)
  max_point: number;

  @Field(() => Int)
  point: number;

  @Field({ nullable: true })
  comment: string;

  @Field({ nullable: true })
  criteria_name: string;

  @Field({ nullable: true })
  criteria_category: string;

  @Field(() => Int, { nullable: true })
  criteria_index: number;
}

@ObjectType()
export class StaffSurveyPointResponseItemDTO {
  @Field(() => Int)
  point: number;

  @Field({ nullable: true })
  comment: string;

  @Field()
  criteria: string;

  @Field()
  index: number;
}

@ObjectType()
export class StaffSurveyPointResponseDTO extends Paginated(
  StaffSurveyPointResponseItemDTO,
) {}
