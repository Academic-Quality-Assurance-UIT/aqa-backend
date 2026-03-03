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
import { StaffSurveyAdditionalCommentDTO } from './dtos/staff-survey-additional-comment.dto';

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

  async getPointsByCategoryDonVi(semester?: string) {
    const params: any[] = [];
    let semesterCondition = '';
    if (semester) {
      params.push(semester);
      semesterCondition = `AND batch.semester = $${params.length}`;
    }

    return await this.staffSurveyPointRepo.query(
      `
      SELECT
        criteria.display_name AS category,
        AVG(point.point) AS avg_point
      FROM staff_survey_point AS point
      JOIN staff_survey_criteria AS criteria
        ON point.staff_survey_criteria_id = criteria.staff_survey_criteria_id
      JOIN staff_survey_sheet AS sheet
        ON point.staff_survey_sheet_id = sheet.staff_survey_sheet_id
      JOIN staff_survey_batch AS batch
        ON sheet.staff_survey_batch_id = batch.staff_survey_batch_id
      WHERE criteria.category = 'ĐƠN VỊ' ${semesterCondition}
      GROUP BY criteria.staff_survey_criteria_id
      ORDER BY criteria.index
    `,
      params,
    );
  }

  async getPointsByCriteria(
    category: string,
    semester?: string,
    displayName?: string,
  ) {
    const params: any[] = [category];
    let semesterCondition = '';
    if (semester) {
      params.push(semester);
      semesterCondition = `AND batch.semester = $${params.length}`;
    }

    let displayNameCondition = '';
    if (displayName) {
      params.push(displayName);
      displayNameCondition = `AND criteria.display_name = $${params.length}`;
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
      WHERE criteria.category = $1 ${semesterCondition} ${displayNameCondition}
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
    displayName?: string,
  ) {
    const params: any[] = [category];
    let semesterCondition = '';
    if (semester) {
      params.push(semester);
      semesterCondition = `AND batch.semester = $${params.length}`;
    }

    let displayNameCondition = '';
    if (displayName) {
      params.push(displayName);
      displayNameCondition = `AND criteria.display_name = $${params.length}`;
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
      WHERE criteria.category = $1 AND point.comment IS NOT NULL AND point.comment != '' ${semesterCondition} ${displayNameCondition}
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

    let metaDisplayNameCondition = '';
    if (displayName) {
      metaParams.push(displayName);
      metaDisplayNameCondition = `AND criteria.display_name = $${metaParams.length}`;
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
      WHERE criteria.category = $1 AND point.comment IS NOT NULL AND point.comment != '' ${metaSemesterCondition} ${metaDisplayNameCondition}
    `,
      metaParams,
    );

    return {
      data,
      meta: {
        hasNext:
          pagination.page < Math.ceil(meta[0].total_item / pagination.size) - 1,
        hasPrev: pagination.page > 0,
        page: pagination.page,
        size: pagination.size,
        total_item: meta[0].total_item,
        total_page: Math.ceil(meta[0].total_item / pagination.size),
      },
    };
  }

  async getAllComments(
    pagination: PaginationArgs,
    semester?: string,
    keyword?: string,
  ) {
    const params: any[] = [];
    let semesterCondition = '';
    if (semester) {
      params.push(semester);
      semesterCondition = `AND batch.semester = $${params.length}`;
    }

    let keywordCondition = '';
    if (keyword) {
      params.push(`%${keyword}%`);
      keywordCondition = `AND point.comment ILIKE $${params.length}`;
    }

    let sheetKeywordCondition = '';
    if (keyword) {
      // Reuse the same param index if possible, but params are positional.
      // Actually, let's just push it again for simplicity or manage indices.
      // To keep it simple, I'll just push again if needed, but I should be careful with param order.
    }

    // Recalculate params for the whole query
    const queryParams: any[] = [];
    let qSemesterCondition = '';
    if (semester) {
      queryParams.push(semester);
      qSemesterCondition = `AND batch.semester = $${queryParams.length}`;
    }

    let qKeywordCondition = '';
    let qSheetKeywordCondition = '';
    if (keyword) {
      queryParams.push(`%${keyword}%`);
      qKeywordCondition = `AND point.comment ILIKE $${queryParams.length}`;
      qSheetKeywordCondition = `AND sheet.additional_comment ILIKE $${queryParams.length}`;
    }

    const limitParamIndex = queryParams.length + 1;
    const offsetParamIndex = queryParams.length + 2;
    queryParams.push(pagination.size, (pagination.page || 0) * pagination.size);

    const data = await this.staffSurveyPointRepo.query(
      `
      SELECT * FROM (
        SELECT
          criteria.display_name AS criteria,
          criteria.index AS index,
          point.point AS point,
          point.comment AS comment
        FROM staff_survey_point AS point
        JOIN staff_survey_criteria AS criteria
          ON point.staff_survey_criteria_id = criteria.staff_survey_criteria_id
        JOIN staff_survey_sheet AS sheet
          ON point.staff_survey_sheet_id = sheet.staff_survey_sheet_id
        JOIN staff_survey_batch AS batch
          ON sheet.staff_survey_batch_id = batch.staff_survey_batch_id
        WHERE point.comment IS NOT NULL AND point.comment != '' ${qSemesterCondition} ${qKeywordCondition}
        
        UNION ALL
        
        SELECT
          'Ý kiến khác' AS criteria,
          999 AS index,
          0 AS point,
          sheet.additional_comment AS comment
        FROM staff_survey_sheet AS sheet
        JOIN staff_survey_batch AS batch
          ON sheet.staff_survey_batch_id = batch.staff_survey_batch_id
        WHERE sheet.additional_comment IS NOT NULL AND sheet.additional_comment != '' ${qSemesterCondition} ${qSheetKeywordCondition}
      ) AS combined
      ORDER BY index
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `,
      queryParams,
    );

    const metaParams: any[] = [];
    let mSemesterCondition = '';
    if (semester) {
      metaParams.push(semester);
      mSemesterCondition = `AND batch.semester = $${metaParams.length}`;
    }

    let mKeywordCondition = '';
    let mSheetKeywordCondition = '';
    if (keyword) {
      metaParams.push(`%${keyword}%`);
      mKeywordCondition = `AND point.comment ILIKE $${metaParams.length}`;
      mSheetKeywordCondition = `AND sheet.additional_comment ILIKE $${metaParams.length}`;
    }

    const metaResult = await this.staffSurveyPointRepo.query(
      `
      SELECT SUM(total_item) AS total_item FROM (
        SELECT
          COUNT(*) AS total_item
        FROM staff_survey_point AS point
        JOIN staff_survey_sheet AS sheet
          ON point.staff_survey_sheet_id = sheet.staff_survey_sheet_id
        JOIN staff_survey_batch AS batch
          ON sheet.staff_survey_batch_id = batch.staff_survey_batch_id
        WHERE point.comment IS NOT NULL AND point.comment != '' ${mSemesterCondition} ${mKeywordCondition}
        
        UNION ALL
        
        SELECT
          COUNT(*) AS total_item
        FROM staff_survey_sheet AS sheet
        JOIN staff_survey_batch AS batch
          ON sheet.staff_survey_batch_id = batch.staff_survey_batch_id
        WHERE sheet.additional_comment IS NOT NULL AND sheet.additional_comment != '' ${mSemesterCondition} ${mSheetKeywordCondition}
      ) AS total_combined
    `,
      metaParams,
    );

    const totalItem = parseInt(metaResult[0].total_item || '0');
    const page = pagination.page || 0;
    const size = pagination.size;
    const totalPage = Math.ceil(totalItem / size);

    return {
      data,
      meta: {
        hasNext: page < totalPage - 1,
        hasPrev: page > 0,
        page,
        size,
        total_item: totalItem,
        total_page: totalPage,
      },
    };
  }

  async getAllCommentsCount(semester?: string, keyword?: string) {
    const params: any[] = [];
    let semesterCondition = '';
    if (semester) {
      params.push(semester);
      semesterCondition = `AND batch.semester = $${params.length}`;
    }

    let keywordCondition = '';
    let sheetKeywordCondition = '';
    if (keyword) {
      params.push(`%${keyword}%`);
      keywordCondition = `AND point.comment ILIKE $${params.length}`;
      sheetKeywordCondition = `AND sheet.additional_comment ILIKE $${params.length}`;
    }

    const result = await this.staffSurveyPointRepo.query(
      `
      SELECT SUM(total_item) AS total_item FROM (
        SELECT
          COUNT(*) AS total_item
        FROM staff_survey_point AS point
        JOIN staff_survey_sheet AS sheet
          ON point.staff_survey_sheet_id = sheet.staff_survey_sheet_id
        JOIN staff_survey_batch AS batch
          ON sheet.staff_survey_batch_id = batch.staff_survey_batch_id
        WHERE point.comment IS NOT NULL AND point.comment != '' ${semesterCondition} ${keywordCondition}
        
        UNION ALL
        
        SELECT
          COUNT(*) AS total_item
        FROM staff_survey_sheet AS sheet
        JOIN staff_survey_batch AS batch
          ON sheet.staff_survey_batch_id = batch.staff_survey_batch_id
        WHERE sheet.additional_comment IS NOT NULL AND sheet.additional_comment != '' ${semesterCondition} ${sheetKeywordCondition}
      ) AS total_combined
    `,
      params,
    );

    console.log({ count: parseInt(result[0].total_item || '0') })

    return parseInt(result[0].total_item || '0');
  }

  async getPointWithCommentByCriteriaCount(
    category: string,
    semester?: string,
    displayName?: string,
  ) {
    const params: any[] = [category];
    let semesterCondition = '';
    if (semester) {
      params.push(semester);
      semesterCondition = `AND batch.semester = $${params.length}`;
    }

    let displayNameCondition = '';
    if (displayName) {
      params.push(displayName);
      displayNameCondition = `AND criteria.display_name = $${params.length}`;
    }

    const result = await this.staffSurveyPointRepo.query(
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
      WHERE criteria.category = $1 AND point.comment IS NOT NULL AND point.comment != '' ${semesterCondition} ${displayNameCondition}
    `,
      params,
    );

    return parseInt(result[0].total_item);
  }

  async getAdditionalComments(
    semester?: string,
  ): Promise<StaffSurveyAdditionalCommentDTO[]> {
    const query = this.repo
      .createQueryBuilder('sheet')
      .leftJoin('sheet.batch', 'batch')
      .select([
        'sheet.display_name',
        'sheet.faculty',
        'sheet.additional_comment',
      ])
      .where(
        "sheet.additional_comment IS NOT NULL AND sheet.additional_comment != ''",
      );

    if (semester) {
      query.andWhere('batch.semester = :semester', { semester });
    }

    return await query.getMany();
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
