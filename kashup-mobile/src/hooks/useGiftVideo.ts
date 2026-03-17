import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';

export type VideoDurationOption = 'default' | 'extended';

export type UseGiftVideoOptions = {
  /** Appelé quand une vidéo a été enregistrée ou choisie (feedback utilisateur) */
  onVideoRecorded?: () => void;
};

export function useGiftVideo(options?: UseGiftVideoOptions) {
  const { onVideoRecorded } = options ?? {};
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | null>(null);
  const [videoDurationOption, setVideoDurationOption] = useState<VideoDurationOption>('default');
  const [consentAccepted, setConsentAccepted] = useState(false);

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    setVideoUri(asset.uri);
    setVideoDurationSeconds(typeof asset.duration === 'number' ? Math.round(asset.duration) : null);
    onVideoRecorded?.();
  };

  const recordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    setVideoUri(asset.uri);
    setVideoDurationSeconds(typeof asset.duration === 'number' ? Math.round(asset.duration) : null);
    onVideoRecorded?.();
  };

  const clearVideo = () => {
    setVideoUri(null);
    setVideoDurationSeconds(null);
    setVideoDurationOption('default');
    setConsentAccepted(false);
  };

  return {
    videoUri,
    videoDurationSeconds,
    videoDurationOption,
    setVideoDurationOption,
    consentAccepted,
    setConsentAccepted,
    pickVideo,
    recordVideo,
    clearVideo,
    hasVideo: !!videoUri,
  };
}

