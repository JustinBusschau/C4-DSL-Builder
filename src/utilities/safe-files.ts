import path from 'path';
import { promises as fs, Stats } from 'fs';
import fsExtra from 'fs-extra';
import { CliLogger } from './cli-logger.js';
import { TreeItem } from '../types/tree-item.js';

export class SafeFiles {
  constructor(private readonly logger: CliLogger = new CliLogger(SafeFiles.name)) {}

  getFolderName(dir: string, root: string, homepage: string): string {
    return path.resolve(dir) === path.resolve(root) ? homepage : path.parse(dir).base;
  }

  async pathExists(filePath: string): Promise<boolean> {
    try {
      return await fsExtra.pathExists(filePath);
    } catch (error) {
      this.logger.error(`Error checking file existence: ${filePath}`, error);
      return false;
    }
  }

  async createDir(dir: string): Promise<void> {
    try {
      await fsExtra.mkdirp(dir);
    } catch (error) {
      this.logger.error(`Error creating directory ${dir}`, error);
    }
  }

  async emptySubFolder(dir: string): Promise<boolean> {
    const resolvedDir = path.resolve(dir);
    const cwd = process.cwd();

    if (!resolvedDir.startsWith(cwd + path.sep)) {
      this.logger.warn(`Refusing to empty non-subdirectory path: ${resolvedDir}`);
      return false;
    }

    try {
      await fsExtra.emptyDir(dir);
      return true;
    } catch (error) {
      this.logger.error(`Error emptying directory: ${dir}`, error);
      return false;
    }
  }

  async copyFile(src: string, dest: string): Promise<void> {
    try {
      await fsExtra.copy(src, dest);
    } catch (error) {
      this.logger.error(`Error copying file from ${src} to ${dest}`, error);
    }
  }

  async removeFile(path: string): Promise<void> {
    try {
      await fs.unlink(path);
    } catch (error) {
      this.logger.error(`Error removing file ${path}`, error);
    }
  }

  async accessFile(path: string): Promise<void> {
    try {
      await fs.access(path);
    } catch (error) {
      this.logger.error(`Error accessing file ${path}`, error);
    }
  }

  async readDir(dir: string): Promise<string[]> {
    try {
      const files: string[] = await fs.readdir(dir);
      return files.filter((x) => !x.startsWith('_'));
    } catch (error) {
      this.logger.error(`Error reading directory ${dir}`, error);
      return [];
    }
  }

  async readFileAsString(filePath: string): Promise<string | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content.toString();
    } catch (error) {
      this.logger.error(`Error reading file: ${filePath}`, error);
      return null;
    }
  }

  async writeFile(filePath: string, data: string): Promise<void> {
    try {
      await fs.writeFile(filePath, data);
    } catch (error) {
      this.logger.error(`Error writing file: ${filePath}`, error);
    }
  }

  async stat(filePath: string): Promise<Stats | null> {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      this.logger.error(`Error getting stats for file: ${filePath}`, error);
      return null;
    }
  }

  async ensureDir(dir: string): Promise<void> {
    try {
      await fsExtra.ensureDir(dir);
    } catch (error) {
      this.logger.error(`Error ensuring directory: ${dir}`, error);
    }
  }

  private async ingestMarkdownFiles(dir: string, files: string[], treeItem: TreeItem) {
    const mdFiles = files.filter((x) => path.extname(x).toLowerCase() === '.md');
    for (const mdFile of mdFiles) {
      const fileContents = await this.readFileAsString(path.join(dir, mdFile));
      if (fileContents) {
        treeItem.mdFiles.push({ name: mdFile, content: fileContents });
      }
    }
  }

  private async ingestMermaidFiles(dir: string, files: string[], treeItem: TreeItem) {
    const mmdFiles = files.filter((x) => path.extname(x).toLowerCase() === '.mmd');
    for (const mmdFile of mmdFiles) {
      const fileContents = await this.readFileAsString(path.join(dir, mmdFile));
      if (fileContents) {
        treeItem.mmdFiles.push({
          name: mmdFile,
          content: fileContents.toString(),
        });
      }
    }
  }

  private async itemiseTreeFolder(
    dir: string,
    baseFolder: string,
    rootFolder: string,
    parent: string | null,
    homepageName: string,
    tree: TreeItem[],
  ): Promise<TreeItem | null> {
    const rootFolderName = this.getFolderName(dir, baseFolder, homepageName);

    const treeItem: TreeItem = {
      dir: dir,
      name: rootFolderName,
      level: dir.split(path.sep).length - baseFolder.split(path.sep).length,
      parent: parent,
      mdFiles: [],
      mmdFiles: [],
      descendants: [],
    };

    const files = await this.readDir(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await this.stat(filePath);
      if (!stats) continue;

      if (stats.isDirectory()) {
        treeItem.descendants.push(file);
        await this.ensureDir(path.join(baseFolder, dir.replace(rootFolder, ''), file));
        const childTreeItem = await this.itemiseTreeFolder(
          filePath,
          baseFolder,
          rootFolder,
          dir,
          homepageName,
          tree,
        );
        if (childTreeItem) {
          tree.unshift(childTreeItem);
        }
      }
    }

    await this.ingestMarkdownFiles(dir, files, treeItem);
    await this.ingestMermaidFiles(dir, files, treeItem);

    if (
      treeItem.mdFiles.length > 0 ||
      treeItem.mmdFiles.length > 0 ||
      treeItem.descendants.length > 0
    ) {
      return treeItem;
    }

    return null;
  }

  async generateTree(
    baseFolder: string,
    rootFolder: string,
    homepageName: string,
  ): Promise<TreeItem[]> {
    const tree: TreeItem[] = [];
    const rootBranch = await this.itemiseTreeFolder(
      baseFolder,
      baseFolder,
      rootFolder,
      null,
      homepageName,
      tree,
    );
    if (rootBranch) {
      tree.unshift(rootBranch);
    }

    return tree;
  }
}
