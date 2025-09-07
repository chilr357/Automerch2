import React from 'react';

interface MerchPreviewProps {
  previewUrl: string;
  altText: string;
  overlayUrl?: string | null;
}

export const MerchPreview: React.FC<MerchPreviewProps> = ({ previewUrl, altText, overlayUrl }) => {
  return (
    <div className="w-full max-w-md aspect-square relative select-none">
      <img
        src={previewUrl}
        alt={altText}
        className="w-full h-full object-contain rounded-xl"
      />
      {overlayUrl && (
        <img
          src={overlayUrl}
          alt="Overlay"
          className="absolute inset-0 w-full h-full object-contain rounded-xl pointer-events-none opacity-70"
        />
      )}
    </div>
  );
};