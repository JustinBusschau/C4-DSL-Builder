import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globals: true,
    isolate: true,
    environment: 'node',
    mockReset: true,
    reporters: ['default', ['vitest-sonar-reporter', { outputFile: './coverage/sonar-report.xml' }]],
    resolveSnapshotPath: (testPath, snapExtension) =>
      testPath.replace(/\.ts$/, `.spec${snapExtension}`),
    include: ['src/**/*.spec.ts'],
    alias: [
      { find: /(\.{1,2}\/.*)\.js$/, replacement: '$1' },
    ],
    coverage: {
      reporter: ['lcov', 'text', 'html'],
      exclude: [
        'lib/**',
        '**/node_modules/**',
        '**/*.config.mjs',
        '**/*.config.ts',
      ],
    },
  },
})