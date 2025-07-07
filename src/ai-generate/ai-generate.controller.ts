import { Body, Controller, Post } from '@nestjs/common';
import { AiGenerateService } from './ai-generate.service';
import { QueryAiGenerateDto } from './dto/query-ai-generate.dto';

@Controller('ai-generate')
export class AiGenerateController {
  constructor(private readonly aiGenerateService: AiGenerateService) {}

  @Post()
  execute(@Body() queryAiGenerateDto: QueryAiGenerateDto) {
    return this.aiGenerateService.executeSqlQuery(queryAiGenerateDto);
  }
}
