'use client';

import FaceRecognitionCapture from '@/components/biometric/FaceRecognitionCapture';

interface FaceRecognitionAutoCaptureProps {
  onDescriptorCaptured: (descriptor: number[]) => void;
  title: string;
  description: string;
  actionLabel: string;
  noticeLabel: string;
  defaultExpanded?: boolean;
  autoCaptureCooldownMs?: number;
  autoCaptureDisabled?: boolean;
}

export default function FaceRecognitionAutoCapture({
  onDescriptorCaptured,
  title,
  description,
  actionLabel,
  noticeLabel,
  defaultExpanded = false,
  autoCaptureCooldownMs = 2000,
  autoCaptureDisabled = false
}: FaceRecognitionAutoCaptureProps) {
  return (
    <FaceRecognitionCapture
      onDescriptorCaptured={onDescriptorCaptured}
      defaultExpanded={defaultExpanded}
      title={title}
      description={description}
      actionLabel={actionLabel}
      autoCaptureOnDetect={true}
      autoCaptureCooldownMs={autoCaptureCooldownMs}
      autoCaptureDisabled={autoCaptureDisabled}
      autoCaptureNoticeLabel={noticeLabel}
    />
  );
}
