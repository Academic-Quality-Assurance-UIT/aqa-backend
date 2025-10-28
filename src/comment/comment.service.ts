import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterArgs } from 'src/common/args/filter.arg';
import { PaginationArgs } from 'src/common/args/pagination.arg';
import { filterQuery } from 'src/common/utils/filterQuery';
import { paginateByQuery } from 'src/common/utils/paginate';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentService {
  constructor(@InjectRepository(Comment) private repo: Repository<Comment>) {}

  findAll(
    filter: FilterArgs,
    paginationOptions: PaginationArgs,
    type: string[],
    topic: string[],
  ) {
    return paginateByQuery(
      filterQuery<Comment>(
        'Comment',
        this.repo
          .createQueryBuilder()
          .innerJoin('Comment.class', 'Class')
          .innerJoin('Class.subject', 'Subject')
          .innerJoin('Subject.faculty', 'Faculty')
          .innerJoin('Class.semester', 'Semester')
          .innerJoin('Class.lecturer', 'Lecturer'),
        filter,
      )
        .andWhere('array_length(Comment.type_list, 1) > 0')
        .andWhere(
          type && !type.includes('all') && type.length > 0
            ? 'Comment.type_list && ARRAY[:...type]'
            : 'true',
          {
            type: type && type.length > 0 ? type : [],
          },
        )
        .andWhere(
          topic && !topic.includes('all') && topic.length > 0
            ? 'Comment.topic IN (:...topic)'
            : 'true',
          {
            topic: topic && topic.length > 0 ? topic : [],
          },
        ),
      paginationOptions,
      filter,
      {
        relations: {
          class: true,
        },
      },
    );
  }

  async getQuantity(filter: FilterArgs, type: string, topic: string) {
    return {
      type: type ?? 'all',
      quantity:
        (await filterQuery<Comment>(
          'Comment',
          this.repo
            .createQueryBuilder()
            .innerJoin('Comment.class', 'Class')
            .innerJoin('Class.subject', 'Subject')
            .innerJoin('Subject.faculty', 'Faculty')
            .innerJoin('Class.semester', 'Semester')
            .innerJoin('Class.lecturer', 'Lecturer'),
          filter,
        )
          .andWhere('array_length(Comment.type_list, 1) > 0')
          .andWhere(
            type && type != 'all' ? ':type = ANY(Comment.type_list) ' : 'true',
            {
              type,
            },
          )
          .andWhere(
            topic && topic != 'all' ? 'Comment.topic = :topic' : 'true',
            {
              topic,
            },
          )
          .getCount()) || 0,
    };
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { comment_id: id }, relations: {} });
  }
}
