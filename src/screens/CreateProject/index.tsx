/**
 * The Create New Project wizard controller. Sequences the ten steps
 * (name → location → framework → styling → state → package manager → icons →
 * testing → i18n → animations), accumulates the answers, shows a confirm
 * screen, warns before overwriting a non-empty target (checked against the
 * FULL final path — location + project folder), runs the generation engine
 * (spinner + live file count), and shows the success screen.
 */
import React, { useEffect, useState } from 'react';
import { join } from 'node:path';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import ProjectNameStep from './ProjectNameStep.js';
import CustomPathStep from './CustomPathStep.js';
import ChoiceStep from './ChoiceStep.js';
import Summary from './Summary.js';
import Success from './Success.js';
import SelectList, { type SelectListItem } from '../../components/SelectList.js';
import { COLORS } from '../../constants.js';
import { planProject, writeProject } from '../../lib/generator/index.js';
import {
  targetState,
  resolveBaseDir,
  desktopDir,
  tildify,
} from '../../lib/fsutil.js';
import type {
  WizardAnswers,
  Framework,
  Styling,
  StateMgmt,
  PkgManager,
  IconLib,
  Testing,
  I18n,
  Animations,
  ProjectLocation,
} from '../../types.js';

type Step =
  | 'name'
  | 'location'
  | 'customPath'
  | 'framework'
  | 'styling'
  | 'state'
  | 'pkg'
  | 'icon'
  | 'testing'
  | 'i18n'
  | 'animations'
  | 'confirm'
  | 'overwrite'
  | 'generating'
  | 'done'
  | 'error';

/** Location choices; Desktop is omitted when ~/Desktop doesn't exist. */
function locationItems(): ReadonlyArray<SelectListItem<ProjectLocation>> {
  const items: Array<SelectListItem<ProjectLocation>> = [
    { label: `Current directory  (${tildify(process.cwd())})`, value: 'cwd' },
  ];
  const desk = desktopDir();
  if (desk) items.push({ label: `Desktop  (${tildify(desk)})`, value: 'desktop' });
  items.push({ label: 'Custom path…', value: 'custom' });
  return items;
}

const FRAMEWORKS: ReadonlyArray<SelectListItem<Framework>> = [
  { label: 'Next.js (App Router)', value: 'nextjs' },
  { label: 'React Vite', value: 'vite' },
];
const STYLES: ReadonlyArray<SelectListItem<Styling>> = [
  { label: 'Tailwind CSS', value: 'tailwind' },
  { label: 'Material UI', value: 'material-ui' },
  { label: 'CSS Modules', value: 'css-modules' },
];
const STATES: ReadonlyArray<SelectListItem<StateMgmt>> = [
  { label: 'Zustand', value: 'zustand' },
  { label: 'Redux Toolkit', value: 'redux' },
  { label: 'None', value: 'none' },
];
const PKGS: ReadonlyArray<SelectListItem<PkgManager>> = [
  { label: 'npm', value: 'npm' },
  { label: 'pnpm', value: 'pnpm' },
  { label: 'yarn', value: 'yarn' },
];
const ICONS: ReadonlyArray<SelectListItem<IconLib>> = [
  { label: 'Font Awesome', value: 'fontawesome' },
  { label: 'None', value: 'none' },
];
const TESTS: ReadonlyArray<SelectListItem<Testing>> = [
  { label: 'Vitest + Testing Library', value: 'vitest' },
  { label: 'None', value: 'none' },
];
const I18NS: ReadonlyArray<SelectListItem<I18n>> = [
  { label: 'react-i18next', value: 'react-i18next' },
  { label: 'None', value: 'none' },
];
const ANIMS: ReadonlyArray<SelectListItem<Animations>> = [
  { label: 'Framer Motion', value: 'framer-motion' },
  { label: 'None', value: 'none' },
];

export default function CreateProject({
  onExit,
}: {
  onExit: () => void;
}): React.ReactElement {
  const [step, setStep] = useState<Step>('name');
  const [answers, setAnswers] = useState<Partial<WizardAnswers>>({});
  const [result, setResult] = useState<{ count: number; dir: string } | null>(null);
  const [progress, setProgress] = useState<{ written: number; total: number }>({
    written: 0,
    total: 0,
  });
  const [error, setError] = useState('');

  // FULL final path: chosen base location + project folder. Feeds both the
  // overwrite check and the writer, so they can never diverge.
  const targetDir = answers.projectName
    ? join(
        resolveBaseDir({
          location: answers.location ?? 'cwd',
          customPath: answers.customPath,
        }),
        answers.projectName
      )
    : '';

  const set = <K extends keyof WizardAnswers>(
    key: K,
    value: WizardAnswers[K],
    next: Step
  ): void => {
    setAnswers((a) => ({ ...a, [key]: value }));
    setStep(next);
  };

  // From the confirm screen: warn first if the target dir is non-empty.
  const startGenerate = (): void => {
    setStep(targetState(targetDir) === 'nonempty' ? 'overwrite' : 'generating');
  };

  // Run generation once, when entering the 'generating' step.
  useEffect(() => {
    if (step !== 'generating') return;
    let cancelled = false;
    void (async () => {
      try {
        const full = answers as WizardAnswers;
        const dir = targetDir; // same resolved path the overwrite check used
        const files = planProject(full);
        setProgress({ written: 0, total: files.length });
        await writeProject(dir, files, () => {
          if (!cancelled) setProgress((p) => ({ ...p, written: p.written + 1 }));
        });
        if (!cancelled) {
          setResult({ count: files.length, dir });
          setStep('done');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setStep('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, answers]);

  // Back-to-menu from terminal screens.
  useInput(
    (input, key) => {
      if (key.return || key.escape || input === 'b' || input === 'q') onExit();
    },
    { isActive: step === 'done' || step === 'error' }
  );

  switch (step) {
    case 'name':
      return (
        <ProjectNameStep
          initial={answers.projectName ?? ''}
          onSubmit={(name) => set('projectName', name, 'location')}
        />
      );
    case 'location':
      return (
        <ChoiceStep
          step={2}
          title="Project location"
          items={locationItems()}
          onSelect={(v) =>
            v === 'custom'
              ? set('location', v, 'customPath')
              : set('location', v, 'framework')
          }
        />
      );
    case 'customPath':
      return (
        <CustomPathStep
          onSubmit={(raw) => set('customPath', raw, 'framework')}
          onBack={() => setStep('location')}
        />
      );
    case 'framework':
      return (
        <ChoiceStep
          step={3}
          title="Framework"
          items={FRAMEWORKS}
          onSelect={(v) => set('framework', v, 'styling')}
        />
      );
    case 'styling':
      return (
        <ChoiceStep
          step={4}
          title="Styling"
          items={STYLES}
          onSelect={(v) => set('styling', v, 'state')}
        />
      );
    case 'state':
      return (
        <ChoiceStep
          step={5}
          title="State management"
          items={STATES}
          onSelect={(v) => set('stateMgmt', v, 'pkg')}
        />
      );
    case 'pkg':
      return (
        <ChoiceStep
          step={6}
          title="Package manager"
          items={PKGS}
          onSelect={(v) => set('pkgManager', v, 'icon')}
        />
      );
    case 'icon':
      return (
        <ChoiceStep
          step={7}
          title="Icon library"
          items={ICONS}
          onSelect={(v) => set('iconLib', v, 'testing')}
        />
      );
    case 'testing':
      return (
        <ChoiceStep
          step={8}
          title="Testing"
          items={TESTS}
          onSelect={(v) => set('testing', v, 'i18n')}
        />
      );
    case 'i18n':
      return (
        <ChoiceStep
          step={9}
          title="Internationalization (i18n)"
          items={I18NS}
          onSelect={(v) => set('i18n', v, 'animations')}
        />
      );
    case 'animations':
      return (
        <ChoiceStep
          step={10}
          title="Animations"
          items={ANIMS}
          onSelect={(v) => set('animations', v, 'confirm')}
        />
      );
    case 'confirm':
      return (
        <Summary
          answers={answers as WizardAnswers}
          onConfirm={startGenerate}
          onBack={onExit}
        />
      );
    case 'overwrite':
      return (
        <Box flexDirection="column">
          <Text color="yellow" bold>
            ⚠ Directory already exists and is not empty
          </Text>
          <Text color={COLORS.dim}>{targetDir}</Text>
          <Box marginTop={1}>
            <Text color={COLORS.primary}>
              Generating here will overwrite any files that collide with the
              scaffold. Continue?
            </Text>
          </Box>
          <Box marginTop={1}>
            <SelectList
              items={[
                { label: 'Cancel — keep existing files', value: 'cancel' },
                { label: 'Overwrite', value: 'overwrite' },
              ]}
              onSelect={(v) => (v === 'overwrite' ? setStep('generating') : onExit())}
            />
          </Box>
        </Box>
      );
    case 'generating':
      return (
        <Text color={COLORS.primary}>
          <Text color={COLORS.accent}>
            <Spinner type="dots" />
          </Text>{' '}
          Generating {answers.projectName}… ({progress.written}/{progress.total})
        </Text>
      );
    case 'done':
      return (
        <Success answers={answers as WizardAnswers} result={result!} />
      );
    case 'error':
      return (
        <Box flexDirection="column">
          <Text color="red">✖ Generation failed</Text>
          <Text color={COLORS.dim}>{error}</Text>
          <Box marginTop={1}>
            <Text color={COLORS.dim}>Press b to return to the menu.</Text>
          </Box>
        </Box>
      );
  }
}
