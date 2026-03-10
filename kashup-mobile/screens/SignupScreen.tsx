import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import * as Google from 'expo-auth-session/providers/google';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { AuthStackParamList } from '../navigation/AuthStack';
import { formatApiError } from '../src/utils/error-handler';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
const iosClientIdForHook =
  Platform.OS === 'ios' ? (GOOGLE_IOS_CLIENT_ID || 'google-ios-not-configured') : undefined;
/** Sur Android, expo-auth-session exige que androidClientId soit défini (sinon crash). On met un placeholder si non configuré. */
const androidClientIdForHook =
  Platform.OS === 'android' ? (GOOGLE_ANDROID_CLIENT_ID || 'google-android-not-configured') : undefined;

export default function SignupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signUp, loginWithApple, loginWithGoogle } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [googleRequest, , googlePromptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    iosClientId: iosClientIdForHook,
    androidClientId: androidClientIdForHook,
  });

  const isGoogleConfigured = Boolean(
    GOOGLE_WEB_CLIENT_ID &&
      (Platform.OS !== 'ios' || GOOGLE_IOS_CLIENT_ID) &&
      (Platform.OS !== 'android' || GOOGLE_ANDROID_CLIENT_ID)
  );

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleApple = async () => {
    try {
      await loginWithApple();
    } catch (err) {
      Alert.alert('Apple', (err as Error).message);
    }
  };

  const handleGoogle = useCallback(async () => {
    if (!isGoogleConfigured || !googleRequest) {
      Alert.alert(
        'Google non configuré',
        'Pour vous inscrire avec Google, les identifiants OAuth doivent être définis.\n\n' +
          'Application : dans .env ou .env.local, ajoutez EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (iOS) et EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID (Android).\n\n' +
          'API : dans le .env de kashup-api, ajoutez GOOGLE_CLIENT_ID (même ID que le client Web Google).'
      );
      return;
    }
    setGoogleLoading(true);
    try {
      const result = await googlePromptAsync();
      if (result?.type !== 'success') {
        if (result?.type !== 'cancel') {
          Alert.alert('Google', 'Connexion Google annulée ou échouée.');
        }
        return;
      }
      const idToken = result.params?.id_token;
      if (!idToken) {
        Alert.alert('Google', 'Token Google absent. Réessayez.');
        return;
      }
      await loginWithGoogle(idToken);
      // Après connexion, RootNavigator affiche MainStack
    } catch (err) {
      Alert.alert('Inscription avec Google', formatApiError(err));
    } finally {
      setGoogleLoading(false);
    }
  }, [isGoogleConfigured, googleRequest, googlePromptAsync, loginWithGoogle]);

  const handleSubmit = async () => {
    try {
      await signUp({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });
      // Après inscription, RootNavigator affiche MainStack (app principale)
    } catch (err) {
      Alert.alert('Inscription', (err as Error).message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Créer mon compte</Text>
        <Text style={styles.subtitle}>Rejoignez la communauté qui booste l’économie locale.</Text>

        <View style={styles.socialRow}>
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.socialButton} onPress={handleApple}>
              <Ionicons name="logo-apple" size={18} color={colors.textMain} />
              <Text style={styles.socialText}>Apple</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.socialButton, (!isGoogleConfigured || googleLoading) && styles.socialButtonDisabled]}
            onPress={handleGoogle}
            disabled={googleLoading}
          >
            <Ionicons name="logo-google" size={18} color="#EA4335" />
            <Text style={styles.socialText}>{googleLoading ? 'Connexion…' : 'Google'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>ou</Text>
          <View style={styles.separatorLine} />
        </View>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput
              style={styles.input}
              placeholder="Johan"
              value={form.firstName}
              onChangeText={(value) => updateField('firstName', value)}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Nom</Text>
            <TextInput
              style={styles.input}
              placeholder="Dupont"
              value={form.lastName}
              onChangeText={(value) => updateField('lastName', value)}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            keyboardType="email-address"
            placeholder="prenom@email.com"
            value={form.email}
            onChangeText={(value) => updateField('email', value)}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Mot de passe</Text>
          <View style={styles.passwordInput}>
            <TextInput
              style={styles.passwordField}
              secureTextEntry={!showPassword}
              placeholder="********"
              value={form.password}
              onChangeText={(value) => updateField('password', value)}
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
              <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
          <LinearGradient colors={[colors.primaryBlue, colors.primaryPurple]} style={styles.primaryGradient}>
            <Text style={styles.primaryText}>Créer un compte</Text>
          </LinearGradient>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textMain,
  },
  subtitle: {
    color: colors.textSecondary,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  socialButton: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  socialButtonDisabled: {
    opacity: 0.6,
  },
  socialText: {
    fontWeight: '600',
    color: colors.textMain,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  separatorText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  field: {
    gap: spacing.xs / 2,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordField: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  primaryButton: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  primaryGradient: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  primaryText: {
    color: colors.white,
    fontWeight: '700',
  },
});


