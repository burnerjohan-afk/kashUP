/**
 * Composant de diagnostic API
 * Affiche l'état de la connexion API et permet de tester la connectivité
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { testApiConnection, testMultipleEndpoints, logApiConfig, type ConnectionTestResult } from '@/utils/test-api-connection';
import { API_CONFIG } from '@/config/api';
import { useAuthStore } from '@/store/auth-store';

export const ApiDiagnostic = () => {
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [multiTestResult, setMultiTestResult] = useState<{
    results: Array<ConnectionTestResult & { endpoint: string }>;
    summary: { total: number; accessible: number; failed: number };
  } | null>(null);
  const { isAuthenticated, accessToken, refreshToken, user } = useAuthStore();

  useEffect(() => {
    // Afficher la configuration au chargement
    logApiConfig();
  }, []);

  const handleSingleTest = async () => {
    setIsTesting(true);
    try {
      const result = await testApiConnection();
      setTestResult(result);
    } catch (error) {
      console.error('Erreur lors du test:', error);
      setTestResult({
        accessible: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleMultiTest = async () => {
    setIsTesting(true);
    try {
      const result = await testMultipleEndpoints();
      setMultiTestResult(result);
    } catch (error) {
      console.error('Erreur lors du test multiple:', error);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-4">🔧 Diagnostic API</h3>
        
        {/* Configuration actuelle */}
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded">
          <h4 className="font-medium mb-2">Configuration actuelle:</h4>
          <ul className="text-sm space-y-1">
            <li><strong>Base URL:</strong> {API_CONFIG.baseURL}</li>
            <li><strong>Base Origin:</strong> {API_CONFIG.baseOrigin}</li>
            <li><strong>Timeout:</strong> {API_CONFIG.timeout}ms</li>
            <li><strong>VITE_API_BASE_URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'non défini'}</li>
            <li><strong>VITE_API_URL:</strong> {import.meta.env.VITE_API_URL || 'non défini'}</li>
          </ul>
        </div>

        {/* État d'authentification */}
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded">
          <h4 className="font-medium mb-2">État d'authentification:</h4>
          <ul className="text-sm space-y-1">
            <li><strong>Authentifié:</strong> {isAuthenticated ? '✅ Oui' : '❌ Non'}</li>
            <li><strong>Access Token:</strong> {accessToken ? '✅ Présent' : '❌ Absent'}</li>
            <li><strong>Refresh Token:</strong> {refreshToken ? '✅ Présent' : '❌ Absent'}</li>
            <li><strong>Utilisateur:</strong> {user ? `✅ ${user.email}` : '❌ Aucun'}</li>
          </ul>
        </div>

        {/* Boutons de test */}
        <div className="flex gap-2 mb-4">
          <Button onClick={handleSingleTest} disabled={isTesting} variant="outline">
            {isTesting ? 'Test en cours...' : '🧪 Tester /health'}
          </Button>
          <Button onClick={handleMultiTest} disabled={isTesting} variant="outline">
            {isTesting ? 'Test en cours...' : '🧪 Tester plusieurs endpoints'}
          </Button>
        </div>

        {/* Résultat du test simple */}
        {testResult && (
          <div className={`p-3 rounded ${testResult.accessible ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
            <h4 className="font-medium mb-2">
              {testResult.accessible ? '✅ Test réussi' : '❌ Test échoué'}
            </h4>
            <ul className="text-sm space-y-1">
              {testResult.status && <li><strong>Status:</strong> {testResult.status} {testResult.statusText}</li>}
              {testResult.responseTime && <li><strong>Temps de réponse:</strong> {testResult.responseTime}ms</li>}
              {testResult.error && <li><strong>Erreur:</strong> {testResult.error}</li>}
              {testResult.details && (
                <li><strong>URL testée:</strong> {testResult.details.url}</li>
              )}
            </ul>
          </div>
        )}

        {/* Résultat du test multiple */}
        {multiTestResult && (
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <h4 className="font-medium mb-2">
              📊 Résumé: {multiTestResult.summary.accessible}/{multiTestResult.summary.total} endpoints accessibles
            </h4>
            <div className="space-y-2">
              {multiTestResult.results.map((result) => (
                <div
                  key={result.endpoint}
                  className={`p-2 rounded text-sm ${
                    result.accessible ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span><strong>{result.endpoint}</strong></span>
                    <span>{result.accessible ? '✅' : '❌'}</span>
                  </div>
                  {result.status && (
                    <div className="text-xs mt-1">
                      Status: {result.status} ({result.responseTime}ms)
                    </div>
                  )}
                  {result.error && (
                    <div className="text-xs mt-1 text-red-600 dark:text-red-400">
                      {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

