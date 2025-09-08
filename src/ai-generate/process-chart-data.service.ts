import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { DataSource } from 'typeorm';
import { QueryAiGenerateDto } from './dto/query-ai-generate.dto';

@Injectable()
export class ProcessChartDataService {
  private llmModel;
  private client;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    const openAIAPI = configService.get<string>('OPENAI_API');

    this.llmModel = configService.get<string>('LLM_MODEL');
    this.client = new OpenAI({
      baseURL: openAIAPI,
      apiKey: 'ollama',
    });
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

  async rewriteUserPrompt(prompt: string): Promise<any> {
    const chatHistory = [
      {
        role: 'user',
        content: `Rewrite the following question to be more specific (translate to English, no explain): ${prompt}`,
      },
    ];

    const response = await this.client.chat.completions.create({
      model: 'qwen3:0.6b',
      messages: chatHistory,
      enable_thinking: false,
    });

    return response.choices[0].message.content;
  }

  async handleRunSQLToolCalled(data: { query: string }) {
    const result = await this.executeSqlQuery(data);

    return result;
  }

  async searchFilterData(prompt: string): Promise<any> {
    const thinkingResponse = await this.client.chat.completions.create({
      model: this.llmModel,
      messages: [
        {
          role: 'user',
          content: `
            User question: ${prompt}
            Your job has 2 parts:
            1. Reason internally about the user request to figure out if user needs filtering or not, which table user is filtering, which columns are involved (Using table data from KNOWLEDGE BASE).
            2. Response strictly as the following format: [ { table: "table_name", columns: ["column"], value: "value" }]
          `,
        },
      ],
      enable_thinking: false,
      chat_template_kwargs: { enable_thinking: false },
      options: {
        temperature: 0.1,
      },
    });

    const thinkingMessage = thinkingResponse.choices[0].message.content.replace(
      /<think>(.*?)<\/think>(.*?)$/,
      '$2',
    );

    const tableData = await Promise.all(
      JSON.parse(thinkingMessage).map(async (item) => ({
        table: item.table,
        columns: item.columns,
        search_value: item.value,
        data: (
          await this.executeSqlQuery({
            query: `SELECT ${item.columns.join(', ')} FROM ${item.table}`,
          })
        ).data,
      })),
    );

    const filterResponse = await this.client.chat.completions.create({
      model: this.llmModel,
      messages: [
        {
          role: 'user',
          content: `
            Table data and search value: ${JSON.stringify(tableData)}
            Your job has 2 parts:
            1. For each item in the table data, determine which is the 
            2. Response strictly as the following format: [ { table: "table_name", columns: ["column"], value: "value" }]
          `,
        },
      ],
      enable_thinking: false,
      chat_template_kwargs: { enable_thinking: false },
      options: {
        temperature: 0.1,
      },
    });

    const filterData = filterResponse.choices[0].message.content.replace(
      /<think>(.*?)<\/think>(.*?)$/,
      '$2',
    );

    console.log({ thinkingMessage, tableData, filterData });

    return filterData;
  }

  async generateSQLQuery(prompt: string): Promise<any> {
    const tools = [
      {
        type: 'function',
        function: {
          name: 'run_sql',
          description: 'Run a SQL query and get the results',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The SQL query to run',
              },
            },
            required: ['query'],
          },
        },
      },
    ];

    const chatHistory = [
      {
        role: 'user',
        content: `User question: ${prompt}
            Your job has 2 parts:
            1. Reason internally about the user request, step by step, to figure out the right SQL logic. 
            - Consider the database schema, table names, column names, and relationships (In the KNOWLEDGE BASE section).
            - Think about edge cases (filters, ordering, grouping, limits, null values).
            - Do not reveal this reasoning to the user.
            2. Output only the final SQL query (and optionally a short explanation of what it does).

            Constraints:
            - Don't use columns that are not present in the schema.
            - Use the table relationships noted above to join tables.
            - Alias name for returned columns should be in english.
            - To calculate point in the point table, use the formula: "point = point / max_point * 4", don't use the "point" column directly.
            - If a user asks about a specific lecturer, subject, faculty, criteria, etc., don’t search by hard‑coding the ID into the SQL query. The proper way is to look it up in the corresponding table by display_name (for faculty, use the abbreviations from the table shown above), and then join that result into your main query.
            - Also, when you GROUP BY semester, make sure to sort the semesters in ascending order.
            - When you GROUP BY the ID fields of the lecturer, subject, faculty, criteria or semester tables, you must also GROUP BY the corresponding display_name field from each of those tables.
            - When you need to count the number of classes, group by class.class_id. Do the same for lecturer, subject, faculty, etc. Do not count directly without using GROUP BY.
            - Make sure to sort the semesters in ascending order, for example, if you are grouping by semester, use "ORDER BY semester.year ASC, semester.type ASC".
            - When GROUP BY a table, always include the "display_name" field from that table in the SELECT clause and GROUP BY clause.
            `,
      },
    ];

    const thinkingResponse = await this.client.chat.completions.create({
      model: this.llmModel,
      messages: chatHistory,
      enable_thinking: true,
      thinking_budget: 50,
      chat_template_kwargs: { enable_thinking: true, thinking_budget: 50 },
      options: {
        temperature: 0.1,
      },
    });

    const sqlGeneratingPlan = thinkingResponse.choices[0].message.content;

    chatHistory.push({
      role: 'assistant',
      content: `
        Plan for generating SQL query and SQL query: 
        ${sqlGeneratingPlan}
      `,
    });

    const sqlResponse = await this.client.chat.completions.create({
      model: this.llmModel,
      messages: [
        {
          role: 'assistant',
          content: `
                Plan for generating SQL query and SQL query: 
                ${sqlGeneratingPlan}
            `,
        },
        {
          role: 'user',
          content: `
        Extract SQL query code from previous assistant message, then call the "run_sql" tool to check if it is a valid sql
        Constraints: 
            - Just call with the raw SQL code
            - Call tools if needed
            - No explanations, no code blocks, no markdown formatting
            - No additional text before or after the SQL
            - Just the executable SQL statement
        `,
        },
      ],
      tools,
      tool_choice: 'run_sql',
      enable_thinking: false,
      chat_template_kwargs: { enable_thinking: false },
      options: {
        temperature: 0.1,
      },
    });

    const sqlMessage = sqlResponse.choices[0].message;

    let result;
    let sqlQuery = '';

    if (sqlMessage.tool_calls) {
      result = await this.handleRunSQLToolCalled(
        JSON.parse(sqlMessage.tool_calls[0].function.arguments),
      );

      sqlQuery = JSON.parse(sqlMessage.tool_calls[0].function.arguments)?.query;

      while (result.error) {
        const fixSQLResponse = await await this.client.chat.completions.create({
          model: this.llmModel,
          messages: [
            ...chatHistory,
            {
              role: 'user',
              content: `
                Fix the SQL query using KNOWLEDGE BASE and the following info:
                - User question: ${prompt}
                - Error message: ${result.error}
                `,
            },
          ],
          tools,
          tool_choice: 'run_sql',
          enable_thinking: true,
          chat_template_kwargs: { enable_thinking: true },
          options: {
            temperature: 0.1,
          },
        });

        const sqlGeneratingPlan = fixSQLResponse.choices[0].message.content;

        const sqlResponse = await await this.client.chat.completions.create({
          model: this.llmModel,
          messages: [
            {
              role: 'user',
              content: `
                Extract SQL query code from the following message, then call the "run_sql" tool to check if it is a valid sql
                Constraints: 
                    - Just call with the raw SQL code
                    - Call tools if needed
                    - No explanations, no code blocks, no markdown formatting
                    - No additional text before or after the SQL
                    - Just the executable SQL statement
                Message: 
                ${sqlGeneratingPlan}
                `,
            },
          ],
          tools,
          tool_choice: 'run_sql',
          enable_thinking: false,
          chat_template_kwargs: { enable_thinking: false },
          options: {
            temperature: 0.1,
          },
        });

        const sqlMessage = sqlResponse.choices[0].message;

        result = await this.handleRunSQLToolCalled(
          JSON.parse(sqlMessage.tool_calls[0].function.arguments),
        );

        sqlQuery = JSON.parse(
          sqlMessage.tool_calls[0].function.arguments,
        )?.query;
      }
    }

    return { result, sqlQuery, thinkingResponse, sqlResponse };
  }
}
