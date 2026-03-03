import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class StaffSurveyAdditionalCommentDTO {
  @Field({ nullable: true })
  display_name: string;

  @Field({ nullable: true })
  faculty: string;

  @Field({ nullable: true })
  additional_comment: string;
}
