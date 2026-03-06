import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { colors, radius, spacing } from '../constants/theme';
import type { MainStackParamList } from '../navigation/MainStack';
import type { VoucherPayload } from '../types/vouchers';

type Nav = NativeStackNavigationProp<MainStackParamList, 'QRScan'>;

/** Vérifie si la chaîne est un JSON valide représentant un bon KashUP (VoucherPayload). */
function parseVoucherPayload(data: string): VoucherPayload | null {
  try {
    const parsed = JSON.parse(data) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'id' in parsed &&
      typeof (parsed as any).id === 'string' &&
      'partenaire' in parsed &&
      typeof (parsed as any).partenaire === 'string' &&
      'montant' in parsed &&
      typeof (parsed as any).montant === 'number'
    ) {
      const p = parsed as Record<string, unknown>;
      return {
        id: String(p.id),
        partenaire: String(p.partenaire),
        montant: Number(p.montant),
        expiration: p.expiration != null ? String(p.expiration) : undefined,
        partnerId: p.partnerId != null ? String(p.partnerId) : null,
        logoUrl: p.logoUrl != null ? String(p.logoUrl) : null,
        locationText: p.locationText != null ? String(p.locationText) : null,
        mapUrl: p.mapUrl != null ? String(p.mapUrl) : null,
      };
    }
  } catch {
    // pas du JSON ou format invalide
  }
  return null;
}

export default function QRScanScreen() {
  const navigation = useNavigation<Nav>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  const handleBarcodeScanned = useCallback(
    ({ type, data }: { type: string; data: string }) => {
      if (!scanning) return;
      setScanning(false);
      setScanned(data);

      // Bon KashUP (JSON VoucherPayload) → aller au détail du bon
      const voucher = parseVoucherPayload(data);
      if (voucher) {
        navigation.navigate('VoucherDetail', { voucher });
        return;
      }

      // Si c'est une URL, proposer de l'ouvrir
      if (data.startsWith('http://') || data.startsWith('https://')) {
        Alert.alert(
          'QR code scanné',
          data,
          [
            { text: 'Fermer', onPress: () => navigation.goBack() },
            {
              text: 'Ouvrir le lien',
              onPress: () => {
                Linking.openURL(data).catch(() => {});
                navigation.goBack();
              },
            },
          ],
          { cancelable: true }
        );
      } else {
        Alert.alert('QR code scanné', data, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    },
    [scanning, navigation]
  );

  const handleScanAgain = useCallback(() => {
    setScanned(null);
    setScanning(true);
  }, []);

  if (!permission) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.message}>Vérification des permissions…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.centered}>
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.message}>
            L’accès à la caméra est nécessaire pour scanner les QR codes.
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Autoriser la caméra</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}>
            <Text style={styles.buttonTextSecondary}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scanner un QR code</Text>
        <View style={styles.headerPlaceholder} />
      </View>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanning ? handleBarcodeScanned : undefined}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>Placez le QR code dans le cadre</Text>
      </View>
      {scanned && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.button} onPress={handleScanAgain} activeOpacity={0.8}>
            <Ionicons name="scan-outline" size={20} color={colors.white} />
            <Text style={styles.buttonText}>Scanner un autre</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  headerPlaceholder: {
    width: 36,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    pointerEvents: 'none',
  },
  frame: {
    width: 240,
    height: 240,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'transparent',
  },
  hint: {
    marginTop: spacing.xl,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  actions: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 10,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    minWidth: 200,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.greyBorder,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMain,
  },
});
