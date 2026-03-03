import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { MainStackParamList } from '../navigation/MainStack';

export default function SignupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { signUp, loginWithApple, loginWithGoogle } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleApple = async () => {
    try {
      await loginWithApple();
      // ⚠️ RGPD: Rediriger vers l'écran de consentement après inscription
      navigation.navigate('Consent');
    } catch (err) {
      Alert.alert('Apple', (err as Error).message);
    }
  };

  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
      // ⚠️ RGPD: Rediriger vers l'écran de consentement après inscription
      navigation.navigate('Consent');
    } catch (err) {
      Alert.alert('Google', (err as Error).message);
    }
  };

  const handleSubmit = async () => {
    try {
      await signUp({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });
      // ⚠️ RGPD: Rediriger vers l'écran de consentement après inscription
      navigation.navigate('Consent');
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
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Créer mon compte</Text>
        <Text style={styles.subtitle}>Rejoignez la communauté qui booste l’économie locale.</Text>

        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialButton} onPress={handleApple}>
            <Ionicons name="logo-apple" size={18} color={colors.textMain} />
            <Text style={styles.socialText}>Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} onPress={handleGoogle}>
            <Ionicons name="logo-google" size={18} color="#EA4335" />
            <Text style={styles.socialText}>Google</Text>
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


