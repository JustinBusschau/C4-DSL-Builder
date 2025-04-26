import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockMermaidProcessor = {
  diagramFromMermaidString: vi.fn(),
  generateUniqueMmdFilename: vi.fn(),
};

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

vi.mock('./mermaid-processor.js', () => ({
  MermaidProcessor: vi.fn(() => mockMermaidProcessor),
}));

vi.mock('./cli-logger.js', () => ({
  CliLogger: vi.fn(() => mockLogger),
}));

vi.mock('./paths.js', () => ({
  Paths: vi.fn().mockImplementation(() => ({
    getPathFromMeta: vi.fn().mockReturnValue('/some/base/path/src/utils/paths.js'),
  })),
}));

import type { Root, Image, Link, Code } from 'mdast';
import { SafeFiles } from './safe-files.js';
import { BuildConfig } from '../types/build-config.js';
import { TreeItem } from '../types/tree-item.js';
import { CliLogger } from './cli-logger.js';
import { MermaidProcessor } from './mermaid-processor.js';
import { MarkdownProcessor } from './markdown-processor.js';
import { Paths } from './paths.js';

describe('MarkdownProcessor', () => {
  const logSpy = new CliLogger('MarkdownProcessor.test', 'debug');
  let paths: Paths;
  let mmdProcessor: MermaidProcessor;
  let processor: MarkdownProcessor;
  let safeFiles: SafeFiles;
  const buildConfig: BuildConfig = {
    rootFolder: '/root',
    distFolder: '/dist',
    embedMermaidDiagrams: true,
    homepageName: 'Home',
    projectName: 'Project',
    dslCli: 'docker',
    workspaceDsl: '',
    pdfCss: '',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    safeFiles = {
      pathExists: vi.fn().mockResolvedValue(true),
      copyFile: vi.fn(),
      readFileAsString: vi.fn().mockResolvedValue('graph TD; A-->B'),
      writeFile: vi.fn(),
      emptySubFolder: vi.fn().mockResolvedValue(true),
      generateTree: vi.fn().mockResolvedValue([]),
      getFolderName: vi.fn().mockReturnValue('Folder'),
    } as unknown as SafeFiles;
    mockMermaidProcessor.diagramFromMermaidString.mockResolvedValue(true);
    mockMermaidProcessor.generateUniqueMmdFilename.mockResolvedValue('unique.svg');
    paths = new Paths();
    mmdProcessor = new MermaidProcessor(safeFiles, paths, logSpy);
    processor = new MarkdownProcessor(safeFiles, logSpy, mmdProcessor);
  });

  describe('copyLinkedFiles', () => {
    it('copies local image files and updates node URLs', async () => {
      const node: Image = { type: 'image', url: 'img.png', alt: null, title: null };
      const markdown: Root = { type: 'root', children: [node] };
      await processor.copyLinkedFiles(markdown, '/root/docs', buildConfig);
      expect(safeFiles.copyFile).toHaveBeenCalled();
      expect(node.url).toBe('docs/img.png');
      expect(node.alt).toBe('img');
    });

    it('skips copying for external images', async () => {
      const node: Image = {
        type: 'image',
        url: 'http://example.com/image.png',
        alt: null,
        title: null,
      };
      const markdown: Root = { type: 'root', children: [node] };
      await processor.copyLinkedFiles(markdown, '/root/docs', buildConfig);
      expect(safeFiles.copyFile).not.toHaveBeenCalled();
    });

    it('logs warning if file doesn’t exist', async () => {
      vi.spyOn(safeFiles, 'pathExists').mockResolvedValue(false);
      const node: Image = { type: 'image', url: 'missing.png', alt: null, title: null };
      const markdown: Root = { type: 'root', children: [node] };
      await processor.copyLinkedFiles(markdown, '/root/docs', buildConfig);
      expect(logSpy.warn).toHaveBeenCalledWith(expect.stringContaining('Linked file not found'));
    });

    it('sets alt text from file name if missing', async () => {
      const node: Image = { type: 'image', url: 'test/path/image.png', alt: null, title: null };
      const markdown: Root = { type: 'root', children: [node] };
      await processor.copyLinkedFiles(markdown, '/root/docs', buildConfig);
      expect(node.alt).toBe('image');
    });

    it('copies linked files and updates node URLs', async () => {
      const node: Link = { type: 'link', url: 'doc.pdf', title: null, children: [] };
      const markdown: Root = { type: 'root', children: [node] };
      await processor.copyLinkedFiles(markdown, '/root/docs', buildConfig);
      expect(safeFiles.copyFile).toHaveBeenCalled();
      expect(node.url).toBe('docs/doc.pdf');
      expect(logSpy.info).toHaveBeenCalledWith(expect.stringContaining('Copied file to'));
    });

    it('logs an error if the copy fails', async () => {
      const err = new Error('Permission denied');
      vi.spyOn(safeFiles, 'copyFile').mockRejectedValue(err);
      const node: Link = { type: 'link', url: 'doc.pdf', title: null, children: [] };
      const markdown: Root = { type: 'root', children: [node] };
      await processor.copyLinkedFiles(markdown, '/root/docs', buildConfig);
      expect(safeFiles.copyFile).toHaveBeenCalled();
      expect(node.url).toBe('doc.pdf');
      expect(logSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to copy linked item'),
        err,
      );
    });
  });

  describe('embedLinkedMermaidFiles', () => {
    it('replaces local .mmd links with mermaid code blocks', async () => {
      const parent: Root = { type: 'root', children: [] };
      const node: Link = { type: 'link', url: 'diagram.mmd', title: null, children: [] };
      parent.children = [node];
      await processor.embedLinkedMermaidFiles(parent, '/root/docs', buildConfig);
      expect(parent.children[0].type).toBe('code');
      expect((parent.children[0] as Code).lang).toBe('mermaid');
      expect(logSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('Embedded mermaid source from'),
      );
    });

    it('skips if file is missing and logs a warning', async () => {
      vi.spyOn(safeFiles, 'pathExists').mockResolvedValue(false);
      const parent: Root = { type: 'root', children: [] };
      const node: Link = { type: 'link', url: 'diagram.mmd', title: null, children: [] };
      parent.children = [node];
      await processor.embedLinkedMermaidFiles(parent, '/root/docs', buildConfig);
      expect(logSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Linked mermaid file not found'),
      );
    });

    it('skips if file is empty and logs warning', async () => {
      vi.spyOn(safeFiles, 'pathExists').mockResolvedValue(true);
      vi.spyOn(safeFiles, 'readFileAsString').mockResolvedValue('');
      const parent: Root = { type: 'root', children: [] };
      const node: Link = { type: 'link', url: 'diagram.mmd', title: null, children: [] };
      parent.children = [node];
      await processor.embedLinkedMermaidFiles(parent, '/root/docs', buildConfig);
      expect(logSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Linked mermaid file appears to be empty'),
      );
    });

    it('skips and logs if an error is thrown', async () => {
      const err = new Error('Access denied');
      vi.spyOn(safeFiles, 'pathExists').mockRejectedValueOnce(err);
      const parent: Root = { type: 'root', children: [] };
      const node: Link = { type: 'link', url: 'diagram.mmd', title: null, children: [] };
      parent.children = [node];
      await processor.embedLinkedMermaidFiles(parent, '/root/docs', buildConfig);
      expect(logSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process linked Mermaid file'),
        err,
      );
    });
  });

  describe('convertMermaidToImages', () => {
    it('converts .mmd links to SVG images', async () => {
      const parent: Root = { type: 'root', children: [] };
      const node: Link = { type: 'link', url: 'flowchart.mmd', title: null, children: [] };
      parent.children = [node];
      await processor.convertMermaidToImages(parent, '/root/docs', {
        ...buildConfig,
        embedMermaidDiagrams: false,
      });
      expect(parent.children[0].type).toBe('paragraph');
    });

    it('converts embedded mermaid code blocks to SVG images', async () => {
      const parent: Root = { type: 'root', children: [] };
      const node: Code = { type: 'code', lang: 'mermaid', value: 'graph TD; A-->B' };
      parent.children = [node];
      await processor.convertMermaidToImages(parent, '/root/docs', {
        ...buildConfig,
        embedMermaidDiagrams: false,
      });
      expect(parent.children[0].type).toBe('paragraph');
    });

    it('handles empty files gracefully', async () => {
      vi.spyOn(safeFiles, 'readFileAsString').mockResolvedValue(null);
      const parent: Root = { type: 'root', children: [] };
      const node: Link = { type: 'link', url: 'missing.mmd', title: null, children: [] };
      parent.children = [node];
      await processor.convertMermaidToImages(parent, '/root/docs', {
        ...buildConfig,
        embedMermaidDiagrams: false,
      });
      expect(logSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Linked mermaid file appears to be empty'),
      );
    });

    it('handles missing files gracefully', async () => {
      vi.spyOn(safeFiles, 'pathExists').mockResolvedValue(false);
      const parent: Root = { type: 'root', children: [] };
      const node: Link = { type: 'link', url: 'missing.mmd', title: null, children: [] };
      parent.children = [node];
      await processor.convertMermaidToImages(parent, '/root/docs', {
        ...buildConfig,
        embedMermaidDiagrams: false,
      });
      expect(logSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Linked mermaid file not found'),
      );
    });

    it('handles empty mermaid blocks gracefully', async () => {
      const parent: Root = { type: 'root', children: [] };
      const node: Code = { type: 'code', lang: 'mermaid', value: ' ' };
      parent.children = [node];
      await processor.convertMermaidToImages(parent, '/root/docs', {
        ...buildConfig,
        embedMermaidDiagrams: false,
      });
      expect(parent.children[0].type).toBe('code'); // unchanged
      expect(logSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unable to load mermaid content'),
      );
    });

    it('handles errors gracefully', async () => {
      const err = new Error('I/O Error');
      vi.spyOn(safeFiles, 'pathExists').mockRejectedValueOnce(err);
      const parent: Root = { type: 'root', children: [] };
      const node: Link = { type: 'link', url: 'missing.mmd', title: null, children: [] };
      parent.children = [node];
      await processor.convertMermaidToImages(parent, '/root/docs', {
        ...buildConfig,
        embedMermaidDiagrams: false,
      });
      expect(logSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process linked Mermaid file'),
        err,
      );
    });
  });

  describe('prepareMarkdownContent', () => {
    it('calls copyLinkedFiles and embedLinkedMermaidFiles when embedMermaidDiagrams is true', async () => {
      const md = '# Hello';
      const result = await processor.prepareMarkdownContent(
        md,
        'file.md',
        '/root/docs',
        buildConfig,
      );
      expect(result).toContain('Hello');
    });

    it('calls copyLinkedFiles and convertMermaidToImages when embedMermaidDiagrams is false', async () => {
      buildConfig.embedMermaidDiagrams = false;
      const md = '# Hello';
      const result = await processor.prepareMarkdownContent(
        md,
        'file.md',
        '/root/docs',
        buildConfig,
      );
      expect(result).toContain('Hello');
    });

    it('returns valid markdown string output', async () => {
      const result = await processor.prepareMarkdownContent(
        '# Title',
        'doc.md',
        '/root/docs',
        buildConfig,
      );
      expect(typeof result).toBe('string');
    });
  });

  describe('processMarkdownDocument', () => {
    it('processes each mdFile and joins output', async () => {
      const treeItem: TreeItem = {
        dir: '/root/docs',
        name: 'Doc',
        level: 0,
        parent: null,
        mdFiles: [{ name: 'doc.md', content: '# Hi' }],
        mmdFiles: [],
        descendants: [],
      };
      const result = await processor.processMarkdownDocument(treeItem, buildConfig);
      expect(result).toContain('Hi');
    });

    it('handles errors gracefully', async () => {
      const err = new Error('Processor failure');
      vi.spyOn(processor, 'prepareMarkdownContent').mockRejectedValueOnce(err);
      const treeItem: TreeItem = {
        dir: '/root/docs',
        name: 'Doc',
        level: 0,
        parent: null,
        mdFiles: [{ name: 'doc.md', content: '# Hi' }],
        mmdFiles: [],
        descendants: [],
      };
      const result = await processor.processMarkdownDocument(treeItem, buildConfig);
      expect(logSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process markdown file'),
        err,
      );
      expect(result.trim()).toBe('');
    });
  });

  describe('generateMarkdownFromTree', () => {
    it('generates README.md with headers and table of contents', async () => {
      const tree: TreeItem[] = [
        {
          dir: '/root',
          name: 'Home',
          level: 0,
          parent: null,
          mdFiles: [{ name: 'home.md', content: '# Welcome' }],
          mmdFiles: [],
          descendants: [],
        },
      ];
      await processor.generateMarkdownFromTree(tree, buildConfig);
      expect(safeFiles.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('README.md'),
        expect.stringContaining('[Home](#Home)'),
      );
      expect(safeFiles.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('README.md'),
        expect.stringContaining('# Welcome'),
      );
    });

    it('logs error if markdown write fails', async () => {
      const err = new Error('Write failed');
      vi.spyOn(safeFiles, 'writeFile').mockRejectedValue(err);
      await processor.generateMarkdownFromTree([], buildConfig);
      expect(logSpy.error).toHaveBeenCalledWith('Failed to write README.md', err);
    });
  });

  describe('prepareMarkdown', () => {
    it('validates target folder and initializes markdown generation', async () => {
      await processor.prepareMarkdown(buildConfig);
      expect(safeFiles.generateTree).toHaveBeenCalled();
      expect(logSpy.log).toHaveBeenCalledTimes(3);
      expect(logSpy.log).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Building MD documentation'),
      );
      expect(logSpy.log).toHaveBeenNthCalledWith(2, expect.stringContaining('Parsed 0 folders.'));
      expect(logSpy.log).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('Markdown documentation generated successfully'),
      );
      expect(logSpy.info).toHaveBeenCalledWith(expect.stringContaining('Wrote README.md'));
    });

    it('logs error if dist folder is missing or invalid', async () => {
      buildConfig.distFolder = '';
      await processor.prepareMarkdown(buildConfig);
      expect(logSpy.error).toHaveBeenCalledWith(expect.stringContaining('Please run `config`'));
    });

    it('logs error if dist folder cannot be prepared', async () => {
      vi.spyOn(safeFiles, 'emptySubFolder').mockResolvedValueOnce(false);
      buildConfig.distFolder = 'dest';
      await processor.prepareMarkdown(buildConfig);
      expect(logSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to empty the target folder'),
      );
    });
  });
});
