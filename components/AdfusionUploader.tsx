import React, { useState } from 'react';
import { uploadToAdfusion } from '../services/adfusionIntegrationService';

interface AdfusionUploaderProps {
  designImage: string | null;
  onVideosImported: (videos: string[]) => void;
}

const ADFUSION_ORIGIN = 'https://adfusion-ai-893514041849.us-west1.run.app';

const AdfusionUploader: React.FC<AdfusionUploaderProps> = ({ designImage, onVideosImported }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleOpenAdfusion = async () => {
    if (!designImage || isUploading) return;

    setIsUploading(true);

    try {
      const result = await uploadToAdfusion(designImage);
      if (!result.success || !result.imageId) {
        throw new Error(result.error || 'Upload failed');
      }

      const adfusionWindow = window.open(
        `${ADFUSION_ORIGIN}/?imageId=${encodeURIComponent(result.imageId)}`,
        '_blank',
        'width=1200,height=800,noopener,noreferrer',
      );

      if (!adfusionWindow) {
        throw new Error('Popup blocked. Enable popups for this site.');
      }

      const messageListener = (event: MessageEvent) => {
        if (event.origin !== ADFUSION_ORIGIN) return;
        const payload = event.data;
        if (payload?.type === 'ADFUSION_COMPLETE' && Array.isArray(payload?.videos)) {
          onVideosImported(payload.videos);
          try {
            adfusionWindow.close();
          } catch {}
          window.removeEventListener('message', messageListener);
        }
      };

      window.addEventListener('message', messageListener);
    } catch (error) {
      console.error('Failed to open Adfusion:', error);
      alert('Failed to open Adfusion. Please try manual upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !files.length) return;

    const urls: string[] = [];
    Array.from<File>(files as ArrayLike<File>).forEach((file) => {
      if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        urls.push(url);
      }
    });

    if (urls.length) {
      onVideosImported(urls);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
      <h4 className="text-lg font-semibold text-white mb-4">🎬 Adfusion AI Integration</h4>

      <div className="space-y-3">
        <button
          onClick={handleOpenAdfusion}
          disabled={!designImage || isUploading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all"
        >
          {isUploading ? 'Uploading to Adfusion…' : '🚀 Open in Adfusion AI'}
        </button>

        <div>
          <label className="block text-sm text-white/80 mb-2">Or import Adfusion videos manually:</label>
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={handleFileImport}
            className="w-full text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/20 file:text-white hover:file:bg-white/30"
          />
        </div>

        <a
          href={`${ADFUSION_ORIGIN}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-white/20 text-white py-2 px-4 rounded-lg hover:bg-white/30 transition-colors text-sm"
        >
          🔗 Open Adfusion AI Manually
        </a>
      </div>
    </div>
  );
};

export default AdfusionUploader;
