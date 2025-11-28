import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../schema.graphql',
  documents: ['src/**/*.{ts,tsx}'],
  generates: {
    './src/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
      ],
      config: {
        scalars: {
          DateTime: 'string',
          ID: 'string',
        },
        withHooks: true,
        // Import hooks from the react package
        apolloReactHooksImportFrom: '@apollo/client/react',
      },
    },
  },
};

export default config;
