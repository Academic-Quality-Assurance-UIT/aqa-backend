import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryArgs } from 'src/common/args/query.arg';
import { BaseService } from 'src/common/services/BaseService';
import { filterQuery } from 'src/common/utils/filterQuery';
import { paginateByQuery } from 'src/common/utils/paginate';
import { Repository } from 'typeorm';
import { Criteria } from './entities/criteria.entity';
import { Class } from 'src/class/entities/class.entity';
import { Lecturer } from 'src/lecturer/entities/lecturer.entity';

@Injectable()
export class CriteriaService extends BaseService<Criteria> {
  private readonly logger = new Logger(CriteriaService.name);

  constructor(
    @InjectRepository(Criteria) private repo: Repository<Criteria>,
    @InjectRepository(Class) private classRepo: Repository<Class>,
  ) {
    super();
  }

  relations = { semester: true };

  async findAll({ filter, pagination, sort }: QueryArgs) {
    return paginateByQuery(
      filterQuery<Criteria>(
        Criteria,
        this.repo
          .createQueryBuilder()
          .leftJoin('Criteria.points', 'Point')
          .leftJoin('Point.class', 'Class')
          .leftJoin('Class.semester', 'Semester')
          .leftJoin('Class.subject', 'Subject')
          .leftJoin(
            Lecturer,
            'Lecturer',
            'Lecturer.lecturer_id = Class.lecturer_id OR Lecturer.lecturer_id = Class.lecturer_1_id OR Lecturer.lecturer_id = Class.lecturer_2_id',
          )
          .leftJoin('Subject.faculty', 'Faculty'),
        filter,
        sort,
      )
        .select('Criteria.criteria_id', 'criteria_id')
        .addSelect('Criteria.index', 'index')
        .addSelect('Criteria.semester_id', 'semester_id')
        .addSelect('Criteria.display_name', 'display_name')
        .groupBy('Criteria.criteria_id'),
      pagination,
      filter,
      { isRaw: true },
    );
  }

  findOne(id: string): Promise<Criteria> {
    return this.repo.findOne({
      where: { criteria_id: id },
      relations: this.relations,
    });
  }

  async findClassType(criteria_id: string) {
    const criteriaProperties = await this.classRepo
      .createQueryBuilder()
      .leftJoin('Class.points', 'Point')
      .where('Point.criteria_id = :criteria_id', { criteria_id })
      .select('Class.class_type', 'class_type')
      .addSelect('COUNT(DISTINCT Class.class_id)', 'num')
      .groupBy('Class.class_type')
      .getRawMany();

    return criteriaProperties;
  }
}
