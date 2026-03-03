/**
 * Composant d'affichage des erreurs API
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';
import { ApiError } from '../../types/api';

interface ErrorStateProps {
  error: Error | ApiError | unknown;
  onRetry?: () => void;
  title?: string;
  message?: string;
}

export default function ErrorState({ error, onRetry, title, message }: ErrorStateProps) {
  // Extraire le message d'erreur
  let errorMessage = message;
  let errorCode: string | undefined;

  if (error instanceof ApiError) {
    errorMessage = errorMessage || error.message;
    errorCode = error.code;
  } else if (error instanceof Error) {
    errorMessage = errorMessage || error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    errorMessage = errorMessage || 'Une erreur est survenue';
  }

  // Message spécifique pour les erreurs réseau
  if (errorCode === 'NETWORK_ERROR') {
    errorMessage = 'Pas de connexion réseau. Vérifiez votre connexion internet.';
  } else if (errorCode === 'TIMEOUT') {
    errorMessage = 'La requête a expiré. Veuillez réessayer.';
  }

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
      <Text style={styles.title}>{title || 'Erreur'}</Text>
      <Text style={styles.message}>{errorMessage}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh" size={20} color={colors.white} />
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMain,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryPurple,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
});

