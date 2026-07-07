/**
 * Generation engine entry point. `planProject` turns the wizard answers into a
 * flat list of files (pure, easy to test); `writeProject` materializes them to
 * disk, reporting progress per file for the spinner/success screen.
 */
import { join, dirname } from 'node:path';
import fsExtra from 'fs-extra';
import type { WizardAnswers } from '../../types.js';
import type { FileSpec } from './types.js';
import { layerConfig } from './types.js';
import { layerFiles } from './layers.js';
import { apiFiles } from './api.js';
import { loginFiles } from './login.js';
import { headerFiles } from './header.js';
import { i18nFiles } from './i18n.js';
import { animationsFiles } from './animations.js';
import { testingFiles } from './testing.js';
import { providersFile } from './providers.js';
import { nextFiles, viteFiles } from './framework.js';
import { stateFiles } from './state.js';
import { stylingConfigFiles } from './styling.js';
import {
  packageJson,
  tsconfigFiles,
  steigerConfig,
  gitignore,
  readme,
} from './configs.js';

export function planProject(answers: WizardAnswers): FileSpec[] {
  const cfg = layerConfig(answers.framework);

  const files: FileSpec[] = [];
  files.push(...layerFiles(cfg, answers));
  files.push(...apiFiles(answers.framework)); // shared/api + shared/lib
  files.push(...loginFiles(answers.styling, answers.iconLib, answers.framework)); // features/login
  files.push(...headerFiles(answers)); // widgets/header (references features/login)
  if (answers.i18n === 'react-i18next') files.push(...i18nFiles(answers.framework));
  if (answers.animations === 'framer-motion') {
    files.push(...animationsFiles(answers.framework));
  }
  files.push(providersFile(answers)); // app/providers.tsx (always present)
  files.push(
    ...(answers.framework === 'nextjs'
      ? nextFiles(answers, cfg)
      : viteFiles(answers, cfg))
  );
  files.push(...stateFiles(answers.stateMgmt)); // store files
  files.push(...stylingConfigFiles(answers.styling, answers.framework));
  if (answers.testing === 'vitest') files.push(...testingFiles(cfg));
  files.push(packageJson(answers));
  files.push(...tsconfigFiles(answers, cfg));
  files.push(steigerConfig(answers));
  files.push(gitignore(answers));
  files.push(readme(answers, cfg));

  // Stable order for reproducible output.
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export async function writeProject(
  targetDir: string,
  files: FileSpec[],
  onFile?: (path: string) => void
): Promise<void> {
  for (const f of files) {
    const abs = join(targetDir, f.path);
    await fsExtra.ensureDir(dirname(abs));
    await fsExtra.writeFile(abs, f.contents, 'utf8');
    onFile?.(f.path);
  }
}

export type { FileSpec } from './types.js';
