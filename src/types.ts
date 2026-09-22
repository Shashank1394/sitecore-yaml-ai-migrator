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
  /**
   * Convert a single file, or return `null` if this migration does not apply to
   * it. Returning `null` does not drop the file: the pipeline copies it to the
   * output folder, so the output is always a complete tree. Removing
   * `DB: master` is handled by the pipeline for every file, converted or not.
   */
  migrate(file: InputYamlFile): MigratedYamlFile | null;
}
