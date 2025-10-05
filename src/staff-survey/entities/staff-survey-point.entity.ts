import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { StaffSurveyCriteria } from './staff-survey-criteria.entity';
import { StaffSurveySheet } from './staff-survey-sheet.entity';

@ObjectType()
@Entity()
export class StaffSurveyPoint {
  @Field()
  @PrimaryColumn('uuid', { default: () => 'uuid_generate_v4()' })
  staff_survey_point_id: string;

  @Column({ type: 'int' })
  @Field(() => Int)
  max_point: number;

  @Column({ type: 'int' })
  @Field(() => Int)
  point: number;

  @Column({ nullable: true })
  @Field({ nullable: true })
  comment: string;

  @ManyToOne(() => StaffSurveyCriteria, { cascade: false })
  @JoinColumn({ name: 'staff_survey_criteria_id' })
  @Field(() => StaffSurveyCriteria, { nullable: true })
  criteria: StaffSurveyCriteria;

  @ManyToOne(() => StaffSurveySheet, { cascade: false })
  @JoinColumn({ name: 'staff_survey_sheet_id' })
  @Field(() => StaffSurveySheet, { nullable: true })
  sheet: StaffSurveySheet;
}
