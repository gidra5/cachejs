import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const reportName = process.argv[3]?.split('=')?.[1] ?? 'node';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'index',
      fileName: (format) => `index.${format}.js`,
    },
  },
  test: {
    coverage: {
      enabled: reportName === 'node',
      provider: 'istanbul',
      reportsDirectory: 'test-results/coverage',
      reporter: 'html',
    },
    outputFile: `test-results/report-${reportName}-${new Date().toISOString()}/index.html`,
    reporters: ['html'],
  },
});
