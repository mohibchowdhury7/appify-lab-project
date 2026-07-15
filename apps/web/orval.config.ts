import { defineConfig } from 'orval';

export default defineConfig({
  buddyScript: {
    input: {
      // Use local frozen spec to avoid dependency on a running API during build.
      // Run `pnpm --filter web spec:freeze` to regenerate from a live API.
      target: 'openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: 'src/api/generated',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: {
          path: 'src/api/axios-instance.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          useInfinite: true,
        },
      },
    },
  },
});
