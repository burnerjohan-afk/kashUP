/**
 * Aperçu et lecture de la vidéo cadeau enregistrée (Carte UP / Box UP).
 * Permet de relire la vidéo avant envoi et de la supprimer.
 */

import { Video, ResizeMode } from 'expo-av';
import React, { useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';

type Props = {
  videoUri: string;
  videoDurationSeconds?: number | null;
  onRemove: () => void;
  /** Court texte sous la vidéo, ex. "Cette vidéo sera envoyée avec votre carte." */
  sendWithLabel?: string;
};

export function GiftVideoPreview({ videoUri, videoDurationSeconds, onRemove, sendWithLabel }: Props) {
  const videoRef = useRef<Video>(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          <Text style={styles.title}>Vidéo enregistrée</Text>
          {videoDurationSeconds != null && (
            <Text style={styles.duration}>{videoDurationSeconds} s</Text>
          )}
        </View>
        <TouchableOpacity onPress={onRemove} style={styles.removeButton} hitSlop={12}>
          <Ionicons name="trash-outline" size={22} color={colors.textSecondary} />
          <Text style={styles.removeLabel}>Supprimer</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.videoWrap}>
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.video}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
        />
        <Text style={styles.replayHint}>Appuyez sur play pour revoir la vidéo</Text>
      </View>
      {sendWithLabel ? (
        <Text style={styles.sendWithLabel}>{sendWithLabel}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.greyLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.greyBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMain,
  },
  duration: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  videoWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.black,
    minHeight: 160,
  },
  video: {
    width: '100%',
    height: 200,
  },
  replayHint: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sendWithLabel: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
});
