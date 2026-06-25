import pluginJs from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import configPrettier from "eslint-config-prettier";

export default defineConfig(
  // 1. @eslint/js recommended rules
  pluginJs.configs.recommended,

  // 2. typescript-eslint's recommended type-checked set
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // Enables the project service so type-aware rules can find your tsconfig.json
        projectService: {
          allowDefaultProject: ["eslint.config.js"],
        },
      },
    },
  },

  // 3. eslint-config-prettier goes last to disable formatting conflicts
  configPrettier,
);
