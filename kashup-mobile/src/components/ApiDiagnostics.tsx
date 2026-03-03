/**
 * Composant de diagnostic API
 * Affiche les résultats des tests de connexion API
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, spacing } from '../../constants/theme';
import { runFullDiagnostics, DiagnosticResult } from '../utils/apiDiagnostics';

export function ApiDiagnostics() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const handleRunDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    
    try {
      const diagnosticResults = await runFullDiagnostics();
      setResults(diagnosticResults);
    } catch (error) {
      console.error('Erreur lors du diagnostic:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Diagnostic API</Text>
        <Text style={styles.subtitle}>
          Testez la connexion avec le serveur backend
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, isRunning && styles.buttonDisabled]}
        onPress={handleRunDiagnostics}
        disabled={isRunning}
        activeOpacity={0.7}>
        {isRunning ? (
          <>
            <ActivityIndicator size="small" color={colors.white} />
            <Text style={styles.buttonText}>Diagnostic en cours...</Text>
          </>
        ) : (
          <Text style={styles.buttonText}>Lancer le diagnostic</Text>
        )}
      </TouchableOpacity>

      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              Résultats: {successCount}/{totalCount} tests réussis
            </Text>
          </View>

          <ScrollView style={styles.resultsList}>
            {results.map((result, index) => (
              <View
                key={index}
                style={[
                  styles.resultItem,
                  result.success ? styles.resultSuccess : styles.resultError,
                ]}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultIcon}>
                    {result.success ? '✅' : '❌'}
                  </Text>
                  <View style={styles.resultContent}>
                    <Text style={styles.resultTest}>{result.test}</Text>
                    <Text
                      style={[
                        styles.resultMessage,
                        !result.success && styles.resultMessageError,
                      ]}>
                      {result.message}
                    </Text>
                    {result.duration && (
                      <Text style={styles.resultDuration}>
                        Durée: {result.duration}ms
                      </Text>
                    )}
                  </View>
                </View>
                {result.details && __DEV__ && (
                  <Text style={styles.resultDetails}>
                    {JSON.stringify(result.details, null, 2)}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {results.length > 0 && successCount < totalCount && (
        <View style={styles.suggestions}>
          <Text style={styles.suggestionsTitle}>💡 Suggestions:</Text>
          {results.some(r => r.message.includes('Timeout')) && (
            <Text style={styles.suggestionItem}>
              • Vérifiez que le serveur backend est démarré (port 4000)
            </Text>
          )}
          {results.some(
            r => r.message.includes('refusée') || r.message.includes('ECONNREFUSED')
          ) && (
            <Text style={styles.suggestionItem}>
              • Le serveur backend n'est pas démarré. Démarrez-le avec: npm start
            </Text>
          )}
          {results.some(r => r.duration && r.duration > 3000) && (
            <Text style={styles.suggestionItem}>
              • Le serveur répond mais très lentement. Vérifiez les performances.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.white,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  button: {
    backgroundColor: colors.primaryPurple,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  resultsContainer: {
    flex: 1,
    marginTop: spacing.md,
  },
  summary: {
    backgroundColor: colors.lightPurple,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryPurple,
    textAlign: 'center',
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  resultSuccess: {
    borderColor: colors.primaryGreen,
    backgroundColor: '#F0FDF4',
  },
  resultError: {
    borderColor: '#F87171',
    backgroundColor: '#FEF2F2',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  resultIcon: {
    fontSize: 20,
  },
  resultContent: {
    flex: 1,
  },
  resultTest: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: spacing.xs / 2,
  },
  resultMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  resultMessageError: {
    color: '#B91C1C',
    fontWeight: '600',
  },
  resultDuration: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  resultDetails: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.greyLight,
    borderRadius: 4,
  },
  suggestions: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: spacing.sm,
  },
  suggestionItem: {
    fontSize: 14,
    color: '#78350F',
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
});

