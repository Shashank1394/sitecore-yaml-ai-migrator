import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions/completions";

import type { InputYamlFile, LlmMigrationResponse } from "./types.js";

export class LlmClient {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Sitecore YAML AI Migrator",
      },
    });

    this.model = model;
  }

  async migrateBatch(
    files: InputYamlFile[],
    instructions: string,
  ): Promise<LlmMigrationResponse> {
    const filePayload = files.map((file) => ({
      fileName: file.fileName,
      content: file.content,
    }));

    const systemPrompt = `
You are a Sitecore serialization migration assistant.

You will receive:
1. Migration instructions.
2. A batch of Sitecore YAML files.

Your task is to apply the migration instructions to every YAML file.

Rules:
- Process every supplied file.
- Return one result for every input file.
- Preserve the original file names exactly.
- Return the complete modified YAML content.
- Do not explain the changes outside the JSON response.
- Do not wrap the response in Markdown code fences.
- Do not omit files.
- Do not create files that were not provided.
- Preserve all content that is not affected by the migration instructions.
- Your entire response must be a single valid JSON object with this exact shape:
  {"files":[{"fileName":"exact input filename.yml","content":"complete YAML with newlines escaped as \\n"}]}
- JSON strings cannot contain literal line breaks. Escape every YAML line break as \\n and escape quotes inside YAML strings.
`;

    const userPrompt = `
Migration instructions:

${instructions}

Files to migrate:

${JSON.stringify(filePayload, null, 2)}
`;

    const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ];
    let response;
    try {
      response = await this.client.chat.completions.create({ model: this.model, temperature: 0, response_format: { type: "json_object" }, messages });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/response_format|json_object|unsupported.*format/i.test(message)) throw error;
      response = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0,
        messages: [{ role: "system", content: `${systemPrompt}\nReturn valid JSON only, using the required response shape.` }, ...messages.slice(1)],
      });
    }

    const responseContent = response.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error("The LLM returned an empty response.");
    }

    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(this.extractJsonObject(responseContent));
    } catch {
      const preview = responseContent.replace(/\s+/g, " ").slice(0, 300);
      throw new Error(`The LLM returned invalid JSON. Response preview: ${preview || "(empty)"}`);
    }

    return this.normalizeResponse(parsedResponse, files);
  }

  private extractJsonObject(content: string): string {
    const withoutFences = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    try { JSON.parse(withoutFences); return withoutFences; } catch { /* try an object embedded in prose */ }
    const start = withoutFences.indexOf("{");
    const end = withoutFences.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON object found");
    return withoutFences.slice(start, end + 1);
  }

  /** Free models commonly use `filename` instead of the requested `fileName`. */
  private normalizeResponse(response: unknown, inputs: InputYamlFile[]): LlmMigrationResponse {
    const rawFiles = (response as { files?: unknown })?.files;
    if (!Array.isArray(rawFiles)) return response as LlmMigrationResponse;

    return {
      files: rawFiles.map((rawFile, index) => {
        const file = rawFile as Record<string, unknown>;
        const returnedName = file.fileName ?? file.filename ?? file.name;
        const content = file.content ?? file.yamlContent ?? file.yaml;
        // The input name is authoritative. For a same-sized response, this also
        // tolerates harmless casing/field-name mistakes from lower-quality models.
        const fileName = typeof returnedName === "string" &&
          inputs.some((input) => input.fileName === returnedName)
          ? returnedName
          : inputs[index]?.fileName;
        return { fileName: fileName ?? "", content } as { fileName: string; content: unknown };
      }),
    } as LlmMigrationResponse;
  }
}
