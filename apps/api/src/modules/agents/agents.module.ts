import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AiModule } from '@modules/ai/ai.module';
import { BrandModule } from '@modules/brand/brand.module';
import { CreditsModule } from '@modules/credits/credits.module';
import { AgentRunModel } from './infrastructure/persistence/agent-run.model';
import { AgentRunsRepository } from './infrastructure/persistence/agent-runs.repository';
import { AGENT_RUNS_REPOSITORY } from './domain/repositories/agent-run-repository.interface';
import { AgentsService } from './application/services/agents.service';
import { AgentsController } from './presentation/agents.controller';

@Module({
  imports: [SequelizeModule.forFeature([AgentRunModel]), AiModule, BrandModule, CreditsModule],
  controllers: [AgentsController],
  providers: [AgentsService, { provide: AGENT_RUNS_REPOSITORY, useClass: AgentRunsRepository }],
  exports: [AgentsService],
})
export class AgentsModule {}
