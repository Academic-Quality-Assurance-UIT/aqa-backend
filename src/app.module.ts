import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ClassModule } from './class/class.module';
import { CommentModule } from './comment/comment.module';
import { CriteriaModule } from './criteria/criteria.module';
import { FacultyModule } from './faculty/faculty.module';
import { LecturerModule } from './lecturer/lecturer.module';
import { PermissionModule } from './permission/permission.module';
import { PointModule } from './point/point.module';
import { ProgramModule } from './program/program.module';
import { SemesterModule } from './semester/semester.module';
import { SubjectModule } from './subject/subject.module';
import { UserModule } from './user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailModule } from './mail/mail.module';
import { StaffSurveyModule } from './staff-survey/staff-survey.module';
import { FileLogger } from './common/logger/typeorm-logger';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), '/schema.gql'),
      sortSchema: true,
      playground: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        synchronize: true,
        autoLoadEntities: true,
        logging: false,
        logger: new FileLogger(),
      }),
    }),
    PermissionModule,
    UserModule,
    AuthModule,
    FacultyModule,
    LecturerModule,
    SemesterModule,
    ClassModule,
    ProgramModule,
    SubjectModule,
    CriteriaModule,
    CommentModule,
    PointModule,
    MailModule,
    StaffSurveyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor(private datasource: DataSource) {}
}
