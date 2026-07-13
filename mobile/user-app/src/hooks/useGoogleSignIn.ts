import { useState } from 'react';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// The native Google Sign-In module is NOT present in Expo Go. Lazy-require it so
// the app still boots for local UI/logic testing in Expo Go (Google sign-in is
// simply unavailable there); in a dev/preview/production build it loads and the
// native account picker works normally.
let googleModule: any;
let configured = false;
function getGoogle(): any | null {
  if (googleModule === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      googleModule = require('@react-native-google-signin/google-signin');
    } catch {
      googleModule = null;
    }
  }
  if (googleModule && !configured && WEB_CLIENT_ID) {
    try {
      googleModule.GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, offlineAccess: false });
      configured = true;
    } catch {
      // Native module resolved but not usable (e.g. Expo Go) — treat as absent.
      googleModule = null;
    }
  }
  return googleModule ?? null;
}

/** True when the web client id is present (native availability checked at sign-in). */
export const isGoogleConfigured = Boolean(WEB_CLIENT_ID);

interface UseGoogleSignIn {
  /** Opens the native Google account chooser. Alerts via onError if unavailable. */
  signIn: () => void;
  /** False when no client id is configured. */
  ready: boolean;
  /** True while the Google flow is in progress. */
  inProgress: boolean;
}

/**
 * Native Google sign-in via @react-native-google-signin/google-signin. Returns
 * the Google `id_token` to `onIdToken` (which POSTs it to `/creduser/google`).
 * `onError` is called on failure. Cancellations are silent. Requires a real
 * build (dev/preview/production) — does NOT work in Expo Go.
 */
export function useGoogleSignIn(
  onIdToken: (idToken: string) => void,
  onError?: (message: string) => void
): UseGoogleSignIn {
  const [inProgress, setInProgress] = useState(false);

  const signIn = async () => {
    if (!WEB_CLIENT_ID) {
      onError?.('Google sign-in is not configured yet.');
      return;
    }
    const g = getGoogle();
    if (!g) {
      onError?.('Google sign-in needs the full app build (not Expo Go).');
      return;
    }
    const { GoogleSignin, statusCodes } = g;
    try {
      setInProgress(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();

      const anyResult = result as unknown as {
        type?: string;
        data?: { idToken?: string | null };
        idToken?: string | null;
      };
      if (anyResult?.type === 'cancelled') return; // user backed out, stay silent

      const idToken = anyResult?.data?.idToken ?? anyResult?.idToken ?? null;
      if (idToken) {
        onIdToken(idToken);
      } else {
        onError?.('Could not read Google credentials. Please try again.');
      }
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === statusCodes.SIGN_IN_CANCELLED || code === statusCodes.IN_PROGRESS) {
        return; // silent
      }
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        onError?.('Google Play Services is unavailable or needs an update.');
        return;
      }
      onError?.((error as { message?: string })?.message || 'Google sign-in failed.');
    } finally {
      setInProgress(false);
    }
  };

  return { signIn, ready: isGoogleConfigured, inProgress };
}
