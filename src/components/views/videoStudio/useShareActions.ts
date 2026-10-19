import { useState } from 'react';
import { ShareStatus } from './constants';

/** Download and share the finished video. */
export function useShareActions({ finalVideoUrl, finalMimeType, prompt }: { finalVideoUrl: string | null; finalMimeType: string; prompt: string }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle');

  // ---------------------------------------------------------------------
  // Step 3: download / share
  // ---------------------------------------------------------------------

  const handleDownload = async () => {
    if (!finalVideoUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(finalVideoUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const extension = finalMimeType.includes('webm') ? 'webm' : 'mp4';
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `lumora-video-${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(finalVideoUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!finalVideoUrl) return;
    setShareStatus('sharing');

    try {
      const response = await fetch(finalVideoUrl);
      const blob = await response.blob();
      const extension = finalMimeType.includes('webm') ? 'webm' : 'mp4';
      const file = new File([blob], `lumora-video.${extension}`, { type: finalMimeType });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Lumora video', text: prompt });
        setShareStatus('shared');
        return;
      }
    } catch {
      // Fall through to link-based sharing (also covers the user cancelling
      // the share sheet, which throws too).
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Lumora video', text: prompt, url: finalVideoUrl });
        setShareStatus('shared');
        return;
      } catch {
        // Cancelled/unsupported - fall through to copy-link below.
      }
    }

    try {
      await navigator.clipboard.writeText(finalVideoUrl);
      setShareStatus('copied');
    } catch {
      setShareStatus('unsupported');
    }
  };

  const handleShareToFacebook = () => {
    if (!finalVideoUrl) return;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(finalVideoUrl)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  return { handleDownload, handleShare, handleShareToFacebook, isDownloading, setShareStatus, shareStatus };
}

export type ShareActions = ReturnType<typeof useShareActions>;
