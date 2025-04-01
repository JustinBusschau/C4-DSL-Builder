import { readFileSync } from 'fs';
import { parse } from 'jsonc-parser';
const tsconfig = parse(
  readFileSync(new URL('./tsconfig.json', import.meta.url), 'utf8')
);
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
    '^.+\\.m?js$': 'ts-jest',
    '\\.(css|less|scss|sass|json)$': 'jest-transform-stub'
  },
  moduleNameMapper: {
    '(.+)\\.js': '$1'
  },
  transformIgnorePatterns: [
    '/coverage/',
    '/node_modules/(?!(unified|remark-parse|remark-stringify|unist-util-visit|mdast|micromark|configstore)/)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/lib/',
    '/coverage/',
  ],
  moduleFileExtensions: ['js', 'jsx', 'json', 'ts', 'tsx', 'node'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  coverageProvider: 'v8',
  clearMocks: true,
  coveragePathIgnorePatterns: ['.*\\index.ts'],
  testResultsProcessor: "jest-sonar-reporter",
  reporters: [
    "default",
    "jest-junit"
  ],
  forceExit: true,
  detectOpenHandles: true
};