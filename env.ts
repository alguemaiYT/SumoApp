import z from 'zod';

import packageJSON from './package.json';

const envSchema = z.object({
  EXPO_PUBLIC_APP_ENV: z.enum(['development', 'preview', 'production']),
  EXPO_PUBLIC_NAME: z.string().min(1),
  EXPO_PUBLIC_SCHEME: z.string().min(1),
  EXPO_PUBLIC_BUNDLE_ID: z.string().min(1),
  EXPO_PUBLIC_PACKAGE: z.string().min(1),
  EXPO_PUBLIC_VERSION: z.string().min(1),
});

const EXPO_PUBLIC_APP_ENV = (process.env.EXPO_PUBLIC_APP_ENV
  ?? 'production') as z.infer<typeof envSchema>['EXPO_PUBLIC_APP_ENV'];

const BUNDLE_IDS = {
  development: 'com.dragonbotz.sumoapp.dev',
  preview: 'com.dragonbotz.sumoapp.preview',
  production: 'com.dragonbotz.sumoapp',
} as const;

const PACKAGES = {
  development: 'com.dragonbotz.sumoapp.dev',
  preview: 'com.dragonbotz.sumoapp.preview',
  production: 'com.dragonbotz.sumoapp',
} as const;

const SCHEMES = {
  development: 'sumoapp-dev',
  preview: 'sumoapp-preview',
  production: 'sumoapp',
} as const;

const STRICT_ENV_VALIDATION = process.env.STRICT_ENV_VALIDATION === '1';

const _env: z.infer<typeof envSchema> = {
  EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_NAME: 'SumoApp',
  EXPO_PUBLIC_SCHEME: SCHEMES[EXPO_PUBLIC_APP_ENV],
  EXPO_PUBLIC_BUNDLE_ID: BUNDLE_IDS[EXPO_PUBLIC_APP_ENV],
  EXPO_PUBLIC_PACKAGE: PACKAGES[EXPO_PUBLIC_APP_ENV],
  EXPO_PUBLIC_VERSION: packageJSON.version,
};

function getValidatedEnv(env: z.infer<typeof envSchema>) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    if (STRICT_ENV_VALIDATION) {
      throw new Error(`Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
    }
    return env;
  }
  return parsed.data;
}

const Env = STRICT_ENV_VALIDATION ? getValidatedEnv(_env) : _env;

export default Env;
