/**
 * Lecteur vidéo pour les bannières pub : télécharge la vidéo en local puis la lit.
 * Si le téléchargement échoue ou pas de cache, tente la lecture directe (streaming).
 */

import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

const CACHE_DIR = FileSystem.cacheDirectory ?? '';

type Props = {
  videoUri: string;
  bannerId: string;
  shouldPlay: boolean;
  onPlaybackStatusUpdate?: (status: { isLoaded?: boolean; didJustFinishAndNotLoop?: boolean }) => void;
  style?: object;
};

type PlaybackUri = { uri: string; isLocal: boolean };

export function AdVideoPlayer({
  videoUri,
  bannerId,
  shouldPlay,
  onPlaybackStatusUpdate,
  style,
}: Props) {
  const [playbackUri, setPlaybackUri] = useState<PlaybackUri | null>(null);
  const [loading, setLoading] = useState(true);

  const cachePath = CACHE_DIR ? `${CACHE_DIR}ad_banner_${bannerId.replace(/[^a-zA-Z0-9-_]/g, '_')}.mp4` : null;

  useEffect(() => {
    if (!videoUri) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      if (cachePath) {
        try {
          const info = await FileSystem.getInfoAsync(cachePath, { size: false });
          if (info.exists && !cancelled) {
            setPlaybackUri({ uri: cachePath, isLocal: true });
            setLoading(false);
            return;
          }
        } catch {
          // ignore
        }

        try {
          const result = await FileSystem.downloadAsync(videoUri, cachePath);
          if (cancelled) return;
          if (result.status === 200) {
            setPlaybackUri({ uri: result.uri, isLocal: true });
          } else {
            if (__DEV__) console.warn('[AdVideoPlayer] Download status', result.status, '→ fallback streaming');
            setPlaybackUri({ uri: videoUri, isLocal: false });
          }
        } catch (e) {
          if (__DEV__) console.warn('[AdVideoPlayer] Download failed', e);
          if (!cancelled) setPlaybackUri({ uri: videoUri, isLocal: false });
        } finally {
          if (!cancelled) setLoading(false);
        }
      } else {
        if (__DEV__) console.log('[AdVideoPlayer] No cache dir → streaming');
        setPlaybackUri({ uri: videoUri, isLocal: false });
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [videoUri, cachePath]);

  const handleError = () => {
    if (playbackUri?.isLocal) {
      if (__DEV__) console.warn('[AdVideoPlayer] Playback error (local), trying stream');
      setPlaybackUri({ uri: videoUri, isLocal: false });
    }
  };

  if (loading) {
    return (
      <View style={[styles.placeholder, style]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!playbackUri) {
    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons name="videocam-outline" size={40} color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <Video
      source={{ uri: playbackUri.uri }}
      style={[styles.video, style]}
      useNativeControls={false}
      shouldPlay={shouldPlay}
      isLooping={false}
      resizeMode={ResizeMode.CONTAIN}
      onPlaybackStatusUpdate={(status) => {
        if (status.isLoaded && status.didJustFinishAndNotLoop) {
          onPlaybackStatusUpdate?.(status);
        }
      }}
      onError={handleError}
    />
  );
}

const styles = StyleSheet.create({
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
});
