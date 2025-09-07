import React from 'react';

interface MerchPreviewProps {
  previewUrl: string;
  altText: string;
}

export const MerchPreview: React.FC<MerchPreviewProps> = ({ previewUrl, altText }) => {
  return (
    <div className="w-full max-w-md aspect-square relative select-none">
      <img
        src={previewUrl}
        alt={altText}
        className="w-full h-full object-contain rounded-xl"
      />
    </div>
  );
};