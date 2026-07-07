/**
 * The `features/login` slice — a real, working example of the data/forms stack:
 * react-hook-form + a zod schema via zodResolver, a TanStack Query mutation,
 * and the shared axios instance. The form is styling-aware (Tailwind / MUI /
 * CSS Modules) and shows a validation error on bad input. An optional Font
 * Awesome icon appears in the heading when chosen.
 *
 * The feature also exports `SignInLink` — its public entry-point CTA (a link
 * into the dedicated /login page, no form). It is consumed by widgets/header,
 * which the app renders on the login route. That gives the slice its second
 * reference (login page renders LoginForm; widgets/header renders SignInLink)
 * so it clears Steiger's `insignificant-slice` rule on Vite, without any login
 * content on the homepage. On Next that rule is disabled in steiger.config.ts.
 */
import type { FileSpec } from './types.js';
import type { Styling, IconLib, Framework } from '../../types.js';

/** Next.js Client Component directive (the form uses client-only hooks). */
function clientDirective(framework: Framework): string {
  return framework === 'nextjs' ? `'use client';\n\n` : '';
}

function schemaAndApi(): FileSpec[] {
  return [
    {
      path: 'src/features/login/model/schema.ts',
      contents: `import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginValues = z.infer<typeof loginSchema>;
`,
    },
    {
      path: 'src/features/login/api/login.ts',
      contents: `import { api } from '@shared/api';
import type { LoginValues } from '../model/schema';

export interface LoginResponse {
  token: string;
}

/** Authenticate against the shared axios instance. */
export async function login(values: LoginValues): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', values);
  return data;
}
`,
    },
    {
      path: 'src/features/login/index.ts',
      contents: `export { LoginForm } from './ui/login-form';
export { SignInLink } from './ui/sign-in-link';
export { login } from './api/login';
export { loginSchema } from './model/schema';
export type { LoginValues } from './model/schema';
`,
    },
  ];
}

/** The feature's public CTA — a link into the dedicated /login page (no form). */
function signInLinkFile(styling: Styling, framework: Framework): FileSpec {
  const uc = framework === 'nextjs' && styling === 'material-ui' ? `'use client';\n\n` : '';
  let body: string;
  if (styling === 'material-ui') {
    body = `${uc}import { Link as MuiLink } from '@mui/material';

export function SignInLink() {
  return (
    <MuiLink href="/login" underline="hover" sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#E8C24A' }}>
      Sign in
    </MuiLink>
  );
}
`;
  } else if (styling === 'tailwind') {
    body = `export function SignInLink() {
  return (
    <a href="/login" className="text-[0.95rem] font-semibold text-[#E8C24A] hover:opacity-80">
      Sign in
    </a>
  );
}
`;
  } else {
    body = `export function SignInLink() {
  return (
    <a
      href="/login"
      style={{ fontSize: '0.95rem', fontWeight: 600, color: '#E8C24A', textDecoration: 'none' }}
    >
      Sign in
    </a>
  );
}
`;
  }
  return { path: 'src/features/login/ui/sign-in-link.tsx', contents: body };
}

function iconBits(iconLib: IconLib): { imports: string; heading: string } {
  if (iconLib !== 'fontawesome') {
    return { imports: '', heading: 'Sign in' };
  }
  return {
    imports: `import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightToBracket } from '@fortawesome/free-solid-svg-icons';
`,
    heading: '<FontAwesomeIcon icon={faRightToBracket} /> Sign in',
  };
}

function formHeader(iconLib: IconLib, framework: Framework): string {
  const { imports } = iconBits(iconLib);
  return `${clientDirective(framework)}import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { loginSchema, type LoginValues } from '../model/schema';
import { login } from '../api/login';
${imports}`;
}

function commonHook(): string {
  return `  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const mutation = useMutation({ mutationFn: login });
  const onSubmit = handleSubmit((values) => mutation.mutate(values));`;
}

function tailwindForm(iconLib: IconLib, framework: Framework): string {
  const { heading } = iconBits(iconLib);
  return `${formHeader(iconLib, framework)}
export function LoginForm() {
${commonHook()}

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <h2 className="text-xl font-semibold">${heading}</h2>
      <label className="flex flex-col gap-1">
        <span className="text-[0.9rem] text-[#4A453C]">Email</span>
        <input
          type="email"
          {...register('email')}
          className="border-0 border-b-2 border-[#211E19]/30 bg-transparent px-0.5 py-1.5 text-[#211E19] [font-family:inherit] rounded-none outline-none focus:border-[#C9A227]"
        />
        {errors.email && (
          <span className="text-sm text-red-600">{errors.email.message}</span>
        )}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[0.9rem] text-[#4A453C]">Password</span>
        <input
          type="password"
          {...register('password')}
          className="border-0 border-b-2 border-[#211E19]/30 bg-transparent px-0.5 py-1.5 text-[#211E19] [font-family:inherit] rounded-none outline-none focus:border-[#C9A227]"
        />
        {errors.password && (
          <span className="text-sm text-red-600">{errors.password.message}</span>
        )}
      </label>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="mt-1 rounded-sm bg-[#211E19] px-4 py-2.5 font-semibold text-[#E8C24A] hover:bg-[#2E2A22] disabled:opacity-60"
      >
        Sign in
      </button>
      {mutation.isError && (
        <span className="text-sm text-red-600">Login failed. Try again.</span>
      )}
    </form>
  );
}
`;
}

function muiForm(iconLib: IconLib, framework: Framework): string {
  const { heading } = iconBits(iconLib);
  return `${formHeader(iconLib, framework)}import { Box, Button, TextField, Typography, Alert } from '@mui/material';

export function LoginForm() {
${commonHook()}

  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 360 }}
    >
      <Typography variant="h6" sx={{ fontFamily: 'inherit', color: '#211E19' }}>${heading}</Typography>
      <TextField
        variant="standard"
        label="Email"
        type="email"
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
        inputProps={register('email')}
        sx={{
          '& label': { fontFamily: 'inherit', color: '#4A453C' },
          '& label.Mui-focused': { color: '#C9A227' },
          '& .MuiInput-root': { fontFamily: 'inherit', color: '#211E19' },
          '& .MuiInput-underline:before': { borderBottomColor: 'rgba(33, 30, 25, 0.3)' },
          '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: 'rgba(33, 30, 25, 0.5)' },
          '& .MuiInput-underline:after': { borderBottomColor: '#C9A227' },
        }}
      />
      <TextField
        variant="standard"
        label="Password"
        type="password"
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
        inputProps={register('password')}
        sx={{
          '& label': { fontFamily: 'inherit', color: '#4A453C' },
          '& label.Mui-focused': { color: '#C9A227' },
          '& .MuiInput-root': { fontFamily: 'inherit', color: '#211E19' },
          '& .MuiInput-underline:before': { borderBottomColor: 'rgba(33, 30, 25, 0.3)' },
          '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: 'rgba(33, 30, 25, 0.5)' },
          '& .MuiInput-underline:after': { borderBottomColor: '#C9A227' },
        }}
      />
      <Button
        type="submit"
        variant="contained"
        disableElevation
        disabled={mutation.isPending}
        sx={{ backgroundColor: '#211E19', color: '#E8C24A', fontWeight: 600, '&:hover': { backgroundColor: '#2E2A22' } }}
      >
        Sign in
      </Button>
      {mutation.isError && <Alert severity="error">Login failed. Try again.</Alert>}
    </Box>
  );
}
`;
}

function cssModulesForm(iconLib: IconLib, framework: Framework): { form: FileSpec; css: FileSpec } {
  const { heading } = iconBits(iconLib);
  return {
    form: {
      path: 'src/features/login/ui/login-form.tsx',
      contents: `${formHeader(iconLib, framework)}import styles from './login-form.module.css';

export function LoginForm() {
${commonHook()}

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <h2 className={styles.title}>${heading}</h2>
      <label className={styles.field}>
        <span>Email</span>
        <input type="email" {...register('email')} className={styles.input} />
        {errors.email && <span className={styles.error}>{errors.email.message}</span>}
      </label>
      <label className={styles.field}>
        <span>Password</span>
        <input type="password" {...register('password')} className={styles.input} />
        {errors.password && (
          <span className={styles.error}>{errors.password.message}</span>
        )}
      </label>
      <button type="submit" disabled={mutation.isPending} className={styles.button}>
        Sign in
      </button>
      {mutation.isError && <span className={styles.error}>Login failed. Try again.</span>}
    </form>
  );
}
`,
    },
    css: {
      path: 'src/features/login/ui/login-form.module.css',
      contents: `.form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  max-width: 24rem;
}
.title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #211E19;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field > span {
  font-size: 0.9rem;
  color: #4A453C;
}
.input {
  border: 0;
  border-bottom: 2px solid rgba(33, 30, 25, 0.3);
  border-radius: 0;
  background: transparent;
  padding: 0.4rem 0.15rem;
  color: #211E19;
  font-family: inherit;
  outline: none;
}
.input:focus {
  border-bottom-color: #C9A227;
}
.error {
  color: #dc2626;
  font-size: 0.85rem;
}
.button {
  border: none;
  border-radius: 2px;
  background: #211E19;
  color: #E8C24A;
  padding: 0.6rem 1rem;
  font-weight: 600;
  cursor: pointer;
}
.button:hover {
  background: #2E2A22;
}
.button:disabled {
  opacity: 0.6;
}
`,
    },
  };
}

export function loginFiles(
  styling: Styling,
  iconLib: IconLib,
  framework: Framework
): FileSpec[] {
  const files = schemaAndApi();
  if (styling === 'tailwind') {
    files.push({
      path: 'src/features/login/ui/login-form.tsx',
      contents: tailwindForm(iconLib, framework),
    });
  } else if (styling === 'material-ui') {
    files.push({
      path: 'src/features/login/ui/login-form.tsx',
      contents: muiForm(iconLib, framework),
    });
  } else {
    const { form, css } = cssModulesForm(iconLib, framework);
    files.push(form, css);
  }
  files.push(signInLinkFile(styling, framework));
  return files;
}
