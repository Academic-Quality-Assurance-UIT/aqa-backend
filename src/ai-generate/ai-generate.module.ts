import { Module } from '@nestjs/common';
import { AiGenerateService } from './ai-generate.service';
import { AiGenerateController } from './ai-generate.controller';
import { ConfigModule } from '@nestjs/config';
import { ProcessChartDataService } from './process-chart-data.service';

@Module({
  imports: [ConfigModule],
  controllers: [AiGenerateController],
  providers: [AiGenerateService, ProcessChartDataService],
})
export class AiGenerateModule {}
