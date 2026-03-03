/**
 * Écran d'export des données personnelles (RGPD - droit d'accès)
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius, spacing } from '../constants/theme';
import { exportUserData } from '../src/services/gdpr';

export default function DataExportScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const data = await exportUserData();

      // Convertir les données en JSON formaté
      const jsonData = JSON.stringify(data, null, 2);
      const fileName = `kashup-export-${new Date().toISOString().split('T')[0]}.json`;

      // Partager les données via l'API Share native
      try {
        await Share.share({
          message: `Export de mes données KashUP\n\n${jsonData}`,
          title: fileName,
        });
      } catch (shareError) {
        // Si le partage échoue, afficher les données dans une alerte
        Alert.alert(
          'Export réussi',
          `Vos données ont été exportées. Vous pouvez copier le contenu ci-dessous :\n\n${jsonData.substring(0, 500)}...`,
          [{ text: 'OK' }],
        );
      }
    } catch (error) {
      console.error('[DataExport] Erreur:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter vos données. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textMain} />
          </TouchableOpacity>
          <Text style={styles.title}>Exporter mes données</Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={32} color={colors.primaryBlue} />
          <Text style={styles.infoTitle}>Droit d'accès (RGPD)</Text>
          <Text style={styles.infoText}>
            Vous avez le droit d'obtenir une copie de toutes les données personnelles que nous détenons à votre sujet.
            L'export inclut :
          </Text>
          <View style={styles.dataList}>
            <DataItem icon="person" text="Vos informations de profil" />
            <DataItem icon="card" text="Vos transactions" />
            <DataItem icon="gift" text="Vos récompenses" />
            <DataItem icon="storefront" text="Vos partenaires favoris" />
            <DataItem icon="pricetag" text="Vos offres utilisées" />
            <DataItem icon="heart" text="Vos dons" />
            <DataItem icon="checkmark-circle" text="Vos consentements" />
          </View>
        </View>

        <View style={styles.warningCard}>
          <Ionicons name="shield-checkmark" size={24} color="#F59E0B" />
          <Text style={styles.warningText}>
            Le fichier exporté contient des données sensibles. Assurez-vous de le stocker en sécurité et de ne pas
            le partager avec des tiers non autorisés.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.exportButton, loading && styles.exportButtonDisabled]}
          onPress={handleExport}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="download" size={24} color={colors.white} />
              <Text style={styles.exportButtonText}>Exporter mes données</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Les données seront exportées au format JSON et pourront être partagées via l'application de votre choix.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function DataItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.dataItem}>
      <Ionicons name={icon as any} size={16} color={colors.primaryBlue} />
      <Text style={styles.dataItemText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textMain,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMain,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  dataList: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dataItemText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryPurple,
    padding: spacing.md,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
