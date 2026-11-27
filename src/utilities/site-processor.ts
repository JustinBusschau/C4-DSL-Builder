import path from 'node:path';
import chalk from 'chalk';
import { OutputType, ProcessorBase } from './processor-base.js';
import { SafeFiles } from './safe-files.js';
import { CliLogger } from './cli-logger.js';
import { MermaidProcessor } from './mermaid-processor.js';
import { BuildConfig } from '../types/build-config.js';
import { TreeItem } from '../types/tree-item.js';
import { docsifyTemplate } from '../assets/docsify.template.js';
import { DocsifyOptions } from '../types/docsify-options.js';
import { CacheManager } from './cache-manager.js';
import * as Constants from '../types/constants.js';

export class SiteProcessor extends ProcessorBase {
  constructor(
    protected readonly safeFiles: SafeFiles = new SafeFiles(),
    protected readonly logger: CliLogger = new CliLogger(SiteProcessor.name),
    protected readonly mermaid: MermaidProcessor = new MermaidProcessor(),
    protected readonly cache: CacheManager = new CacheManager(
      path.resolve(Constants.CACHE_FILENAME),
      safeFiles,
      logger,
    ),
  ) {
    super(safeFiles, logger, mermaid);
  }

  private async shouldProcessItem(item: TreeItem): Promise<boolean> {
    if (Array.isArray(item.mdFiles)) {
      for (const md of item.mdFiles) {
        const fullPath = path.join(item.dir, md.name);
        if (await this.cache.hasChanged(fullPath)) return true;
      }
    }

    if (Array.isArray(item.mmdFiles)) {
      for (const mmd of item.mmdFiles) {
        const fullPath = path.join(item.dir, mmd.name);
        if (await this.cache.hasChanged(fullPath)) return true;
      }
    }

    return false;
  }

  private async markProcessedItem(item: TreeItem): Promise<void> {
    if (Array.isArray(item.mdFiles)) {
      for (const md of item.mdFiles) {
        const fullPath = path.join(item.dir, md.name);
        await this.cache.markProcessed(fullPath);
      }
    }

    if (Array.isArray(item.mmdFiles)) {
      for (const mmd of item.mmdFiles) {
        const fullPath = path.join(item.dir, mmd.name);
        await this.cache.markProcessed(fullPath);
      }
    }
  }

  private getOutputFileName(buildConfig: BuildConfig, dir: string, name: string): string {
    const destFldr = path.resolve(buildConfig.distFolder);
    const destPath = path.resolve(dir.replace(buildConfig.rootFolder, buildConfig.distFolder));
    // Only add .md if the file doesn't already have an extension
    const destFileName = path.join(destPath, path.extname(name) ? name : `${name}.md`);
    return path.relative(destFldr, destFileName);
  }

  private async writeUnifiedMarkdown(item: TreeItem, buildConfig: BuildConfig): Promise<void> {
    const destFileName = this.getOutputFileName(buildConfig, item.dir, item.name);

    let MD = `# ${item.name}\n\n`;

    MD += await this.processMarkdownDocument(item, buildConfig);

    await this.safeFiles.ensureDir(
      path.resolve(item.dir.replace(buildConfig.rootFolder, buildConfig.distFolder)),
    );
    await this.safeFiles.writeFile(
      path.resolve(path.join(buildConfig.distFolder, destFileName)),
      MD,
    );
  }

  private async findOpenApiSpecInFolder(
    folder: string,
    entries?: string[],
  ): Promise<string | null> {
    const files = entries ?? (await this.safeFiles.readDir(folder));
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.yml' || ext === '.yaml') {
        const content = await this.safeFiles.readFileAsString(path.join(folder, file));
        if (content) {
          const firstMeaningfulLine = content
            .split('\n')
            .map((line) => line.trim())
            .find((line) => line !== '' && !line.startsWith('#'));
          if (
            firstMeaningfulLine?.startsWith('openapi:') ||
            firstMeaningfulLine?.startsWith('swagger:')
          ) {
            return path.join(folder, file);
          }
        }
      }
    }
    return null;
  }

  private async findOpenApiSpec(rootFolder: string): Promise<string | null> {
    const rootEntries = await this.safeFiles.readDir(rootFolder);
    const rootSpec = await this.findOpenApiSpecInFolder(rootFolder, rootEntries);
    if (rootSpec) return rootSpec;

    for (const entry of rootEntries) {
      if (entry.toLowerCase() !== 'api') continue;

      const apiFolder = path.join(rootFolder, entry);
      const stats = await this.safeFiles.stat(apiFolder);
      if (!stats?.isDirectory()) continue;

      const apiSpec = await this.findOpenApiSpecInFolder(apiFolder);
      if (apiSpec) return apiSpec;
    }

    return null;
  }

  private async generateOpenApiPage(buildConfig: BuildConfig, specPath: string): Promise<void> {
    const specFileName = path.basename(specPath);
    const specDest = path.join(buildConfig.distFolder, specFileName);
    await this.safeFiles.copyFile(specPath, specDest);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OpenAPI Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: './${specFileName}', dom_id: '#swagger-ui' });
  </script>
</body>
</html>`;

    await this.safeFiles.writeFile(path.join(buildConfig.distFolder, 'openapi.html'), html);
    this.logger.log(chalk.green(`OpenAPI documentation generated from ${specFileName}`));
  }

  private async writeSidebar(
    tree: TreeItem[],
    buildConfig: BuildConfig,
    openApiSpecPath?: string,
  ): Promise<void> {
    // Find the root branch (contains root-level files)
    const rootBranch = tree.find((item) => item.level === 0);

    // Get subfolders (all other items)
    const subfolders = tree.filter((item) => item.level > 0);

    // Build sidebar: homepage first, then subfolders
    let sidebar = '';

    // The root folder is emitted as one page named after the homepage, so link
    // to that generated page rather than to the individual source filenames.
    if (rootBranch) {
      const homepagePath = this.getOutputFileName(buildConfig, rootBranch.dir, rootBranch.name);
      sidebar += `* [${rootBranch.name}](${encodeURI(homepagePath)})\n`;
    }

    // Add subfolders with proper indentation
    subfolders.forEach((item) => {
      const indent = '    '.repeat(item.level - 1); // Adjust indentation
      const mdPath = this.getOutputFileName(buildConfig, item.dir, item.name);
      sidebar += `${indent}* [${item.name}](${encodeURI(mdPath)})\n`;
    });

    if (openApiSpecPath) {
      sidebar += `\n* [OpenAPI](openapi.html ':ignore')`;
    }

    await this.safeFiles.ensureDir(path.resolve(buildConfig.distFolder));
    await this.safeFiles.writeFile(
      path.resolve(path.join(buildConfig.distFolder, '_sidebar.md')),
      sidebar.trim(),
    );
  }

  private buildDocsifyOptions(buildConfig: BuildConfig): DocsifyOptions {
    const homepageName = buildConfig.homepageName.trim() || 'home';
    return {
      name: buildConfig.projectName,
      repo: buildConfig.repoName,
      loadSidebar: true,
      auto2top: true,
      homepage: `${homepageName}.md`,
      stylesheet: buildConfig.webTheme,
      supportSearch: buildConfig.webSearch,
      mermaidConfig: { querySelector: '.mermaid' },
      authHash: buildConfig.passwordProtected ? buildConfig.passwordHash : undefined,
      logo: buildConfig.logo || undefined,
      logoAlign: buildConfig.logo ? buildConfig.logoAlign : undefined,
      logoPosition: buildConfig.logo ? buildConfig.logoPosition : undefined,
    };
  }

  private async loadDocsifyTemplate(
    buildConfig: BuildConfig,
    docOptions: DocsifyOptions,
  ): Promise<string> {
    if (buildConfig.docsifyTemplate === '') {
      return docsifyTemplate(docOptions);
    }

    try {
      const templateModulePath = path.resolve(buildConfig.docsifyTemplate);
      const templateModule = await import(templateModulePath);

      if (typeof templateModule.docsifyTemplate === 'function') {
        return templateModule.docsifyTemplate(docOptions);
      }

      this.logger.warn(
        `Custom docsify template module at ${buildConfig.docsifyTemplate} does not export a valid 'docsifyTemplate' function. Using default.`,
      );
      return docsifyTemplate(docOptions);
    } catch (error) {
      this.logger.error(
        `Error loading custom docsify template at ${buildConfig.docsifyTemplate}. Using default.`,
        error,
      );
      return docsifyTemplate(docOptions);
    }
  }

  private async copyLogo(buildConfig: BuildConfig): Promise<void> {
    if (!buildConfig.logo) return;

    const logoSrc = path.join(buildConfig.rootFolder, buildConfig.logo);
    const logoDest = path.join(buildConfig.distFolder, buildConfig.logo);

    if (!(await this.safeFiles.pathExists(logoSrc))) {
      this.logger.warn(`Logo file not found at ${logoSrc}`);
      return;
    }

    await this.safeFiles.ensureDir(path.dirname(logoDest));
    await this.safeFiles.copyFile(logoSrc, logoDest);
  }

  async generateSiteFromTree(tree: TreeItem[], buildConfig: BuildConfig): Promise<void> {
    const openApiSpecPath = await this.findOpenApiSpec(buildConfig.rootFolder);
    await this.writeSidebar(tree, buildConfig, openApiSpecPath || undefined);

    for (const item of tree) {
      const filesChanged = await this.shouldProcessItem(item);
      if (filesChanged) {
        await this.writeUnifiedMarkdown(item, buildConfig);
        await this.markProcessedItem(item);
      } else {
        this.logger.info(`Skipping unchanged item: ${item.name}`);
      }
    }

    const docOptions = this.buildDocsifyOptions(buildConfig);
    const docTemplate = await this.loadDocsifyTemplate(buildConfig, docOptions);

    await this.safeFiles.ensureDir(path.resolve(buildConfig.distFolder));
    await this.safeFiles.writeFile(path.join(buildConfig.distFolder, 'index.html'), docTemplate);
    await this.safeFiles.writeFile(path.join(buildConfig.distFolder, '.nojekyll'), '');

    await this.copyLogo(buildConfig);

    if (openApiSpecPath) {
      await this.generateOpenApiPage(buildConfig, openApiSpecPath);
    }
  }

  async clearCache(): Promise<void> {
    await this.cache.clearCache();
  }

  async prepareSite(buildConfig: BuildConfig, cleanBeforeBuild: boolean = true): Promise<void> {
    if (!(await this.prepareOutputFolder(OutputType.site, buildConfig, cleanBeforeBuild))) {
      this.logger.warn('Output folder preparation failed.');
      return;
    }

    if (cleanBeforeBuild) {
      await this.cache.clearCache();
    }

    await this.cache.loadCache();

    const tree = await this.generateSourceTree(buildConfig);
    await this.generateSiteFromTree(tree, buildConfig);

    this.logger.log(chalk.green(`\nSITE documentation generated successfully!`));
  }
}
