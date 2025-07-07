import { Injectable } from '@nestjs/common';
import { QueryAiGenerateDto } from './dto/query-ai-generate.dto';
import { DataSource } from 'typeorm';

@Injectable()
export class AiGenerateService {
  constructor(private readonly dataSource: DataSource) {}

  async executeSqlQuery(queryAiGenerateDto: QueryAiGenerateDto): Promise<any> {
    const query = queryAiGenerateDto.query;

    try {
      const result = await this.dataSource.query(query);
      return result;
    } catch (error) {
      throw new Error(`Raw SQL execution failed: ${error.message}`);
    }
  }
}
