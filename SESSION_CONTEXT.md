# Session Context — Swami Avdheshanand G App

> Handoff doc to paste into a new chat so it has full context. Date: 2026-06-30.

## Project Overview
Two-part product in one repo:
- **`mobile/user-app`** — Expo SDK 54 React Native app (devotee-facing).
- **`dashboard-next`** — Next.js 15.1.3 (App Router) backend + admin dashboard, Mongoose/MongoDB Atlas, JWT auth.
- **`mobile/admin-app`** — admin mobile app (rarely touched this session).

**Brand name rule:** always **"Swami Avdheshanand G"** — never "Mission". (68 replacements already done across locales.)

## Key Architecture
- **Auth:** JWT via `creduser` collection. Two login methods coexisting in ONE user store: email/password AND Google OAuth (`authMethod: 'normal' | 'oauth'`). Token stored in `expo-secure-store` as `auth_token`; sent as Bearer. Next.js middleware has a public-path allowlist — anything under `/api/creduser` prefix is public.
- **i18n:** `react-i18next`, **12 languages** (en, hi, bn, ta, te, mr, gu, kn, ml, pa, or, as), AsyncStorage-persisted, all at **100% key coverage** (AI-filled via gpt-4o). `en.json` is the source (~700 keys). Refill script: `scratchpad/fill-translations.js`. (Volunteer screen historically had some hardcoded strings.)
- **Theme:** Full runtime light/dark/system theme. Pattern = `useTheme()` returns `{ colors }`; styles built via `makeStyles(colors: ColorPalette)` wrapped in `useMemo(() => makeStyles(colors), [colors])`. Defined in `src/theme/index.ts` (`lightColors`, `darkColors`, `ColorPalette`), `src/context/ThemeContext.tsx`. Toggle in Settings screen. Paper uses MD3Light/DarkTheme.
- **Email:** **Resend** (`resend@6.16.0`) via `dashboard-next/src/utils/resendMailer.ts`. Currently `RESEND_FROM=onboarding@resend.dev` (domain NOT verified → only delivers to the Resend account owner's email). nodemailer still used for OTP/schedule.
- **AI:** OpenAI gpt-4o-mini for Daily Vichar (`src/lib/dailyVicharGenerator.ts` → `/api/daily-vichar/today`); gpt-4o for translations.
- **Other:** Cloudinary uploads, Razorpay (WebView checkout), astronomy-engine for Panchang (NOT AI — beta Lahiri, sunrise-anchored).
- **Mobile→backend connectivity:** user-app finds dashboard-next on **port 3001**; uses `EXPO_PUBLIC_API_URL` (e.g. `http://192.168.1.42:3001`). MUST use Expo **LAN mode**, not tunnel (tunnel only forwards 8081). Generic auth errors usually = backend unreachable.

## What Was Built/Fixed This Session (chronological)
1. Stale tsconfig error — just a stale TS server, no code change.
2. Launch crash ("Something went wrong") — OOM from a 37MB (6000×7160) onboarding JPEG → downscaled to 1200px with ffmpeg.
3. Registration "Cannot reach server" — switched Expo tunnel→LAN + set `EXPO_PUBLIC_API_URL`.
4. MongoDB "Password contains unescaped characters" — user fixed a duplicated username in the URI.
5. Registration not redirecting Home — `Login`/`Register` were global modals never removed on auth flip; made `Main` always registered + `navigation.reset` to Main after login/register.
6. Home screen — made the 4 boxes consistent size; removed duplicate hamburger (keep top-left only); elevated sidebar; Daily Vichar made dynamic via OpenAI.
7. Contact form ("Write to Swami Ji") — verified end-to-end: `/api/connect` → Connect model → visible in `/dashboard/connect`; success message; Resend confirmation email.
8. Mantra Diksha form — Resend email; fixed orphaned Cloudinary uploads (failed submissions must NOT persist DB record OR uploaded doc; `deleteFromCloudinary` on save failure); calendar DOB picker; phone capped 10 digits; Aadhaar 12-digit format-only `/^[2-9]\d{11}$/` (removed Verhoeff — valid numbers were being rejected); user-centric success message (no "admin panel" mention). Cloudinary placeholder creds (`your_cloud_name`) flagged to user as config.
9. Schedule page — readability up; redesigned Schedule/Events tab pills with more spacing.
10. Explore screen — fixed tab-switch bug (effect depended on `selectedCategory` and reverted taps → now depends only on `route.params?.category`; removed full-screen loading swap); fixed gallery images (backend field is `image`, not `imageUrl`); fixed header/card spacing.
11. Volunteer form — app sent JSON but backend read multipart + required age/occupationType/consent/motivation≥50 → fixed backend to accept JSON branch + rewrote mobile form; Resend email.
12. Profile — shrank donation stats; registrations tab shows actual registrations (blank if none, NOT "coming soon"); redesigned Donate + Profile spacing.
13. Privacy/Terms — fixed top header spacing.
14. Sidebar / Language drawer — redesigned (image was cropped, radius too large); language change now follows entire app.
15. Full translations — all 12 languages to 100% (AI translate everything).
16. Forgot/Reset password added; Settings → App Preferences with full dark/light theme (~50 files refactored, 0 tsc errors).
17. Profile login-prompt screen — decluttered, fixed top header.
18. **Google Sign-In** — chose expo-auth-session + backend verify (keep both methods in one user store). See files below. Needs a **dev build** (won't work in Expo Go) + env values.
19. Donate — added space between button and box.
20. Splash logo — now a rounded circle (148px circle, white bg, gold ring, shadow; 116px contained logo inside).
21. Onboarding Location screen — full rewrite: ScrollView + fixed footer (buttons always visible), circular location medallion, safe-area insets, iconned benefit rows.
22. **Onboarding welcome carousel** (most recent fix) — slides were `screen−48px` wide w/ margin but `pagingEnabled` snaps to full screen width → side-cut/partial slides. Fixed: slides now full screen width with inner `paddingHorizontal` gutter; `handleMomentumEnd` divides by `width`; `SLIDE_HEIGHT` 420→468; `numberOfLines` clamps on all titles/descriptions so text can't clip at bottom.
23. **Edit Profile** (most recent feature) — backend `GET`/`PATCH /api/creduser/profile` (updates name + phone for both normal & oauth; email/auth-method locked); `EditProfileScreen.tsx`; `AuthContext.updateProfile()`; "Edit Profile" is first item in Profile menu; i18n keys filled all languages.

## Important Files
**Mobile (`mobile/user-app/src/`)**
- `context/AuthContext.tsx` — login/register/`googleLogin(idToken)`/`updateProfile({fullName,phone})`/logout/OTP. (User interface currently `{_id,name,email,phone?,role?}`.)
- `context/ThemeContext.tsx`, `App.tsx` (ThemeProvider + Paper + StatusBar).
- `hooks/useGoogleSignIn.ts` — `import * as Google from 'expo-auth-session/providers/google'` (lowercase subpath in v7!), `Google.useIdTokenAuthRequest`, reads `EXPO_PUBLIC_GOOGLE_*`, returns `{signIn, ready, inProgress}`.
- `components/common/FloatingInput.tsx` — Paper outlined TextInput wrapper (floating label, gold focus / red error, leftIcon, inline HelperText). Exported from `components/common/index.ts`.
- `screens/profile/ProfileScreen.tsx`, `screens/profile/EditProfileScreen.tsx`.
- `screens/onboarding/OnboardingWelcomeScreen.tsx`, `OnboardingLocationScreen.tsx`.
- `screens/SplashScreen.tsx`.
- `theme/index.ts`.
- `i18n/locales/*.json` (en.json = source).
- `navigation/AppNavigator.tsx` — `EditProfile`, `ForgotPassword`, `Settings`, `MyRegistrations`, `DonationHistory` routes; `Main` always registered.

**Backend (`dashboard-next/src/`)**
- `app/api/creduser/profile/route.ts` — GET + PATCH (Bearer auth via `getUserId`, `jwt.verify(..., {algorithms:['HS256']})`).
- `app/api/creduser/google/route.ts` — `OAuth2Client.verifyIdToken({idToken, audience: allowedAudiences()})`; links by email or creates oauth user; returns JWT + cookies.
- `utils/resendMailer.ts` — `sendResendEmail`, `buildContactConfirmationEmail`, `buildDikshaConfirmationEmail`, `buildVolunteerConfirmationEmail`, `buildContactNotificationEmail`; `MISSION_NAME='Swami Avdheshanand G'`.
- `lib/dailyVicharGenerator.ts` → wired into `app/api/daily-vichar/today/route.js`.
- `app/api/connect/route.js`, `app/api/mantra-diksha/route.ts`, `app/api/volunteer/route.ts`, `lib/panchang/panchangService.ts`.

## Required Environment Variables
**dashboard-next (`.env.local`)** — Next.js loads this only at startup, RESTART server after edits:
- `RESEND_API_KEY`, `RESEND_FROM=onboarding@resend.dev`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (still placeholders → Mantra Diksha doc upload 500s until set)
- `OPENAI_API_KEY`
- `JWT_SECRET`, MongoDB URI
- `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_EXPO_CLIENT_ID` (used as verifyIdToken audiences)

**user-app (`.env` / Expo public):**
- `EXPO_PUBLIC_API_URL=http://<laptop-LAN-IP>:3001`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID`

Both documented in respective `.env.example` files.

## Verification Commands
- Mobile bundle: `npx expo export --platform android` (last clean run = 1406 modules).
- Types: `npx tsc --noEmit` (0 errors).
- Backend auth check: PATCH `/api/creduser/profile` returns 401 without token.

## Outstanding / User-Side TODOs
- Provide real Google client IDs + use a **dev build** (Google won't work in Expo Go).
- Add real Cloudinary creds (or Mantra Diksha doc upload keeps failing).
- Verify a Resend domain to email arbitrary recipients (currently dev sender).
- (Offered, not confirmed): profile photo upload to Cloudinary on Edit Profile; broaden i18n on remaining hardcoded screens; EAS dev build for push notifications; guard `expo-notifications` to silence Expo Go warning; floating inputs on Panchang city search/chat box.

## Known Gotchas
- `expo-auth-session/providers/google` is **lowercase** in v7 (capital `Google` fails to resolve).
- Next.js `.env.local` only read at startup — restart 3001 after env changes.
- Theme refactors: never reference `colors` at module scope in `StyleSheet.create` — thread `colors` into `makeStyles(colors)`.
- Aadhaar = format-only validation (no Verhoeff).
- Failed form submissions must clean up Cloudinary uploads (no orphans, no partial DB writes).
