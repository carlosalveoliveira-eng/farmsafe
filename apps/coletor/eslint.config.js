import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'android',
    'dist',
    'node_modules',
    'coverage',
    '*.config.js',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // The collector boot flow intentionally hydrates local/offline state from
      // Dexie and Capacitor/browser APIs when screens mount. Keep this rule off
      // until that flow is moved to dedicated external-store hooks.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
