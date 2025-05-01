import path from 'path';
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
    const destFileName = path.join(destPath, `${name}.md`);
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

  private async writeSidebar(tree: TreeItem[], buildConfig: BuildConfig): Promise<void> {
    const sidebar = tree
      .map((item) => {
        const indent = '    '.repeat(item.level);
        const mdPath = this.getOutputFileName(buildConfig, item.dir, item.name);
        return `${indent}* [${item.name}](${encodeURI(mdPath)})`;
      })
      .join('\n');

    await this.safeFiles.ensureDir(path.resolve(buildConfig.distFolder));
    await this.safeFiles.writeFile(
      path.resolve(path.join(buildConfig.distFolder, '_sidebar.md')),
      sidebar,
    );
  }

  async generateSiteFromTree(tree: TreeItem[], buildConfig: BuildConfig): Promise<void> {
    buildConfig.embedMermaidDiagrams = false;

    await this.writeSidebar(tree, buildConfig);

    for (const item of tree) {
      const filesChanged = await this.shouldProcessItem(item);
      if (filesChanged) {
        await this.writeUnifiedMarkdown(item, buildConfig);
        await this.markProcessedItem(item);
      } else {
        this.logger.info(`Skipping unchanged item: ${item.name}`);
      }
    }

    const docOptions: DocsifyOptions = {
      name: buildConfig.projectName,
      repo: buildConfig.repoName,
      loadSidebar: true,
      auto2top: true,
      homepage: `${buildConfig.homepageName}.md`,
      stylesheet: buildConfig.webTheme,
      supportSearch: buildConfig.webSearch,
    };

    let docTemplate = '';
    if (buildConfig.docsifyTemplate === '') {
      docTemplate = docsifyTemplate(docOptions);
    } else {
      try {
        const templateModulePath = path.resolve(buildConfig.docsifyTemplate);
        const templateModule = await import(templateModulePath);

        if (typeof templateModule.docsifyTemplate === 'function') {
          docTemplate = templateModule.docsifyTemplate(docOptions);
        } else {
          this.logger.warn(
            `Custom docsify template module at ${buildConfig.docsifyTemplate} does not export a valid 'docsifyTemplate' function. Using default.`,
          );
          docTemplate = docsifyTemplate(docOptions);
        }
      } catch (error) {
        this.logger.error(
          `Error loading custom docsify template at ${buildConfig.docsifyTemplate}. Using default.`,
          error,
        );
        docTemplate = docsifyTemplate(docOptions);
      }
    }

    await this.safeFiles.ensureDir(path.resolve(buildConfig.distFolder));
    await this.safeFiles.writeFile(path.join(buildConfig.distFolder, 'index.html'), docTemplate);
    await this.safeFiles.writeFile(path.join(buildConfig.distFolder, '.nojekyll'), '');
  }

  async prepareSite(buildConfig: BuildConfig): Promise<void> {
    if (!(await this.prepareOutputFolder(OutputType.site, buildConfig))) {
      this.logger.warn('Output folder preparation failed.');
      return;
    }

    await this.cache.loadCache();

    const tree = await this.generateSourceTree(buildConfig);
    await this.generateSiteFromTree(tree, buildConfig);

    this.logger.log(chalk.green(`\nSITE documentation generated successfully!`));
  }
}
