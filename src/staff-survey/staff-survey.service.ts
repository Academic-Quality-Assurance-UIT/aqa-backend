import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as moment from 'moment';
import { Repository } from 'typeorm';
import { StaffSurveySheetDTO } from './dtos/staff-survey-sheet.dto';
import { StaffSurveyBatch } from './entities/staff-survey-batch.entity';
import { StaffSurveyCriteria } from './entities/staff-survey-criteria.entity';
import { StaffSurveyPoint } from './entities/staff-survey-point.entity';
import { StaffSurveySheet } from './entities/staff-survey-sheet.entity';
import { PaginationArgs } from 'src/common/args/pagination.arg';

@Injectable()
export class StaffSurveyService {
  constructor(
    @InjectRepository(StaffSurveySheet)
    private repo: Repository<StaffSurveySheet>,
    @InjectRepository(StaffSurveyBatch)
    private staffSurveyBatchRepo: Repository<StaffSurveyBatch>,
    @InjectRepository(StaffSurveyCriteria)
    private staffSurveyCriteriaRepo: Repository<StaffSurveyCriteria>,
    @InjectRepository(StaffSurveyPoint)
    private staffSurveyPointRepo: Repository<StaffSurveyPoint>,
  ) {}

  async create(inputData: StaffSurveySheetDTO) {
    const { survey_name: surveyName, points, ...data } = inputData;

    const batch = await this.getBatch(surveyName, inputData.semester);

    const surveySheet = (
      await this.repo.insert({
        ...data,
        batch: {
          staff_survey_batch_id: batch.staff_survey_batch_id,
        },
      })
    ).identifiers[0] as StaffSurveySheet;

    await Promise.all(
      points.map(async (_point) => {
        const point = { ..._point };
        const criteria = await this.getCriteria({
          ...point,
          semester: inputData.semester,
        });

        return await this.staffSurveyPointRepo.insert({
          ...point,
          sheet: {
            staff_survey_sheet_id: surveySheet.staff_survey_sheet_id,
          },
          criteria,
        });
      }),
    );

    return surveySheet;
  }

  async getCriteriaList() {
    return await this.staffSurveyCriteriaRepo.find({});
  }

  async getBatchList() {
    return await this.staffSurveyBatchRepo.find({});
  }

  async getSemesterList(): Promise<string[]> {
    const result = await this.staffSurveyBatchRepo
      .createQueryBuilder('batch')
      .select('DISTINCT batch.semester', 'semester')
      .where('batch.semester IS NOT NULL')
      .orderBy('batch.semester', 'DESC')
      .getRawMany();
    return result.map((r) => r.semester);
  }

  async getPointsByCategory(semester?: string) {
    const params: any[] = [];
    let semesterCondition = '';
    if (semester) {
      params.push(semester);
      semesterCondition = `AND batch.semester = $${params.length}`;
    }

    return await this.staffSurveyPointRepo.query(
      `
      SELECT
        criteria.category AS category,
        AVG(point.point) AS avg_point
      FROM staff_survey_point AS point
      JOIN staff_survey_criteria AS criteria
        ON point.staff_survey_criteria_id = criteria.staff_survey_criteria_id
      JOIN staff_survey_sheet AS sheet
        ON point.staff_survey_sheet_id = sheet.staff_survey_sheet_id
      JOIN staff_survey_batch AS batch
        ON sheet.staff_survey_batch_id = batch.staff_survey_batch_id
      WHERE criteria.category != 'ĐƠN VỊ' ${semesterCondition}
      GROUP BY criteria.category
    `,
      params,
    );
  }

  async getPointsByCriteria(category: string, semester?: string) {
    const params: any[] = [category];
    let semesterCondition = '';
    if (semester) {
      params.push(semester);
      semesterCondition = `AND batch.semester = $${params.length}`;
    }

    return await this.staffSurveyPointRepo.query(
      `
      SELECT
        criteria.display_name AS criteria,
        criteria.index AS index,
        AVG(point.point) AS avg_point
      FROM staff_survey_point AS point
      JOIN staff_survey_criteria AS criteria
        ON point.staff_survey_criteria_id = criteria.staff_survey_criteria_id
      JOIN staff_survey_sheet AS sheet
        ON point.staff_survey_sheet_id = sheet.staff_survey_sheet_id
      JOIN staff_survey_batch AS batch
        ON sheet.staff_survey_batch_id = batch.staff_survey_batch_id
      WHERE criteria.category = $1 ${semesterCondition}
      GROUP BY criteria.staff_survey_criteria_id
      ORDER BY criteria.index
    `,
      params,
    );
  }

  async getPointWithCommentByCriteria(
    category: string,
    pagination: PaginationArgs,
    semester?: string,
  ) {
    const params: any[] = [category];
    let semesterCondition = '';
    if (semester) {
      params.push(semester);
      semesterCondition = `AND batch.semester = $${params.length}`;
    }

    const limitParamIndex = params.length + 1;
    const offsetParamIndex = params.length + 2;
    params.push(pagination.size, pagination.page * pagination.size);

    const data = await this.staffSurveyPointRepo.query(
      `
      SELECT
        criteria.display_name AS criteria,
        criteria.index AS index,
        point.point,
        point.comment
      FROM staff_survey_point AS point
      JOIN staff_survey_criteria AS criteria
        ON point.staff_survey_criteria_id = criteria.staff_survey_criteria_id
      JOIN staff_survey_sheet AS sheet
        ON point.staff_survey_sheet_id = sheet.staff_survey_sheet_id
      JOIN staff_survey_batch AS batch
        ON sheet.staff_survey_batch_id = batch.staff_survey_batch_id
      WHERE criteria.category = $1 AND point.comment IS NOT NULL AND point.comment != '' ${semesterCondition}
      ORDER BY criteria.index
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `,
      params,
    );

    const metaParams: any[] = [category];
    let metaSemesterCondition = '';
    if (semester) {
      metaParams.push(semester);
      metaSemesterCondition = `AND batch.semester = $${metaParams.length}`;
    }

    const meta = await this.staffSurveyPointRepo.query(
      `
      SELECT
        COUNT(*) AS total_item
      FROM staff_survey_point AS point
      JOIN staff_survey_criteria AS criteria
        ON point.staff_survey_criteria_id = criteria.staff_survey_criteria_id
      JOIN staff_survey_sheet AS sheet
        ON point.staff_survey_sheet_id = sheet.staff_survey_sheet_id
      JOIN staff_survey_batch AS batch
        ON sheet.staff_survey_batch_id = batch.staff_survey_batch_id
      WHERE criteria.category = $1 AND point.comment IS NOT NULL AND point.comment != '' ${metaSemesterCondition}
    `,
      metaParams,
    );

    return {
      data,
      meta: {
        hasNext:
          pagination.page < Math.ceil(meta[0].total_item / pagination.size) - 1,
        hasPrev:
          pagination.page < Math.ceil(meta[0].total_item / pagination.size) - 1,
        page: pagination.page,
        size: pagination.size,
        total_item: meta[0].total_item,
        total_page: Math.ceil(meta[0].total_item / pagination.size),
      },
    };
  }

  async getCriteria({
    criteria_name,
    criteria_category,
    criteria_index,
    semester,
  }: {
    criteria_name: string;
    criteria_category: string;
    criteria_index: number;
    semester?: string;
  }) {
    let criteria = await this.staffSurveyCriteriaRepo.findOne({
      where: {
        display_name: criteria_name,
        category: criteria_category,
      },
    });

    if (!criteria) {
      const criteriaData = this.staffSurveyCriteriaRepo.create({
        display_name: criteria_name,
        category: criteria_category,
        index: criteria_index,
        semesters: semester ? [semester] : [],
      });

      try {
        criteria = await this.staffSurveyCriteriaRepo.save(criteriaData);
      } catch (error) {
        console.error('Error saving criteria:', error);
        return await this.staffSurveyCriteriaRepo.findOne({
          where: {
            display_name: criteria_name,
            category: criteria_category,
          },
        });
      }
    } else {
      if (semester) {
        try {
          await this.staffSurveyCriteriaRepo.update(
            {
              staff_survey_criteria_id: criteria.staff_survey_criteria_id,
            },
            {
              semesters: Array.from(
                new Set([...(criteria.semesters ?? []), semester]),
              ),
            },
          );

          criteria = await this.staffSurveyCriteriaRepo.findOne({
            where: {
              display_name: criteria_name,
              category: criteria_category,
            },
          });
        } catch (error) {
          console.error('Error updating criteria:', error);
        }
      }
    }

    return criteria;
  }

  async getBatch(surveyName: string, semester?: string) {
    const batchName =
      surveyName ||
      `Khảo sát CBNV (Upload ${moment().format('HH:mm, DD-MM-YYYY')})`;

    let batch = await this.staffSurveyBatchRepo.findOne({
      where: {
        display_name: batchName,
      },
    });

    if (!batch) {
      const batchData = this.staffSurveyBatchRepo.create({
        display_name: batchName,
        semester,
        updated_at: new Date(),
      });
      try {
        batch = await this.staffSurveyBatchRepo.save(batchData);
      } catch (error) {
        return await this.staffSurveyBatchRepo.findOne({
          where: {
            display_name: batchName,
          },
        });
      }
    }

    return batch;
  }
}
