import React, { useEffect, Fragment } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity ${isOpen ? 'duration-300 ease-out opacity-60' : 'duration-200 ease-in opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Modal Content */}
      <div 
        className={`relative w-full max-w-lg bg-gray-800/80 backdrop-blur-2xl rounded-2xl shadow-2xl text-white p-8 transform transition-all 
          ${isOpen ? 'duration-300 ease-out scale-100 opacity-100' : 'duration-200 ease-in scale-95 opacity-0'}`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
};