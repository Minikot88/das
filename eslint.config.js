import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist/**', 'client/dist/**']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    files: [
      'src/app/components/command-palette/CommandPaletteModal.jsx',
      'src/modules/charts/components/ChartJsRenderer.jsx',
      'src/modules/charts/builder/ChartTypePicker.jsx',
      'src/modules/charts/builder/FieldList.jsx',
      'src/shared/hooks/useNavigationControls.js',
      'src/app/layouts/AppHeader.jsx',
      'src/modules/sharing/pages/DashboardPublicPage.jsx',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: [
      'src/modules/dashboards/designer-v2/components/PropertyPanel.tsx',
      'src/modules/dashboards/designer-v2/components/SqlQueryPanel.tsx',
      'src/modules/dashboards/designer-v2/hooks/useDashboardDesignerState.ts',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
