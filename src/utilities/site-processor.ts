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

  private async findOpenApiSpec(rootFolder: string): Promise<string | null> {
    const files = await this.safeFiles.readDir(rootFolder);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.yml' || ext === '.yaml') {
        const content = await this.safeFiles.readFileAsString(path.join(rootFolder, file));
        if (content) {
          const firstLine = content.trim().split('\n')[0].trim();
          if (firstLine.startsWith('openapi:') || firstLine.startsWith('swagger:')) {
            return file;
          }
        }
      }
    }
    return null;
  }

  private async generateOpenApiPage(buildConfig: BuildConfig, specFileName: string): Promise<void> {
    const specSrc = path.join(buildConfig.rootFolder, specFileName);
    const specDest = path.join(buildConfig.distFolder, specFileName);
    await this.safeFiles.copyFile(specSrc, specDest);

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
    openApiSpec?: string,
  ): Promise<void> {
    // Find the root branch (contains root-level files)
    const rootBranch = tree.find((item) => item.level === 0);

    // Get subfolders (all other items)
    const subfolders = tree.filter((item) => item.level > 0);

    // Build sidebar: root files first, then subfolders
    let sidebar = '';

    // Add root-level files (no indentation)
    if (rootBranch) {
      const rootFiles = [
        ...(rootBranch.mdFiles || []).map((f) => ({ name: f.name, type: 'md' })),
        ...(rootBranch.mmdFiles || []).map((f) => ({ name: f.name, type: 'mmd' })),
      ];
      rootFiles.forEach((file) => {
        const mdPath = this.getOutputFileName(buildConfig, rootBranch.dir, file.name);
        sidebar += `* [${file.name}](${encodeURI(mdPath)})\n`;
      });
    }

    // Add subfolders with proper indentation
    subfolders.forEach((item) => {
      const indent = '    '.repeat(item.level - 1); // Adjust indentation
      const mdPath = this.getOutputFileName(buildConfig, item.dir, item.name);
      sidebar += `${indent}* [${item.name}](${encodeURI(mdPath)})\n`;
    });

    if (openApiSpec) {
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
    const openApiSpec = await this.findOpenApiSpec(buildConfig.rootFolder);
    await this.writeSidebar(tree, buildConfig, openApiSpec || undefined);

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

    if (openApiSpec) {
      await this.generateOpenApiPage(buildConfig, openApiSpec);
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
