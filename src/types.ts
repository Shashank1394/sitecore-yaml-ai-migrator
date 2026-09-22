export interface InputYamlFile {
  fileName: string;
  filePath: string;
  relativePath: string;
  content: string;
}

export interface MigratedYamlFile {
  fileName: string;
  relativePath?: string;
  content: string;
}

export interface AppConfig {
  batchSize: number;
  inputDirectory: string;
  outputDirectory: string;
  instruction: string;
}

export interface Migration {
  id: string;
  description: string;
  migrate(file: InputYamlFile): MigratedYamlFile | null;
}
