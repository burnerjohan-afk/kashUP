export const videoConfig = {
  maxDurationDefault: Number(process.env.VIDEO_MAX_DURATION_DEFAULT ?? 30),
  maxDurationExtended: Number(process.env.VIDEO_MAX_DURATION_EXTENDED ?? 120),
  featurePrice: Number(process.env.VIDEO_FEATURE_PRICE ?? 0),
  durationExtensionPrice: Number(process.env.VIDEO_DURATION_EXTENSION_PRICE ?? 0),
  maxSizeMb: Number(process.env.VIDEO_MAX_SIZE_MB ?? 50),
  retentionDays: Number(process.env.VIDEO_RETENTION_DAYS ?? 30),
  autoDeleteAfterUse: (process.env.VIDEO_AUTO_DELETE_AFTER_USE ?? 'false') === 'true',
} as const;

