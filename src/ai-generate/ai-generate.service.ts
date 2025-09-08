import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { QueryAiGenerateDto } from './dto/query-ai-generate.dto';
import { ProcessChartDataService } from './process-chart-data.service';

@Injectable()
export class AiGenerateService {
  private llmModel;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly processChartDataService: ProcessChartDataService,
  ) {
    this.llmModel = configService.get<string>('LLM_MODEL');
  }

  async executeSqlQuery(queryAiGenerateDto: QueryAiGenerateDto): Promise<any> {
    const query = queryAiGenerateDto.query;

    try {
      const result = await this.dataSource.query(query);
      return { data: result };
    } catch (error) {
      return { error: error.message };
    }
  }

  async generateSqlQuery(prompt: string): Promise<any> {
    const specificPrompt =
      await this.processChartDataService.rewriteUserPrompt(prompt);

    return specificPrompt;
  }

  async testSQL(prompt: string): Promise<any> {
    const sqlQuery =
      await this.processChartDataService.generateSQLQuery(prompt);
    return sqlQuery;
  }
}
