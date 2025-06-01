import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as moment from 'moment';
import { Repository } from 'typeorm';
import { StaffSurveySheetDTO } from './dtos/staff-survey-sheet.dto';
import { StaffSurveyBatch } from './entities/staff-survey-batch.entity';
import { StaffSurveyCriteria } from './entities/staff-survey-criteria.entity';
import { StaffSurveyPoint } from './entities/staff-survey-point.entity';
import { StaffSurveySheet } from './entities/staff-survey-sheet.entity';

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

    const batch = await this.getBatch(surveyName);

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

  async getPointsByCategory() {
    return await this.staffSurveyPointRepo.query(`
      SELECT
        criteria.category AS category,
        AVG(point.point) AS avg_point
      FROM staff_survey_point AS point
      JOIN staff_survey_criteria AS criteria
      ON point.staff_survery_criteria_id = criteria.staff_survery_criteria_id
      WHERE criteria.category != 'ĐƠN VỊ'
      GROUP BY criteria.category
    `);
  }

  async getPointsByCriteria(category: string) {
    return await this.staffSurveyPointRepo.query(
      `
      SELECT
        criteria.display_name AS criteria,
        AVG(point.point) AS avg_point
      FROM staff_survey_point AS point
      JOIN staff_survey_criteria AS criteria
      ON point.staff_survery_criteria_id = criteria.staff_survery_criteria_id
      WHERE criteria.category = $1
      GROUP BY criteria.display_name
    `,
      [category],
    );
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
              staff_survery_criteria_id: criteria.staff_survery_criteria_id,
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

  async getBatch(surveyName: string) {
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
