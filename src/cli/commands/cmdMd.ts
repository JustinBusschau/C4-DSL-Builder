import { getStrConfig, getBoolConfig } from '../utilities/config.js';
import path from 'path';
import { createLogger } from '../utilities/logger.js';
import chalk from 'chalk';
import { safeEmptySubFolder, generateTree, TreeItem } from '../utilities/tree.js';
import { generateMermaidDiagram } from '../utilities/mermaid.js';
// import { generateMD, generateSingleMD } from '../utilities/markdown.js';

export async function convertMermaidDiagrams(tree: TreeItem[]) {
  const logger = createLogger();
  for (const item of tree) {
    for (const mdFile of item.mdFiles) {
      const content = mdFile.toString();
      const mermaidBlocks = Array.from(content.matchAll(/```mermaid\n([\s\S]*?)```/g));

      if (mermaidBlocks.length > 0) {
        logger.log(chalk.blue(`Found ${mermaidBlocks.length} Mermaid diagrams in ${item.dir}`));

        for (let i = 0; i < mermaidBlocks.length; i++) {
          const diagramContent = mermaidBlocks[i][1];
          const outputPath = path.join(
            getStrConfig('distFolder'),
            item.dir.replace(getStrConfig('rootFolder'), ''),
            `${path.basename(item.dir)}_${i}.svg`,
          );

          await generateMermaidDiagram(diagramContent, outputPath);
        }
      }
    }
  }
}

export async function cmdMd() {
  const logger = createLogger();
  const targetFolderBase = getStrConfig('distFolder');
  if (!targetFolderBase?.trim?.() || targetFolderBase === 'undefined') {
    logger.error('Please run `config` before attempting to run `md`.');
    return;
  }

  const targetFolder = path.join(targetFolderBase);
  if (!(await safeEmptySubFolder(targetFolder))) {
    logger.error(`Failed to empty the target folder: ${targetFolder}`);
    return;
  }

  logger.log(chalk.green(`\nBuilding Markdown documentation in ./${targetFolder}`));

  const tree = await generateTree(getStrConfig('rootFolder'));

  if (!getBoolConfig('embedMermaidDiagrams')) {
    logger.log(
      chalk.blue(
        `Parsed ${tree.length} folders.\nConverting inline Mermaid diagrams to SVG files...`,
      ),
    );
    await convertMermaidDiagrams(tree);
  }

  if (getBoolConfig('generateCompleteMdFile')) {
    console.log(`await generateSingleMD(tree);`);
  } else {
    console.log(`await generateMD(tree);`);
  }

  logger.log(chalk.green(`\nMarkdown documentation generated successfully!`));
}
