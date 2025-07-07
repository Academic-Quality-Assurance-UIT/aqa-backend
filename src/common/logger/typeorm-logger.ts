/* eslint-disable @typescript-eslint/no-unused-vars */
import { Logger, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export class FileLogger implements Logger {
  private logFile = path.join(__dirname, '../../../logs/sql.log');

  private writeToFile(message: string) {
    fs.appendFileSync(
      this.logFile,
      `[${new Date().toISOString()}] ${message}\n`,
    );
  }

  logQuery(query: string, parameters?: any[], _queryRunner?: QueryRunner) {
    const sql =
      query +
      (parameters && parameters.length
        ? ` -- PARAMETERS: ${JSON.stringify(parameters)}`
        : '');
    this.writeToFile(`QUERY: ${sql}`);
  }

  logQueryError(
    error: string | Error,
    query: string,
    parameters?: any[],
    _queryRunner?: QueryRunner,
  ) {
    this.writeToFile(
      `QUERY ERROR: ${query} -- PARAMETERS: ${JSON.stringify(parameters)} -- ERROR: ${error}`,
    );
  }

  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    _queryRunner?: QueryRunner,
  ) {
    this.writeToFile(
      `SLOW QUERY (${time} ms): ${query} -- PARAMETERS: ${JSON.stringify(parameters)}`,
    );
  }

  logSchemaBuild(message: string, _queryRunner?: QueryRunner) {
    this.writeToFile(`SCHEMA BUILD: ${message}`);
  }

  logMigration(message: string, _queryRunner?: QueryRunner) {
    this.writeToFile(`MIGRATION: ${message}`);
  }

  log(
    level: 'log' | 'info' | 'warn',
    message: any,
    _queryRunner?: QueryRunner,
  ) {
    this.writeToFile(`${level.toUpperCase()}: ${message}`);
  }
}
