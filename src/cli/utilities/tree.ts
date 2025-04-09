import { getStrConfig, getBoolConfig } from './config.js';
import path from 'path';
import { promises as fs, Stats } from 'fs';
import fsExtra from 'fs-extra';
import { createLogger } from './logger.js';

export interface TreeItem {
  dir: string;
  name: string;
  level: number;
  parent: string | null;
  mdFiles: Buffer[];
  mmdFiles: { name: string; content: string }[];
  descendants: string[];
}

export function getFolderName(dir: string, root: string, homepage: string): string {
  return path.resolve(dir) === path.resolve(root) ? homepage : path.parse(dir).base;
}

export async function safeReadDir(dir: string): Promise<string[]> {
  const logger = createLogger();
  try {
    const files: string[] = await fs.readdir(dir);
    return files.filter((x) => !x.startsWith('_'));
  } catch (error) {
    logger.error(`Error reading directory ${dir}`, error);
    return [];
  }
}

export async function safeStat(filePath: string): Promise<Stats | null> {
  const logger = createLogger();
  try {
    return await fs.stat(filePath);
  } catch (error) {
    logger.error(`Error getting stats for file: ${filePath}`, error);
    return null;
  }
}

export async function safeReadFile(filePath: string): Promise<Buffer | null> {
  const logger = createLogger();
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    logger.error(`Error reading file: ${filePath}`, error);
    return null;
  }
}

export async function safeCopyFile(src: string, dest: string): Promise<void> {
  const logger = createLogger();
  try {
    await fsExtra.copy(src, dest);
  } catch (error) {
    logger.error(`Error copying file from ${src} to ${dest}`, error);
  }
}

export async function safeEnsureDir(dir: string): Promise<void> {
  const logger = createLogger();
  try {
    await fsExtra.ensureDir(dir);
  } catch (error) {
    logger.error(`Error ensuring directory: ${dir}`, error);
  }
}

export async function safeEmptySubFolder(dir: string): Promise<boolean> {
  const logger = createLogger();
  const resolvedDir = path.resolve(dir);
  const cwd = process.cwd();

  if (!resolvedDir.startsWith(cwd + path.sep)) {
    logger.warn(`Refusing to empty non-subdirectory path: ${resolvedDir}`);
    return false;
  }

  try {
    await fsExtra.emptyDir(dir);
    return true;
  } catch (error) {
    logger.error(`Error emptying directory: ${dir}`, error);
    return false;
  }
}

async function ingestMarkdownFiles(dir: string, files: string[], treeItem: TreeItem) {
  const mdFiles = files.filter((x) => path.extname(x).toLowerCase() === '.md');
  for (const mdFile of mdFiles) {
    const fileContents = await safeReadFile(path.join(dir, mdFile));
    if (fileContents) {
      treeItem.mdFiles.push(fileContents);
    }
  }
}

async function ingestMermaidFiles(dir: string, files: string[], treeItem: TreeItem) {
  const mmdFiles = files.filter((x) => path.extname(x).toLowerCase() === '.mmd');
  for (const mmdFile of mmdFiles) {
    const fileContents = await safeReadFile(path.join(dir, mmdFile));
    if (fileContents) {
      treeItem.mmdFiles.push({
        name: mmdFile,
        content: fileContents.toString(),
      });
    }
  }
}

async function copyOtherFiles(dir: string, files: string[], baseFolder: string) {
  if (getBoolConfig('excludeOtherFiles')) return;

  const otherFiles = files.filter((x) => {
    const ext = path.extname(x).toLowerCase();
    return !x.startsWith('_') && !x.startsWith('.') && !['.md', '.mmd'].includes(ext);
  });

  for (const file of otherFiles) {
    const filePath = path.join(dir, file);
    const stats = await safeStat(filePath);
    if (!stats || stats.isDirectory()) continue;

    await safeCopyFile(
      filePath,
      path.join(baseFolder, dir.replace(getStrConfig('rootFolder'), ''), file),
    );

    if (getBoolConfig('generateCompleteMdFile')) {
      await safeCopyFile(filePath, path.join(getStrConfig('distFolder'), file));
    }
  }
}

export async function itemiseTreeFolder(
  dir: string,
  baseFolder: string,
  parent: string | null,
  tree: TreeItem[],
): Promise<TreeItem> {
  const rootFolderName = getFolderName(dir, baseFolder, getStrConfig('homepageName'));

  const treeItem: TreeItem = {
    dir: dir,
    name: rootFolderName,
    level: dir.split(path.sep).length - baseFolder.split(path.sep).length,
    parent: parent,
    mdFiles: [],
    mmdFiles: [],
    descendants: [],
  };

  const files = await safeReadDir(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await safeStat(filePath);
    if (!stats) continue;

    if (stats.isDirectory()) {
      treeItem.descendants.push(file);
      await safeEnsureDir(path.join(baseFolder, dir.replace(getStrConfig('rootFolder'), ''), file));
      tree.push(await itemiseTreeFolder(filePath, baseFolder, dir, tree));
    }
  }

  await ingestMarkdownFiles(dir, files, treeItem);
  await ingestMermaidFiles(dir, files, treeItem);
  await copyOtherFiles(dir, files, baseFolder);

  return treeItem;
}

export async function generateTree(baseFolder: string): Promise<TreeItem[]> {
  const tree: TreeItem[] = [];
  tree.push(await itemiseTreeFolder(baseFolder, baseFolder, null, tree));

  return tree;
}
