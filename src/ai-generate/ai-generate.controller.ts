import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AiGenerateService } from './ai-generate.service';
import { QueryAiGenerateDto } from './dto/query-ai-generate.dto';

@Controller('ai-generate')
export class AiGenerateController {
  constructor(private readonly aiGenerateService: AiGenerateService) {}

  @Post('/run-sql')
  executeSQL(@Body() queryAiGenerateDto: QueryAiGenerateDto) {
    return this.aiGenerateService.executeSqlQuery(queryAiGenerateDto);
  }

  @Get('/sql')
  getSQLQuery(@Query('prompt') prompt: string) {
    return this.aiGenerateService.generateSqlQuery(prompt);
  }

  @Get('/sql/test')
  testSQL(@Query('prompt') prompt: string) {
    return this.aiGenerateService.testSQL(prompt);
  }
}
