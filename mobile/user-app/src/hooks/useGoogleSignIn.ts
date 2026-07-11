import { useState } from 'react';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// Configure the native Google Sign-In SDK once at module load.
//
// `webClientId` is what mints the id_token whose `aud` the backend
// (/creduser/google) verifies against GOOGLE_WEB_CLIENT_ID. The sign-in itself
// is authorized natively by the app's package name + SHA-1 (via
// google-services.json) — there is NO browser redirect, so this avoids all the
// redirect-uri fragility of expo-auth-session that caused Google's
// "Error 400: invalid_request".
if (WEB_CLIENT_ID) {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: false,
  });
}

/** True when the web client id needed to mint an id_token is present. */
export const isGoogleConfigured = Boolean(WEB_CLIENT_ID);

interface UseGoogleSignIn {
  /** Opens the native Google account chooser. Alerts via onError if unconfigured. */
  signIn: () => void;
  /** False when no client id is configured. */
  ready: boolean;
  /** True while the Google flow is in progress. */
  inProgress: boolean;
}

/**
 * Native Google sign-in via @react-native-google-signin/google-signin. Returns
 * the Google `id_token` to `onIdToken` (which POSTs it to `/creduser/google`).
 * `onError` is called on failure. Cancellations are silent. Requires a
 * dev/production build (does not work in Expo Go) with the EXPO_PUBLIC_GOOGLE_
 * client id and the app's SHA-1 registered in Firebase.
 */
export function useGoogleSignIn(
  onIdToken: (idToken: string) => void,
  onError?: (message: string) => void
): UseGoogleSignIn {
  const [inProgress, setInProgress] = useState(false);

  const signIn = async () => {
    if (!isGoogleConfigured) {
      onError?.('Google sign-in is not configured yet.');
      return;
    }
    try {
      setInProgress(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();

      // Newer versions return { type: 'success' | 'cancelled', data }.
      // Older versions return the userInfo object directly.
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
