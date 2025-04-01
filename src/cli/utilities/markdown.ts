import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import type { Code, Image, Link } from 'mdast';
import path from 'path';
import fs from 'fs-extra';
import { generateMermaidDiagram } from './mermaid.js';
import { TreeItem, getFolderName } from './tree.js';
import { getStrConfig, getBoolConfig } from './config.js';

interface ProcessMarkdownOptions {
  itemDir: string;
  distFolder: string;
  rootFolder: string;
  generateCompleteMdFile: boolean;
}

export async function processMarkdown(
  content: string,
  options: ProcessMarkdownOptions,
): Promise<string> {
  const tree = unified().use(remarkParse).parse(content);

  const mermaidBlocks: Array<{
    node: Code;
    value: string;
    index: number;
  }> = [];

  const mmdLinks: Link[] = [];

  let blockIndex = 0;

  visit(tree, 'code', (node: Code) => {
    if (node.lang === 'mermaid') {
      mermaidBlocks.push({
        node,
        value: node.value || '',
        index: blockIndex++,
      });
    }
  });

  visit(tree, 'image', (node: Image) => {
    const imgPath = node.url;

    if (!imgPath.startsWith('http')) {
      const absoluteImagePath = path.join(options.itemDir, imgPath);
      const destImagePath = path.join(
        options.distFolder,
        options.itemDir.replace(options.rootFolder, ''),
        imgPath,
      );

      if (fs.existsSync(absoluteImagePath)) {
        fs.copySync(absoluteImagePath, destImagePath);
        const relativePath = path.relative(path.dirname(destImagePath), destImagePath);
        node.url = relativePath;
        node.alt = node.alt || path.basename(imgPath, path.extname(imgPath));
      }
    }
  });

  visit(tree, 'link', (node: Link) => {
    if (node.url.endsWith('.mmd')) {
      mmdLinks.push(node);
    }
  });

  // 🔄 Process .mmd links
  for (const linkNode of mmdLinks) {
    const absoluteMmdPath = path.resolve(options.itemDir, linkNode.url);
    const outputPath = path.join(
      options.distFolder,
      options.itemDir.replace(options.rootFolder, ''),
      `${path.basename(linkNode.url, '.mmd')}.svg`,
    );

    if (await fs.pathExists(absoluteMmdPath)) {
      const raw = await fs.readFile(absoluteMmdPath, 'utf-8');
      const svgCreated = await generateMermaidDiagram(raw, outputPath);

      if (svgCreated) {
        const basePath = options.generateCompleteMdFile
          ? options.distFolder
          : path.resolve(options.itemDir.replace(options.rootFolder, options.distFolder));

        const relativePath = path.relative(basePath, outputPath);
        linkNode.url = relativePath;
      }
    }
  }

  // 🔄 Replace Mermaid code blocks with <img> tags
  for (const { node, value, index } of mermaidBlocks) {
    const outputPath = path.join(
      options.distFolder,
      options.itemDir.replace(options.rootFolder, ''),
      `inline_${index}.svg`,
    );

    const generated = await generateMermaidDiagram(value, outputPath);

    if (generated) {
      const relativePath = path.relative(path.dirname(outputPath), outputPath);
      Object.assign(node, {
        type: 'html',
        value: `<img src="${relativePath}" style="max-width: 100%; max-height: 100vh; object-fit: contain;" alt="Diagram ${index + 1}">`,
      });
    }
  }

  // 🧾 Convert back to markdown
  const result = unified().use(remarkStringify).stringify(tree);

  return result;
}

export async function compileDocument(md: string, item: TreeItem) {
  let MD = md;
  const texts: string[] = [];

  for (const mdFile of item.mdFiles) {
    const content = mdFile.toString();

    const processed = await processMarkdown(content, {
      itemDir: item.dir,
      distFolder: getStrConfig('distFolder'),
      rootFolder: getStrConfig('rootFolder'),
      generateCompleteMdFile: !!getBoolConfig('generateCompleteMdFile'),
    });

    texts.push(processed);
  }

  for (const doc of texts) {
    MD += '\n\n' + doc;
  }

  return MD;
}

export async function generateSingleMD(tree: TreeItem[]) {
  const filePromises: Promise<void>[] = [];

  let MD = `# ${getStrConfig('projectName')}`;

  let tableOfContents = '';
  for (const item of tree) {
    tableOfContents += `${'  '.repeat(item.level - 1)}* [${item.name}](#${encodeURI(item.name).replace(/%20/g, '-')})\n`;
  }
  MD += `\n\n${tableOfContents}\n---`;

  for (const item of tree) {
    const name = getFolderName(item.dir, getStrConfig('rootFolder'), getStrConfig('homepageName'));
    MD += `\n\n# ${name}`;

    if (name !== getStrConfig('homepageName')) {
      MD += `\n\n[${getStrConfig('homepageName')}](#${encodeURI(getStrConfig('projectName')).replace(/%20/g, '-')})`;
    }

    MD = await compileDocument(MD, item);
  }

  filePromises.push(fs.writeFile(path.join(getStrConfig('distFolder'), 'README.md'), MD));
  return Promise.all(filePromises);
}

export async function generateMD(
  tree: TreeItem[],
  onProgress?: (processedCount: number, totalCount: number) => void,
) {
  let processedCount = 0;
  const totalCount = tree.length;

  const filePromises: Promise<void>[] = [];
  for (const item of tree) {
    const homepageName = getStrConfig('homepageName');
    const rootFolder = getStrConfig('rootFolder');
    const name = getFolderName(item.dir, rootFolder, homepageName);
    //title
    let MD = `# ${name}`;
    //bradcrumbs
    if (name !== homepageName) MD += `\n\n\`${item.dir.replace(rootFolder, '')}\``;
    //table of contents
    let tableOfContents = '';
    for (const _item of tree) {
      const label = `${item.dir === _item.dir ? '**' : ''}${_item.name}${
        item.dir === _item.dir ? '**' : ''
      }`;
      tableOfContents += `${'  '.repeat(_item.level - 1)}* [${label}](${encodeURI(
        path.join(
          './',
          item.level - 1 > 0 ? '../'.repeat(item.level - 1) : '',
          _item.dir.replace(rootFolder, ''),
          `README.md`,
        ),
      )})\n`;
    }
    MD += `\n\n${tableOfContents}\n---`;

    //concatenate markdown files
    MD = await compileDocument(MD, item);

    //write to disk
    filePromises.push(
      fs
        .writeFile(
          path.join(
            getStrConfig('distFolder'),
            item.dir.replace(getStrConfig('rootFolder'), ''),
            `README.md`,
          ),
          MD,
        )
        .then(() => {
          processedCount++;
          if (onProgress) onProgress(processedCount, totalCount);
        }),
    );
  }

  return Promise.all(filePromises);
}
