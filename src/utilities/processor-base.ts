import path from 'path';
import chalk from 'chalk';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import { unified } from 'unified';
import { BuildConfig } from '../types/build-config.js';
import { CliLogger } from './cli-logger.js';
import { SafeFiles } from './safe-files.js';
import { TreeItem } from '../types/tree-item.js';
import { MermaidProcessor } from './mermaid-processor.js';
import type { Handle } from 'mdast-util-to-markdown';
import { toString } from 'mdast-util-to-string';
import type { Root, Code, Image, Link, Parent } from 'mdast';

export enum OutputType {
  md = 'md',
  pdf = 'pdf',
  site = 'site',
}

export class ProcessorBase {
  constructor(
    protected readonly safeFiles: SafeFiles,
    protected readonly logger: CliLogger,
    protected readonly mermaid: MermaidProcessor,
  ) {}

  private collectMermaidLinks(
    markdownContent: Root,
    contentLocation: string,
    buildConfig: BuildConfig,
  ): typeof mmdFiles {
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

    return mmdFiles;
  }

  private collectMermaidCodeBlocks(
    markdownContent: Root,
    contentLocation: string,
    buildConfig: BuildConfig,
  ): typeof mmdFiles {
    const mmdFiles: Array<{
      node: Link | Code;
      absolutePath: string;
      destPath: string;
      relativePath: string;
      index: number;
      parent: Parent;
      content?: string;
    }> = [];

    visit(markdownContent, 'code', (node, index, parent) => {
      if (node.lang === 'mermaid' && typeof index === 'number' && parent) {
        const absolutePath = path.resolve(contentLocation);
        const destPath = path.resolve(
          absolutePath.replace(buildConfig.rootFolder, buildConfig.distFolder),
        );
        const relativePath = path.relative(path.resolve(buildConfig.distFolder), destPath);

        mmdFiles.push({
          node,
          absolutePath,
          destPath,
          relativePath,
          index,
          parent,
          content: node.value,
        });
      }
    });

    return mmdFiles;
  }

  private async processMermaidFile(
    file: {
      node: Link | Code;
      absolutePath: string;
      destPath: string;
      relativePath: string;
      index: number;
      parent: Parent;
      content: string;
    },
    buildConfig: BuildConfig,
    contentLocation: string,
  ): Promise<void> {
    try {
      let content = file.content;
      if (content === 'loadFromFile') {
        if (!(await this.safeFiles.pathExists(file.absolutePath))) {
          this.logger.warn(`Linked mermaid file not found: ${file.absolutePath}`);
          return;
        }
        content = (await this.safeFiles.readFileAsString(file.absolutePath)) ?? '';
      } else {
        const uniqueName = await this.mermaid.generateUniqueMmdFilename(file.destPath);
        file.destPath = path.join(file.destPath, uniqueName);
      }

      if (!content.trim()) {
        this.logger.warn(`Mermaid content empty at ${file.absolutePath}`);
        return;
      }

      await this.mermaid.diagramFromMermaidString(content, file.destPath);

      let imgUrl = path.relative(path.resolve(buildConfig.distFolder), file.destPath);
      if (buildConfig.generateWebsite) {
        imgUrl = path.relative(
          path.resolve(contentLocation.replace(buildConfig.rootFolder, buildConfig.distFolder)),
          file.destPath,
        );
      }

      file.parent.children.splice(file.index, 1, {
        type: 'paragraph',
        children: [
          {
            type: 'image',
            alt: path.basename(file.destPath),
            url: imgUrl,
          },
        ],
      });
    } catch (error) {
      this.logger.error(`Failed to process Mermaid file: ${file.absolutePath}`, error);
    }
  }

  async convertMermaidToImages(
    markdownContent: Root,
    contentLocation: string,
    buildConfig: BuildConfig,
  ): Promise<void> {
    const mmdFiles = [
      ...this.collectMermaidLinks(markdownContent, contentLocation, buildConfig),
      ...this.collectMermaidCodeBlocks(markdownContent, contentLocation, buildConfig),
    ];

    for (const file of mmdFiles) {
      await this.processMermaidFile(
        file as {
          node: Link | Code;
          absolutePath: string;
          destPath: string;
          relativePath: string;
          index: number;
          parent: Parent;
          content: string;
        },
        buildConfig,
        contentLocation,
      );
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
        } else {
          // links shouldnot be compiled (https://docsify.js.org/#/helpers?id=ignore-to-compile-link)
          linkedItem.node.url = `${linkedItem.node.url.replace(/\s/g, '%20')} ':ignore'`;
        }
        this.logger.info(`Copied file to ${linkedItem.relativePath}`);
      } catch (err) {
        this.logger.error(`Failed to copy linked item ${linkedItem.absolutePath}`, err);
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
    const linkHandler: Handle = (node, _parent, _context) => {
      const linkText = toString(node);
      const url = (node as Link).url;
      return `[${linkText}](${url})`;
    };

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

    return unified()
      .use(remarkStringify, { handlers: { link: linkHandler } })
      .stringify(markdownContent);
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

  async buildDocumentBody(tree: TreeItem[], buildConfig: BuildConfig): Promise<string> {
    let docBody = '';

    for (const item of tree) {
      const name = this.safeFiles.getFolderName(
        item.dir,
        buildConfig.rootFolder,
        buildConfig.homepageName,
      );
      docBody += `\n\n# ${name}`;

      if (name !== buildConfig.homepageName) {
        docBody += `\n\n[${buildConfig.homepageName}](#${encodeURI(buildConfig.projectName).replace(/%20/g, '-')})`;
      }

      docBody += '\n\n';
      docBody += await this.processMarkdownDocument(item, buildConfig);
    }

    return docBody;
  }

  generateDocumentHeader(tree: TreeItem[], buildConfig: BuildConfig): string {
    const docHeader = `# ${buildConfig.projectName}\n\n`;

    const toc = tree
      .map((item) => {
        const indent = '    '.repeat(item.level);
        return `${indent}* [${item.name}](#${encodeURI(item.name).replace(/%20/g, '-')})`;
      })
      .join('\n');

    return `${docHeader}\n${toc}\n\n---`;
  }

  async prepareOutputFolder(
    type: OutputType,
    buildConfig: BuildConfig,
    cleanBeforeBuild: boolean = true,
  ): Promise<boolean> {
    const targetFolderBase = buildConfig.distFolder;
    if (!targetFolderBase?.trim?.() || targetFolderBase === 'undefined') {
      this.logger.error(`Please run \`config\` before attempting to run \`${type}\`.`);
      return false;
    }

    const targetFolder = path.join(targetFolderBase);
    if (cleanBeforeBuild) {
      if (!(await this.safeFiles.emptySubFolder(targetFolder))) {
        this.logger.error(`Failed to empty the target folder: ${targetFolder}`);
        return false;
      }
    }

    this.logger.log(
      chalk.green(`\nBuilding ${type.toUpperCase()} documentation in ./${targetFolder}`),
    );
    return true;
  }

  async generateSourceTree(buildConfig: BuildConfig): Promise<TreeItem[]> {
    const tree = await this.safeFiles.generateTree(
      buildConfig.rootFolder,
      buildConfig.rootFolder,
      buildConfig.homepageName,
    );

    this.logger.log(chalk.magenta(`Parsed ${tree.length} folders.\n`));
    return tree;
  }
}
