import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTerritoryFromCoords, type TerritoryKey } from '@/src/utils/territoryFromLocation';

const STORAGE_KEY = '@kashup/selected_territory';

/**
 * Retourne le territoire (département) de l'utilisateur :
 * - d'abord la valeur choisie manuellement (AsyncStorage)
 * - sinon détection par géolocalisation
 * - sinon null (l'app peut utiliser le premier territoire du partenaire)
 */
export function useUserTerritory(): {
  territory: TerritoryKey | null;
  setTerritory: (t: TerritoryKey | null) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  refreshFromLocation: () => Promise<void>;
} {
  const [territory, setTerritoryState] = useState<TerritoryKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStored = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && (stored === 'Martinique' || stored === 'Guadeloupe' || stored === 'Guyane')) {
        return stored as TerritoryKey;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const detectFromLocation = useCallback(async (): Promise<TerritoryKey | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return getTerritoryFromCoords(
        position.coords.latitude,
        position.coords.longitude
      );
    } catch {
      return null;
    }
  }, []);

  const refreshFromLocation = useCallback(async () => {
    setError(null);
    const detected = await detectFromLocation();
    if (detected) {
      setTerritoryState(detected);
      await AsyncStorage.setItem(STORAGE_KEY, detected);
    }
  }, [detectFromLocation]);

  const setTerritory = useCallback(async (t: TerritoryKey | null) => {
    if (t) {
      await AsyncStorage.setItem(STORAGE_KEY, t);
      setTerritoryState(t);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setTerritoryState(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const stored = await loadStored();
        if (cancelled) return;
        if (stored) {
          setTerritoryState(stored);
          setIsLoading(false);
          return;
        }
        const detected = await detectFromLocation();
        if (cancelled) return;
        if (detected) {
          setTerritoryState(detected);
          await AsyncStorage.setItem(STORAGE_KEY, detected);
        } else {
          setTerritoryState(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur localisation');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStored, detectFromLocation]);

  return { territory, setTerritory, isLoading, error, refreshFromLocation };
}
