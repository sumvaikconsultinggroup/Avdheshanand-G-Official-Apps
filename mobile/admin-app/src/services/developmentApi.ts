export function developmentApiOrigin(): string | undefined {
  if (process.env.EXPO_PUBLIC_STAGE !== 'development') return undefined;
  const origin = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  const allowed = ['https://agm-development-admin.vercel.app', 'https://admin-development.avdheshanandg.org'];
  if (!origin || !allowed.includes(origin)) throw new Error('Configure the isolated AGM development API.');
  return origin;
}
