import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// Required so the auth popup/redirect can complete and hand control back.
WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// expo-auth-session validates the platform-specific client id *at render time*
// (Android needs androidClientId, iOS needs iosClientId). If the required id is
// missing it throws a Render Error and takes the whole screen down. Resolve the
// id this platform actually requires so we can skip the provider hook entirely
// when it isn't configured, rather than crashing.
const NATIVE_CLIENT_ID = Platform.select({
  android: ANDROID_CLIENT_ID,
  ios: IOS_CLIENT_ID,
  default: WEB_CLIENT_ID,
});

/**
 * True only when the client ids needed on the current platform are present.
 * Derived from build-time env vars, so it's constant for the app's lifetime —
 * safe to branch on before calling hooks. Screens should hide the Google button
 * when this is false.
 */
export const isGoogleConfigured = Boolean(WEB_CLIENT_ID && NATIVE_CLIENT_ID);

interface UseGoogleSignIn {
  /** Opens the Google account chooser. No-op (alerts via onError) if unconfigured. */
  signIn: () => void;
  /** False until the auth request is ready / when no client IDs are configured. */
  ready: boolean;
  /** True while the Google flow is in progress. */
  inProgress: boolean;
}

/**
 * Google sign-in via Expo AuthSession. Returns the Google `id_token` to the
 * `onIdToken` callback (which should POST it to the backend `/creduser/google`).
 * `onError` is called on failure/dismissal. Requires the EXPO_PUBLIC_GOOGLE_*
 * client IDs and a development build (Google sign-in does not work in Expo Go).
 */
export function useGoogleSignIn(
  onIdToken: (idToken: string) => void,
  onError?: (message: string) => void
): UseGoogleSignIn {
  // Bail out before touching expo-auth-session when the platform client id is
  // absent — calling the provider hook would throw during render. `isGoogleConfigured`
  // is a module constant, so this branch is stable across every render of a given
  // component instance and does not violate the rules of hooks.
  if (!isGoogleConfigured) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return {
      signIn: () => onError?.('Google sign-in is not configured yet.'),
      ready: false,
      inProgress: false,
    };
  }

  const configured = Boolean(WEB_CLIENT_ID);
  const inProgress = useRef(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: WEB_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (!response) return;
    inProgress.current = false;
    if (response.type === 'success') {
      const idToken =
        (response.params && response.params.id_token) ||
        (response.authentication && response.authentication.idToken);
      if (idToken) {
        onIdToken(idToken);
      } else {
        onError?.('Could not read Google credentials. Please try again.');
      }
    } else if (response.type === 'error') {
      onError?.(response.error?.message || 'Google sign-in failed.');
    }
    // 'dismiss'/'cancel' are silent (user backed out).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const signIn = () => {
    if (!configured) {
      onError?.('Google sign-in is not configured yet.');
      return;
    }
    inProgress.current = true;
    promptAsync();
  };

  return { signIn, ready: configured && !!request, inProgress: inProgress.current };
}
