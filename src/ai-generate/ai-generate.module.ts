import { Module } from '@nestjs/common';
import { AiGenerateService } from './ai-generate.service';
import { AiGenerateController } from './ai-generate.controller';

@Module({
  controllers: [AiGenerateController],
  providers: [AiGenerateService],
})
export class AiGenerateModule {}
