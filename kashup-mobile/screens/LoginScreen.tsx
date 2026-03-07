import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import * as Google from 'expo-auth-session/providers/google';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { requestPasswordReset } from '@/src/services/authService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CARD_GRADIENT_COLORS, CARD_GRADIENT_LOCATIONS, colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { AuthStackParamList } from '../navigation/AuthStack';
import { formatApiError } from '../src/utils/error-handler';

type Nav = NativeStackNavigationProp<AuthStackParamList>;
type AuthMode = 'login' | 'signup';

const SAVED_CREDENTIALS_KEY = 'kashup-saved-credentials';
const BIOMETRIC_PREF_KEY = 'kashup-biometric-enabled';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';

/** Sur iOS, expo-auth-session exige que iosClientId soit défini (sinon Render Error). On met un placeholder si non configuré. */
const iosClientIdForHook =
  Platform.OS === 'ios' ? (GOOGLE_IOS_CLIENT_ID || 'google-ios-not-configured') : undefined;
/** Sur Android, expo-auth-session exige que androidClientId soit défini (sinon crash). On met un placeholder si non configuré. */
const androidClientIdForHook =
  Platform.OS === 'android' ? (GOOGLE_ANDROID_CLIENT_ID || 'google-android-not-configured') : undefined;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { login, signUp, loginWithApple, loginWithGoogle } = useAuth();

  const [googleRequest, , googlePromptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    iosClientId: iosClientIdForHook,
    androidClientId: androidClientIdForHook,
  });

  const isGoogleConfigured = Boolean(
    GOOGLE_WEB_CLIENT_ID && (Platform.OS !== 'ios' || GOOGLE_IOS_CLIENT_ID) && (Platform.OS !== 'android' || GOOGLE_ANDROID_CLIENT_ID)
  );

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  // ⚠️ RGPD: Ne plus stocker le mot de passe, uniquement l'email pour faciliter la connexion
  const [savedEmail, setSavedEmail] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        // ⚠️ RGPD: Ne stocker que l'email, jamais le mot de passe
        const stored = await SecureStore.getItemAsync(SAVED_CREDENTIALS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSavedEmail(parsed.email);
          setEmail(parsed.email);
          setRememberMe(true);
        }
        const biometricPref = await SecureStore.getItemAsync(BIOMETRIC_PREF_KEY);
        setBiometricEnabled(biometricPref === 'true');

        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
        setBiometricSupported(hasHardware && enrolled);
      } catch (error) {
        console.warn('[auth] init error', error);
      }
    };
    bootstrap();
  }, []);

  // ⚠️ RGPD: La biométrie ne peut plus être utilisée pour auto-remplir le mot de passe
  // Elle peut être utilisée pour déverrouiller l'app si l'utilisateur est déjà authentifié
  const allowBiometricLogin = false; // Désactivé car on ne stocke plus le mot de passe

  const resetToApp = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  }, [navigation]);

  const handleRememberPreference = useCallback(
    async (credEmail: string, options?: { forceClear?: boolean }) => {
      // ⚠️ RGPD: Ne stocker que l'email, jamais le mot de passe
      if (options?.forceClear) {
        await SecureStore.deleteItemAsync(SAVED_CREDENTIALS_KEY);
        setSavedEmail(null);
        return;
      }
      if (rememberMe) {
        await SecureStore.setItemAsync(
          SAVED_CREDENTIALS_KEY,
          JSON.stringify({ email: credEmail }),
        );
        setSavedEmail(credEmail);
      } else if (!rememberMe) {
        await SecureStore.deleteItemAsync(SAVED_CREDENTIALS_KEY);
        setSavedEmail(null);
      }
    },
    [rememberMe],
  );

  const handleBiometricPreference = useCallback(
    async (next: boolean) => {
      if (next) {
        await SecureStore.setItemAsync(BIOMETRIC_PREF_KEY, 'true');
      } else {
        await SecureStore.deleteItemAsync(BIOMETRIC_PREF_KEY);
      }
      setBiometricEnabled(next);
    },
    [],
  );

  const handleLogin = async () => {
    if (!email || !password) {
      setStatus('Merci de renseigner votre email et votre mot de passe.');
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await login(email.trim().toLowerCase(), password);
      // ⚠️ RGPD: Ne stocker que l'email, jamais le mot de passe
      await handleRememberPreference(email.trim().toLowerCase());
      resetToApp();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Impossible de vous connecter pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!signupEmail || !signupPassword) {
      setStatus('Indiquez votre email et un mot de passe pour créer un compte.');
      return;
    }
    if (signupPassword.length < 8) {
      setStatus('Choisissez un mot de passe d’au moins 8 caractères.');
      return;
    }
    if (signupPassword !== signupConfirm) {
      setStatus('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await signUp({ email: signupEmail.trim().toLowerCase(), password: signupPassword });
      // ⚠️ RGPD: Ne stocker que l'email, jamais le mot de passe
      await handleRememberPreference(signupEmail.trim().toLowerCase());
      resetToApp();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Création de compte impossible pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setStatus('Indiquez d’abord votre adresse email pour réinitialiser le mot de passe.');
      return;
    }
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      Alert.alert('E-mail envoyé', 'Vérifiez votre messagerie pour définir un nouveau mot de passe.');
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Impossible d’envoyer l’e-mail de réinitialisation. Réessayez plus tard.',
      );
    }
  };

  const handleSocial = useCallback(
    async (provider: 'apple' | 'google') => {
      setLoading(true);
      setStatus(null);
      try {
        if (provider === 'apple') {
          if (Platform.OS !== 'ios') {
            setStatus('Connexion Apple disponible uniquement sur iPhone et iPad.');
            return;
          }
          await loginWithApple();
        } else {
          if (!isGoogleConfigured || !googleRequest) {
            Alert.alert(
              'Google non configuré',
              'Pour vous connecter avec Google, les identifiants OAuth doivent être définis.\n\n' +
                'Application : dans .env ou .env.local, ajoutez EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (iOS) et EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID (Android).\n\n' +
                'API : dans le .env de kashup-api, ajoutez GOOGLE_CLIENT_ID (même ID que le client Web Google).'
            );
            return;
          }
          const result = await googlePromptAsync();
          if (result?.type !== 'success') {
            if (result?.type === 'cancel') return;
            setStatus('Connexion Google annulée ou échouée.');
            return;
          }
          const idToken = result.params?.id_token;
          if (!idToken) {
            setStatus('Token Google absent. Réessayez.');
            return;
          }
          await loginWithGoogle(idToken);
        }
        await handleBiometricPreference(false);
        await handleRememberPreference('', { forceClear: true });
        setRememberMe(false);
        resetToApp();
      } catch (error) {
        setStatus(formatApiError(error));
      } finally {
        setLoading(false);
      }
    },
    [loginWithApple, loginWithGoogle, isGoogleConfigured, googleRequest, googlePromptAsync, handleBiometricPreference, handleRememberPreference, resetToApp]
  );

  const handleBiometricLogin = async () => {
    // ⚠️ RGPD: La biométrie ne peut plus être utilisée pour auto-remplir le mot de passe
    // Cette fonctionnalité est désactivée car on ne stocke plus le mot de passe
    setStatus('La connexion biométrique nécessite que vous saisissiez votre mot de passe.');
  };

  const handleToggleBiometric = async () => {
    if (!biometricSupported) {
      Alert.alert(
        'Biométrie indisponible',
        'Activez Face ID / Touch ID dans les réglages de votre appareil pour utiliser cette option.',
      );
      return;
    }
    // ⚠️ RGPD: La biométrie est désactivée car on ne stocke plus le mot de passe
    setStatus('La connexion biométrique n\'est plus disponible pour des raisons de sécurité.');
    return;
  };

  const formActions = useMemo(
    () => ({
      login: handleLogin,
      signup: handleSignUp,
    }),
    [handleLogin, handleSignUp],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[...CARD_GRADIENT_COLORS]}
        locations={[...CARD_GRADIENT_LOCATIONS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}>
        <View style={styles.heroContent}>
          <Text style={styles.heroEyebrow}>Bienvenue sur KashUP</Text>
          <Text style={styles.heroTitle}>Financez votre quotidien, boostez vos causes.</Text>
          <Text style={styles.heroBody}>
            Retrouvez votre cagnotte, vos boosts et vos dons depuis un espace sécurisé pensé pour la Caraïbe.
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.modeSwitch}>
              {(['login', 'signup'] as AuthMode[]).map((item) => {
                const active = mode === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.modeButton, active && styles.modeButtonActive]}
                    onPress={() => setMode(item)}
                    activeOpacity={0.8}>
                    {active && (
                      <LinearGradient
                        colors={[...CARD_GRADIENT_COLORS]}
                        locations={[...CARD_GRADIENT_LOCATIONS]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[StyleSheet.absoluteFill, styles.modeButtonGradient]}
                      />
                    )}
                    <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>
                      {item === 'login' ? 'Se connecter' : 'Créer un compte'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {mode === 'login' ? (
              <>
                <AuthInput
                  label="Adresse e-mail"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  icon="mail-outline"
                  autoCapitalize="none"
                />
                <AuthInput
                  label="Mot de passe"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  icon="lock-closed-outline"
                  autoCapitalize="none"
                  accessory={
                    <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                      <Ionicons
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  }
                />
                <View style={styles.loginOptions}>
                  <View style={styles.switchRow}>
                    <Switch value={rememberMe} onValueChange={setRememberMe} thumbColor="#fff" trackColor={{ true: colors.primaryBlue }} />
                    <Text style={styles.switchLabel}>Enregistrer mes identifiants</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPassword}>
                  <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={formActions[mode]} disabled={loading} activeOpacity={0.8}>
                  <LinearGradient
                    colors={[...CARD_GRADIENT_COLORS]}
                    locations={[...CARD_GRADIENT_LOCATIONS]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryButtonGradient}>
                    {loading ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.primaryText}>Se connecter</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <AuthInput
                  label="Adresse e-mail"
                  value={signupEmail}
                  onChangeText={setSignupEmail}
                  keyboardType="email-address"
                  icon="mail-outline"
                  autoCapitalize="none"
                />
                <AuthInput
                  label="Mot de passe"
                  value={signupPassword}
                  onChangeText={setSignupPassword}
                  secureTextEntry={!showSignupPassword}
                  icon="lock-closed-outline"
                  autoCapitalize="none"
                  accessory={
                    <TouchableOpacity onPress={() => setShowSignupPassword((prev) => !prev)}>
                      <Ionicons
                        name={showSignupPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  }
                />
                <AuthInput
                  label="Confirmer le mot de passe"
                  value={signupConfirm}
                  onChangeText={setSignupConfirm}
                  secureTextEntry
                  icon="shield-checkmark-outline"
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.primaryButton} onPress={formActions[mode]} disabled={loading} activeOpacity={0.8}>
                  <LinearGradient
                    colors={[...CARD_GRADIENT_COLORS]}
                    locations={[...CARD_GRADIENT_LOCATIONS]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryButtonGradient}>
                    {loading ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.primaryText}>Créer mon compte</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>Ou continuer avec</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <SocialButton
                label="Google"
                icon={
                  <Image
                    source={{
                      uri: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Gmail_Icon.png',
                    }}
                    style={styles.gmailIcon}
                  />
                }
                onPress={() => handleSocial('google')}
                disabled={loading || !googleRequest}
              />
              {Platform.OS === 'ios' && (
                <SocialButton
                  label="Apple"
                  icon={<FontAwesome name="apple" size={20} color={colors.textMain} />}
                  onPress={() => handleSocial('apple')}
                  disabled={loading}
                />
              )}
            </View>

            <View style={styles.biometricBlock}>
              <View style={styles.biometricHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.biometricTitle}>Face ID / Empreinte</Text>
                  <Text style={styles.biometricSubtitle}>
                    Débloquez KashUP instantanément grâce à la biométrie de votre appareil.
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleToggleBiometric}
                  thumbColor="#fff"
                  trackColor={{ true: colors.primaryPurple }}
                />
              </View>
            </View>

            {allowBiometricLogin && (
              <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricLogin} disabled={loading}>
                <Ionicons name="scan-outline" size={16} color={colors.primaryPurple} />
                <Text style={styles.biometricButtonText}>Se connecter avec Face ID / empreinte</Text>
              </TouchableOpacity>
            )}

            {status && <Text style={styles.statusText}>{status}</Text>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type AuthInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  accessory?: React.ReactNode;
};

function AuthInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  icon,
  keyboardType = 'default',
  autoCapitalize = 'none',
  accessory,
}: AuthInputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name={icon} size={18} color={colors.textSecondary} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          placeholderTextColor="#9CA3AF"
        />
        {accessory}
      </View>
    </View>
  );
}

function SocialButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.socialButton, disabled && styles.socialButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}>
      {icon}
      <Text style={[styles.socialLabel, disabled && styles.socialLabelDisabled]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  hero: {
    padding: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
    gap: spacing.sm,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  heroBody: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    lineHeight: 20,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 32,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    gap: spacing.md,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: spacing.xs,
    borderRadius: radius.pill,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  modeButtonActive: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  modeButtonGradient: {
    borderRadius: radius.pill,
  },
  modeLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modeLabelActive: {
    color: colors.white,
    fontWeight: '700',
  },
  inputGroup: {
    gap: spacing.xs / 2,
  },
  inputLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#F9FAFB',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    color: colors.textMain,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loginOptions: {
    gap: spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  switchLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  forgotButton: {
    alignSelf: 'center',
    marginTop: spacing.xs,
  },
  forgotText: {
    fontSize: 12,
    color: colors.primaryPurple,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  link: {
    color: colors.primaryPurple,
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: colors.white,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E4E4E7',
  },
  dividerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  socialButton: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#FAFAFA',
  },
  socialLabel: {
    fontWeight: '600',
    color: colors.textMain,
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
  socialLabelDisabled: {
    color: colors.textSecondary,
  },
  gmailIcon: {
    width: 24,
    height: 18,
    resizeMode: 'contain',
  },
  biometricBlock: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#F6F3FF',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  biometricHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  biometricTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMain,
  },
  biometricSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.primaryPurple,
    fontWeight: '700',
  },
  biometricButton: {
    marginTop: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryPurple,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
  },
  biometricButtonText: {
    color: colors.primaryPurple,
    fontWeight: '700',
  },
  statusText: {
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'center',
  },
});
