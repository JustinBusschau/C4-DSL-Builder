import { getStrConfig, getBoolConfig } from './config.js';
import path from 'path';
import { promises as fs, Stats } from 'fs';
import fsExtra from 'fs-extra';
import { logger } from './logger.js';

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
  try {
    return (await fs.readdir(dir)).filter((x) => !x.startsWith('_'));
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error reading directory ${dir}: ${error.message}`);
    } else {
      logger.error(`Error reading directory ${dir}`);
    }
    return [];
  }
}

export async function safeStat(filePath: string): Promise<Stats | null> {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error getting stats for file ${filePath}: ${error.message}`);
    } else {
      logger.error(`Error getting stats for file: ${filePath}`);
    }
    return null;
  }
}

export async function safeReadFile(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error reading file ${filePath}: ${error.message}`);
    } else {
      logger.error(`Error reading file: ${filePath}`);
    }
    return null;
  }
}

export async function safeCopyFile(src: string, dest: string): Promise<void> {
  try {
    await fsExtra.copy(src, dest);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error copying file from ${src} to ${dest}: ${error.message}`);
    } else {
      logger.error(`Error copying file from ${src} to ${dest}`);
    }
  }
}

export async function safeEnsureDir(dir: string): Promise<void> {
  try {
    await fsExtra.ensureDir(dir);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error ensuring directory ${dir}: ${error.message}`);
    } else {
      logger.error(`Error ensuring directory: ${dir}`);
    }
  }
}

export async function safeEmptyDir(dir: string): Promise<boolean> {
  try {
    await fsExtra.emptyDir(dir);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error emptying directory ${dir}: ${error.message}`);
    } else {
      logger.error(`Error emptying directory: ${dir}`);
    }
    return false;
  }
}

// export async function buildTree(
//   tree: TreeItem[],
//   dir: string,
//   parent: string = null,
//   folderName: string = null,
// ): Promise<TreeItem[]> {
//   let item = tree.find((x) => x.dir === dir);
//   if (!item) {
//     item = {
//       dir: dir,
//       name: folderName,
//       level: dir.split(path.sep).length - getStrConfig('rootFolder')).split(path.sep).length + 1,
//       parent: parent,
//       mdFiles: [],
//       mmdFiles: [],
//       descendants: [],
//     };
//     tree.push(item);
//   }
// }

export async function generateTree(dir: string): Promise<TreeItem[]> {
  const tree: TreeItem[] = [];
  const rootFolderName = getFolderName(
    dir,
    getStrConfig('rootFolder'),
    getStrConfig('homepageName'),
  );

  async function generateBranch(dir: string, parent: string = null) {
    const name = getFolderName(dir, getStrConfig('rootFolder'), getStrConfig('homepageName'));

    let item = tree.find((x) => x.dir === dir);
    if (!item) {
      item = {
        dir: dir,
        name: name,
        level: dir.split(path.sep).length - getStrConfig('rootFolder').split(path.sep).length + 1,
        parent: parent,
        mdFiles: [],
        mmdFiles: [],
        descendants: [],
      };
      tree.push(item);
    }

    const files = await safeReadDir(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await fs.stat(filePath);
      if (!stats) continue;

      if (stats.isDirectory()) {
        item.descendants.push(file);
        await safeEnsureDir(
          path.join(getStrConfig('distFolder'), dir.replace(getStrConfig('rootFolder'), ''), file),
        );

        await generateBranch(filePath, dir);
      }
    }

    const mdFiles = files.filter((x) => path.extname(x).toLowerCase() === '.md');
    const mmdFiles = files.filter((x) => path.extname(x).toLowerCase() === '.mmd');

    for (const mdFile of mdFiles) {
      const fileContents = await safeReadFile(path.join(dir, mdFile));
      if (fileContents) {
        item.mdFiles.push(fileContents);
      }
    }

    for (const mmdFile of mmdFiles) {
      const fileContents = await safeReadFile(path.join(dir, mmdFile));
      item.mmdFiles.push({
        name: mmdFile,
        content: fileContents.toString(),
      });
    }

    //copy all other files
    const otherFiles = getBoolConfig('excludeOtherFiles')
      ? []
      : files.filter(
          (x) => x.startsWith('_') || ['.md', '.mmd'].indexOf(path.extname(x).toLowerCase()) === -1,
        );

    for (const otherFile of otherFiles) {
      const otherFilePath = path.join(dir, otherFile);
      const stats = await safeStat(otherFilePath);
      if (!stats || stats.isDirectory()) continue;

      await safeCopyFile(
        otherFilePath,
        path.join(
          getStrConfig('distFolder'),
          dir.replace(getStrConfig('rootFolder'), ''),
          otherFile,
        ),
      );

      if (getBoolConfig('generateCompleteMdFile'))
        await safeCopyFile(otherFilePath, path.join(getStrConfig('distFolder'), otherFile));
    }
  }

  await generateBranch(dir);

  return tree;
}
