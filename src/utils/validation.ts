import type { StatusTeknis, VideoMetadata } from '../types/index.ts';

export interface TechnicalValidationResult {
  status: StatusTeknis;
  reasons: string[];
  durationValid: boolean;
  aspectRatioValid: boolean;
  resolutionValid: boolean;
  codecValid: boolean;
  aspectDeviationPercent: number;
}

export const TECHNICAL_RULES = {
  minDurationSec: 29.5,
  maxDurationSec: 60.5,
  targetAspectRatio: 9 / 16, // 0.5625
  aspectRatioTolerancePercent: 1.5,
  minWidth: 720,
  minHeight: 1280,
  minAudioSampleRateKhz: 44.1,
  minAudioBitrateKbps: 128,
};

/**
 * Validasi teknis otomatis video sesuai PRD Section 6
 */
export function validateTechnicalSpecs(metadata: VideoMetadata): TechnicalValidationResult {
  const reasons: string[] = [];

  // 1. Durasi Video (30s - 60s, threshold 29.5s - 60.5s)
  const durationValid =
    metadata.duration_seconds >= TECHNICAL_RULES.minDurationSec &&
    metadata.duration_seconds <= TECHNICAL_RULES.maxDurationSec;

  if (!durationValid) {
    if (metadata.duration_seconds < TECHNICAL_RULES.minDurationSec) {
      reasons.push(
        `Durasi ${metadata.duration_seconds.toFixed(1)}s terlalu pendek (Syarat: 30-60 detik, threshold min 29.5s)`
      );
    } else {
      reasons.push(
        `Durasi ${metadata.duration_seconds.toFixed(1)}s melebihi batas (Syarat: 30-60 detik, threshold max 60.5s)`
      );
    }
  }

  // 2. Rasio Aspek 9:16 Vertical (deviasi < 1.5%)
  const ratio = metadata.aspect_ratio || (metadata.width / (metadata.height || 1));
  const deviation = Math.abs(ratio - TECHNICAL_RULES.targetAspectRatio) / TECHNICAL_RULES.targetAspectRatio;
  const aspectDeviationPercent = Math.round(deviation * 1000) / 10;
  const aspectRatioValid = deviation < TECHNICAL_RULES.aspectRatioTolerancePercent / 100;

  if (!aspectRatioValid) {
    reasons.push(
      `Rasio aspek deviasi ${aspectDeviationPercent}% dari 9:16 (Batas toleransi maksimal 1.5%)`
    );
  }

  // 3. Resolusi Min HD 720p (720 x 1280)
  // Syarat: Lebar minimal 720px dan tinggi minimal 1280px
  const shortDim = Math.min(metadata.width, metadata.height);
  const longDim = Math.max(metadata.width, metadata.height);
  const resolutionValid = shortDim >= TECHNICAL_RULES.minWidth && longDim >= TECHNICAL_RULES.minHeight;

  if (!resolutionValid) {
    reasons.push(
      `Resolusi ${metadata.width}x${metadata.height} di bawah standar minimal HD 720p (720x1280)`
    );
  }

  // 4. Codec & Audio
  const isMp4 = metadata.codec.toLowerCase().includes('h264') ||
    metadata.codec.toLowerCase().includes('hevc') ||
    metadata.codec.toLowerCase().includes('avc') ||
    metadata.codec.toLowerCase().includes('mp4');

  const audioValid =
    metadata.audio_sample_rate_khz >= 44.0 && metadata.audio_bitrate_kbps >= 96;

  const codecValid = isMp4 && audioValid;

  if (!codecValid) {
    if (!isMp4) {
      reasons.push(`Format/Codec ${metadata.codec} memerlukan konversi ke H.264 MP4 standar`);
    }
    if (!audioValid) {
      reasons.push(
        `Audio rate (${metadata.audio_sample_rate_khz}kHz / ${metadata.audio_bitrate_kbps}kbps) di bawah standar optimal (44.1kHz / 128kbps)`
      );
    }
  }

  // Determine Overall Status hierarchy:
  // RED_FLAG > LOW_QUALITY > WARNING > PASS
  let status: StatusTeknis = 'PASS';
  if (!durationValid) {
    status = 'RED_FLAG'; // Diskualifikasi Teknis
  } else if (!resolutionValid) {
    status = 'LOW_QUALITY';
  } else if (!aspectRatioValid || !codecValid) {
    status = 'WARNING';
  }

  return {
    status,
    reasons,
    durationValid,
    aspectRatioValid,
    resolutionValid,
    codecValid,
    aspectDeviationPercent,
  };
}

/**
 * Rule-01: Video yang berstatus DISKUALIFIKASI TEKNIS tidak dapat dinilai oleh dewan juri
 * kecuali jika ada manual override oleh Admin.
 */
export function canJuryScoreWork(status: StatusTeknis, isOverridden: boolean): boolean {
  if (status === 'RED_FLAG' && !isOverridden) {
    return false;
  }
  return true;
}
