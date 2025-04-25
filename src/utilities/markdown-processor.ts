import path from 'path';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import { unified } from 'unified';
import { BuildConfig } from '../types/build-config.js';
import chalk from 'chalk';
import { SafeFiles } from './safe-files.js';
import { CliLogger } from './cli-logger.js';
import { TreeItem } from '../types/tree-item.js';
import { OutputType, ProcessorBase } from './processor-base.js';

import type { Root, Code, Image, Link, Parent } from 'mdast';
import { MermaidProcessor } from './mermaid-processor.js';

export class MarkdownProcessor extends ProcessorBase {
  constructor(
    protected readonly safeFiles: SafeFiles = new SafeFiles(),
    protected readonly logger: CliLogger = new CliLogger(MarkdownProcessor.name),
    private readonly mermaid: MermaidProcessor = new MermaidProcessor(),
  ) {
    super(safeFiles, logger);
  }

  async copyLinkedFiles(
    markdownContent: Root,
    contentLocation: string,
    buildConfig: BuildConfig,
  ): Promise<void> {
    const linkedFiles: Array<{
      node: Link | Image;
      absolutePath: string;
      destPath: string;
      relativePath: string;
    }> = [];

    // linked images
    visit(markdownContent, 'image', (node: Image) => {
      const imagePath = node.url;
      if (!imagePath.startsWith('http')) {
        const absolutePath = path.resolve(contentLocation, imagePath);
        const destPath = absolutePath.replace(buildConfig.rootFolder, buildConfig.distFolder);
        const relativePath = path.relative(path.resolve(buildConfig.distFolder), destPath);

        linkedFiles.push({
          node,
          absolutePath,
          destPath,
          relativePath,
        });
      }
    });

    // linked files (non-image files)
    visit(markdownContent, 'link', (node, index, parent) => {
      const itemPath = node.url;
      if (
        node.type === 'link' &&
        !itemPath.startsWith('http') &&
        !itemPath.endsWith('.mmd') && // EXclude mermaid
        typeof index === 'number' &&
        parent
      ) {
        const absolutePath = path.resolve(contentLocation, itemPath);
        const destPath = absolutePath.replace(buildConfig.rootFolder, buildConfig.distFolder);
        const relativePath = path.relative(path.resolve(buildConfig.distFolder), destPath);

        linkedFiles.push({
          node,
          absolutePath,
          destPath,
          relativePath,
        });
      }
    });

    // copy found files
    for (const linkedItem of linkedFiles) {
      try {
        if (!(await this.safeFiles.pathExists(linkedItem.absolutePath))) {
          this.logger.warn(`Linked file not found: ${linkedItem.absolutePath}`);
          continue;
        }
        await this.safeFiles.copyFile(linkedItem.absolutePath, linkedItem.destPath);
        linkedItem.node.url = linkedItem.relativePath;
        if (linkedItem.node.type === 'image') {
          linkedItem.node.alt =
            linkedItem.node.alt ??
            path.basename(linkedItem.absolutePath, path.extname(linkedItem.absolutePath));
        }
        this.logger.info(`Copied file to ${linkedItem.relativePath}`);
      } catch (err) {
        this.logger.error(`Failed to copy linked item ${linkedItem.absolutePath}`, err);
      }
    }
  }

  async embedLinkedMermaidFiles(
    markdownContent: Root,
    contentLocation: string,
    buildConfig: BuildConfig,
  ): Promise<void> {
    const mmdLinks: Array<{
      node: Link;
      absolutePath: string;
      destPath: string;
      relativePath: string;
      index: number;
      parent: Parent;
    }> = [];

    visit(markdownContent, 'link', (node, index, parent) => {
      const itemPath = node.url;
      if (
        node.type === 'link' &&
        !itemPath.startsWith('http') &&
        itemPath.endsWith('.mmd') && // INclude mermaid
        typeof index === 'number' &&
        parent
      ) {
        const absolutePath = path.resolve(contentLocation, itemPath);
        const destPath = absolutePath.replace(buildConfig.rootFolder, buildConfig.distFolder);
        const relativePath = path.relative(path.resolve(buildConfig.distFolder), destPath);

        mmdLinks.push({
          node,
          absolutePath,
          destPath,
          relativePath,
          index,
          parent,
        });
      }
    });

    for (const mmdLink of mmdLinks) {
      try {
        if (!(await this.safeFiles.pathExists(mmdLink.absolutePath))) {
          this.logger.warn(`Linked mermaid file not found: ${mmdLink.absolutePath}`);
          continue;
        }

        const mermaidContent = await this.safeFiles.readFileAsString(mmdLink.absolutePath);
        if (!mermaidContent) {
          this.logger.warn(`Linked mermaid file appears to be empty: ${mmdLink.absolutePath}`);
          continue;
        }

        mmdLink.parent.children.splice(mmdLink.index, 1, {
          type: 'code',
          lang: 'mermaid',
          value: mermaidContent,
        });

        this.logger.info(`Embedded mermaid source from ${mmdLink.absolutePath}`);
      } catch (error) {
        this.logger.error(`Failed to process linked Mermaid file: ${mmdLink.absolutePath}`, error);
      }
    }
  }

  async convertMermaidToImages(
    markdownContent: Root,
    contentLocation: string,
    buildConfig: BuildConfig,
  ): Promise<void> {
    const mmdFiles: Array<{
      node: Link | Code;
      absolutePath: string;
      destPath: string;
      relativePath: string;
      index: number;
      parent: Parent;
      content?: string;
    }> = [];

    visit(markdownContent, 'link', (node, index, parent) => {
      const itemPath = node.url;
      if (
        node.type === 'link' &&
        !itemPath.startsWith('http') &&
        itemPath.endsWith('.mmd') &&
        typeof index === 'number' &&
        parent
      ) {
        const absolutePath = path.resolve(contentLocation, itemPath);
        const destPath = absolutePath
          .replace(buildConfig.rootFolder, buildConfig.distFolder)
          .replace('.mmd', '.svg');
        const relativePath = path.relative(path.resolve(buildConfig.distFolder), destPath);

        mmdFiles.push({
          node,
          absolutePath,
          destPath,
          relativePath,
          index,
          parent,
          content: 'loadFromFile',
        });
      }
    });

    visit(markdownContent, 'code', (node, index, parent) => {
      if (
        node.type === 'code' &&
        node.value &&
        node.lang === 'mermaid' &&
        typeof index === 'number' &&
        parent
      ) {
        const absolutePath = path.resolve(contentLocation);
        const destPath = absolutePath.replace(buildConfig.rootFolder, buildConfig.distFolder);
        const relativePath = path.relative(path.resolve(buildConfig.distFolder), destPath);
        const content = node.value;

        mmdFiles.push({
          node,
          absolutePath,
          destPath,
          relativePath,
          index,
          parent,
          content,
        });
      }
    });

    for (const mmdFile of mmdFiles) {
      try {
        let mmdContent = mmdFile.content;
        if (mmdContent === 'loadFromFile') {
          if (!(await this.safeFiles.pathExists(mmdFile.absolutePath))) {
            this.logger.warn(`Linked mermaid file not found: ${mmdFile.absolutePath}`);
            continue;
          }

          mmdContent = (await this.safeFiles.readFileAsString(mmdFile.absolutePath)) ?? undefined;
          if (!mmdContent) {
            this.logger.warn(`Linked mermaid file appears to be empty: ${mmdFile.absolutePath}`);
            continue;
          }
        } else {
          const uniqueName = await this.mermaid.generateUniqueMmdFilename(mmdFile.destPath);
          mmdFile.destPath = path.join(mmdFile.destPath, uniqueName);
        }

        if (!mmdContent?.trim()) {
          this.logger.warn(
            `Unable to load mermaid content from ${mmdFile.absolutePath} for output to ${mmdFile.destPath}`,
          );
          continue;
        }
        await this.mermaid.diagramFromMermaidString(mmdContent, mmdFile.destPath);

        // update the link
        mmdFile.parent.children.splice(mmdFile.index, 1, {
          type: 'paragraph',
          children: [
            {
              type: 'image',
              alt: path.basename(mmdFile.destPath),
              url: path.relative(path.resolve(buildConfig.distFolder), mmdFile.destPath),
            },
          ],
        });
      } catch (error) {
        this.logger.error(`Failed to process linked Mermaid file: ${mmdFile.absolutePath}`, error);
      }
    }
  }

  async prepareMarkdownContent(
    content: string,
    mdName: string,
    contentLocation: string,
    buildConfig: BuildConfig,
  ): Promise<string> {
    const markdownContent = unified().use(remarkParse).parse(content);

    this.logger.info(`Copying linked files in ${contentLocation} ...`);
    await this.copyLinkedFiles(markdownContent, contentLocation, buildConfig);

    if (buildConfig.embedMermaidDiagrams) {
      this.logger.info(`Converting linked Mermaid files to embedded code blocks in ${mdName} ...`);
      await this.embedLinkedMermaidFiles(markdownContent, contentLocation, buildConfig);
    } else {
      this.logger.info(`Converting Mermaid documents in ${mdName} to linked SVG images ...`);
      await this.convertMermaidToImages(markdownContent, contentLocation, buildConfig);
    }
    this.logger.info('... Done!');

    return unified().use(remarkStringify).stringify(markdownContent);
  }

  async processMarkdownDocument(item: TreeItem, buildConfig: BuildConfig): Promise<string> {
    const texts: string[] = [];

    if (Array.isArray(item.mdFiles)) {
      for (const mdFile of item.mdFiles) {
        try {
          const processed = await this.prepareMarkdownContent(
            mdFile.content,
            mdFile.name,
            item.dir,
            buildConfig,
          );
          texts.push(processed);
        } catch (error) {
          this.logger.error(`Failed to process markdown file: ${item.dir}/${mdFile.name}`, error);
        }
      }
    }

    return '\n\n' + texts.join('\n\n');
  }

  async generateMarkdownFromTree(tree: TreeItem[], buildConfig: BuildConfig): Promise<void> {
    let MD = `# ${buildConfig.projectName}\n\n`;

    const toc = tree
      .map((item) => {
        const indent = '    '.repeat(item.level);
        return `${indent}* [${item.name}](#${encodeURI(item.name).replace(/%20/g, '-')})`;
      })
      .join('\n');

    MD += `${toc}\n\n---`;

    for (const item of tree) {
      const name = this.safeFiles.getFolderName(
        item.dir,
        buildConfig.rootFolder,
        buildConfig.homepageName,
      );
      MD += `\n\n# ${name}`;

      if (name !== buildConfig.homepageName) {
        MD += `\n\n[${buildConfig.homepageName}](#${encodeURI(buildConfig.projectName).replace(/%20/g, '-')})`;
      }

      MD += '\n\n';

      MD += await this.processMarkdownDocument(item, buildConfig);
    }

    const outPath = path.join(buildConfig.distFolder, 'README.md');
    try {
      await this.safeFiles.writeFile(outPath, MD);
      this.logger.info(`Wrote README.md to ${outPath}`);
    } catch (err) {
      this.logger.error(`Failed to write README.md`, err);
    }
  }

  async prepareMarkdown(buildConfig: BuildConfig): Promise<void> {
    if (!(await this.prepareOutputFolder(OutputType.md, buildConfig))) {
      this.logger.warn('Output folder preparation failed.');
      return;
    }

    const tree = await this.generateSourceTree(buildConfig);
    await this.generateMarkdownFromTree(tree, buildConfig);

    this.logger.log(chalk.green(`\nMarkdown documentation generated successfully!`));
  }
}
