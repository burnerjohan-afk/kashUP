import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { colors, radius, spacing } from '../constants/theme';
import { createPowensSession, openPowensFlow } from '../services/powens';
import { MainStackParamList } from '../navigation/MainStack';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export default function PowensLinkScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLink = async () => {
    try {
      setLoading(true);
      setError(null);
      const session = await createPowensSession('demo-user');
      if (session?.connect_url) {
        await openPowensFlow(session.connect_url);
        navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
      } else {
        setError('Lien Powens non disponible pour le moment.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Lier ma carte bancaire</Text>
        <Text style={styles.subtitle}>
          Pour sécuriser vos cashbacks, reliez votre carte via notre partenaire Powens. Ce processus est certifié et
          chiffré.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pourquoi c’est important ?</Text>
          <Text style={styles.cardText}>• Détection automatique de vos achats.</Text>
          <Text style={styles.cardText}>• Cashbacks crédités sans effort.</Text>
          <Text style={styles.cardText}>• Données protégées (agrément ACPR).</Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleLink} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryText}>Se connecter à Powens</Text>
          )}
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textMain,
  },
  subtitle: {
    color: colors.textSecondary,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.greyLight,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },
  cardText: {
    color: colors.textSecondary,
  },
  primaryButton: {
    borderRadius: radius.pill,
    backgroundColor: colors.primaryBlue,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  primaryText: {
    color: colors.white,
    fontWeight: '700',
  },
  error: {
    color: '#EF4444',
  },
});


