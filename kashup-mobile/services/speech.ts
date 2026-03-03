import { Platform } from 'react-native';

type SpeechListener = (text: string) => void;

let listener: SpeechListener | null = null;
let recognition: SpeechRecognition | null = null;

const isWebSpeechAvailable = () =>
  typeof window !== 'undefined' && typeof (window as any).webkitSpeechRecognition !== 'undefined';

export async function requestSpeechPermissions(): Promise<boolean> {
  if (Platform.OS !== 'web') {
    // Sur mobile (Expo/React Native), l'intégration réelle nécessite un module natif.
    // On suppose l'utilisateur sur mobile autorise via paramètres système.
    return true;
  }
  return isWebSpeechAvailable();
}

export function subscribeToSpeechResults(cb: SpeechListener) {
  listener = cb;
}

export function unsubscribeFromSpeechResults() {
  listener = null;
}

export function startSpeechRecognition(onFinish?: () => void) {
  if (!isWebSpeechAvailable()) {
    listener?.('Micro indisponible sur cet appareil.');
    onFinish?.();
    return;
  }

  const SpeechRecognition = (window as any).webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(' ');
    listener?.(transcript);
  };

  recognition.onerror = () => {
    listener?.('Micro indisponible ou permission refusée.');
    stopSpeechRecognition();
    onFinish?.();
  };

  recognition.onend = () => {
    onFinish?.();
  };

  recognition.start();
}

export async function stopSpeechRecognition() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
}

