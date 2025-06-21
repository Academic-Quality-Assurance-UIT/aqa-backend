import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { QueryArgs } from 'src/common/args/query.arg';
import { PointByCategoryDTO } from './dtos/point-by-category.dto';
import { PointByCriteriaDTO } from './dtos/point-by-criteria.dto';
import { StaffSurveyPointResponseDTO } from './dtos/staff-survey-point.dto';
import { StaffSurveySheetDTO } from './dtos/staff-survey-sheet.dto';
import { StaffSurveyBatch } from './entities/staff-survey-batch.entity';
import { StaffSurveyCriteria } from './entities/staff-survey-criteria.entity';
import { StaffSurveySheet } from './entities/staff-survey-sheet.entity';
import { StaffSurveyService } from './staff-survey.service';

@Resolver(() => StaffSurveySheet)
export class StaffSurveyResolver {
  constructor(private readonly staffSurveyService: StaffSurveyService) {}

  @Mutation(() => StaffSurveySheet, {
    name: 'addNewStaffSurveyData',
    description: 'Add new staff survey data',
  })
  async create(
    @Args('data', { type: () => StaffSurveySheetDTO })
    data: StaffSurveySheetDTO,
  ) {
    return await this.staffSurveyService.create(data);
  }

  @Mutation(() => [StaffSurveySheet], {
    name: 'addListStaffSurveyData',
    description: 'Add new staff survey data',
  })
  async createList(
    @Args('data', { type: () => [StaffSurveySheetDTO] })
    data: StaffSurveySheetDTO[],
  ) {
    return await Promise.all(
      data.map((item) => this.staffSurveyService.create(item)),
    );
  }

  @Query(() => [StaffSurveyCriteria])
  async getCriteriaList() {
    return await this.staffSurveyService.getCriteriaList();
  }

  @Query(() => [StaffSurveyBatch])
  async getBatchList() {
    return await this.staffSurveyService.getBatchList();
  }

  @Query(() => [PointByCategoryDTO])
  async getPointsByCategory() {
    return await this.staffSurveyService.getPointsByCategory();
  }

  @Query(() => [PointByCriteriaDTO])
  async getPointsByCriteria(
    @Args('category', { type: () => String, nullable: true }) category?: string,
  ) {
    return await this.staffSurveyService.getPointsByCriteria(category);
  }

  @Query(() => StaffSurveyPointResponseDTO)
  async getPointWithCommentByCriteria(
    @Args() { pagination }: QueryArgs,
    @Args('category', { type: () => String, nullable: true }) category?: string,
  ) {
    return await this.staffSurveyService.getPointWithCommentByCriteria(
      category,
      pagination,
    );
  }
}
