import { jest } from '@jest/globals';
import { TreeItem } from '../utilities/tree.js';

const getStrConfigMock = jest.fn();
const getBoolConfigMock = jest.fn();
const safeEmptySubFolderMock = jest.fn();
const generateTreeMock = jest.fn();
const generateMermaidDiagramMock = jest.fn();
const logMock = jest.fn();
const errorMock = jest.fn();

jest.unstable_mockModule('../utilities/config.js', () => ({
  getStrConfig: getStrConfigMock,
  getBoolConfig: getBoolConfigMock,
}));

jest.unstable_mockModule('../utilities/tree.js', () => ({
  generateTree: generateTreeMock,
  safeEmptySubFolder: safeEmptySubFolderMock,
}));

jest.unstable_mockModule('../utilities/mermaid.js', () => ({
  generateMermaidDiagram: generateMermaidDiagramMock,
}));

jest.unstable_mockModule('../utilities/logger.js', () => ({
  createLogger: () => ({
    log: logMock,
    error: errorMock,
  }),
}));

const { convertMermaidDiagrams, cmdMd } = await import('./cmdMd.js');

describe('convertMermaidDiagrams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates diagrams for each Mermaid block in markdown', async () => {
    getStrConfigMock.mockImplementation((key) => {
      if (key === 'distFolder') return '/dist';
      if (key === 'rootFolder') return '/root';
    });

    const markdown = `
# Title

Some intro.

\`\`\`mermaid
graph TD;
A-->B;
\`\`\`

Some more text...

\`\`\`mermaid
sequenceDiagram
Alice->>Bob: Hello Bob!
\`\`\`
    `;

    const fakeTree = [
      {
        dir: '/root/project/docs',
        mdFiles: [Buffer.from(markdown)],
      },
    ] as TreeItem[];

    await convertMermaidDiagrams(fakeTree);

    expect(logMock).toHaveBeenCalledWith(
      expect.stringContaining('Found 2 Mermaid diagrams in /root/project/docs'),
    );

    expect(generateMermaidDiagramMock).toHaveBeenCalledTimes(2);

    expect(generateMermaidDiagramMock).toHaveBeenNthCalledWith(
      1,
      'graph TD;\nA-->B;\n',
      '/dist/project/docs/docs_0.svg',
    );

    expect(generateMermaidDiagramMock).toHaveBeenNthCalledWith(
      2,
      'sequenceDiagram\nAlice->>Bob: Hello Bob!\n',
      '/dist/project/docs/docs_1.svg',
    );
  });
});

describe('cmdMd', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs error and exits if distFolder config is missing', async () => {
    getStrConfigMock.mockReturnValue(undefined);

    await cmdMd();

    expect(errorMock).toHaveBeenCalledWith('Please run `config` before attempting to run `md`.');
    expect(safeEmptySubFolderMock).not.toHaveBeenCalled();
  });

  it('logs error and exits if distFolder config is invalid (string "undefined")', async () => {
    getStrConfigMock.mockReturnValue('undefined');

    await cmdMd();

    expect(errorMock).toHaveBeenCalledWith('Please run `config` before attempting to run `md`.');
    expect(safeEmptySubFolderMock).not.toHaveBeenCalled();
  });

  it('logs error if safeEmptySubFolder fails', async () => {
    getStrConfigMock.mockReturnValue('docs');
    safeEmptySubFolderMock.mockResolvedValue(false);

    await cmdMd();

    expect(safeEmptySubFolderMock).toHaveBeenCalledWith(expect.stringContaining('docs'));
    expect(errorMock).toHaveBeenCalledWith(
      expect.stringContaining('Failed to empty the target folder'),
    );
  });

  it('logs success message when everything works', async () => {
    getStrConfigMock.mockReturnValue('docs');
    safeEmptySubFolderMock.mockResolvedValue(true);
    generateTreeMock.mockResolvedValue([
      {
        dir: 'src/Other Files/Nested Files',
        name: 'Nested Files',
        level: 2,
        parent: 'src/Other Files',
        mdFiles: [
          {
            type: 'Buffer',
            data: [35, 32, 68, 101, 115],
          },
        ],
        mmdFiles: [],
        descendants: [],
      },
      {
        dir: 'src/Other Files',
        name: 'Other Files',
        level: 1,
        parent: 'src',
        mdFiles: [
          {
            type: 'Buffer',
            data: [42, 42, 76, 101, 118],
          },
        ],
        mmdFiles: [
          {
            name: 'system.mmd',
            content: '    C4Context\n      title System Context diagram\n',
          },
        ],
        descendants: ['Nested Files'],
      },
      {
        dir: 'src/diagrams',
        name: 'diagrams',
        level: 1,
        parent: 'src',
        mdFiles: [],
        mmdFiles: [
          {
            name: 'structurizr-Components.mmd',
            content: 'graph TB\n',
          },
          {
            name: 'structurizr-Containers.mmd',
            content: 'graph TB\n',
          },
        ],
        descendants: [],
      },
      {
        dir: 'src',
        name: 'Overview',
        level: 0,
        parent: null,
        mdFiles: [
          {
            type: 'Buffer',
            data: [42, 42, 76, 101, 118],
          },
          {
            type: 'Buffer',
            data: [35, 35, 32, 73, 110],
          },
        ],
        mmdFiles: [
          {
            name: 'context.mmd',
            content: '    C4Context\n',
          },
        ],
        descendants: ['Other Files', 'diagrams'],
      },
    ] as TreeItem[]);

    await cmdMd();

    expect(safeEmptySubFolderMock).toHaveBeenCalledWith(expect.stringContaining('docs'));
    expect(logMock).toHaveBeenCalledWith(expect.stringContaining('Building Markdown'));
    expect(logMock).toHaveBeenCalledWith(
      expect.stringContaining('Markdown documentation generated'),
    );
  });
});
