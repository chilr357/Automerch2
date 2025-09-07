import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { ProductSelector } from './components/ProductSelector';
import { MerchPreview } from './components/MerchPreview';
import { ActionButtons } from './components/ActionButtons';
import { PreviousProducts } from './components/PreviousProducts';
import { Loader } from './components/Loader';
import { Modal } from './components/Modal';
import { AIProviderInfo } from './components/AIProviderInfo';
import { generateImage as generateAIImage, type AIGenerationResult } from './services/aiService';
// import { uploadBase64DataUrl } from './services/imageUploadService';
import { applyDesignToProduct } from './services/geminiService';
import { generatePrintifyMockup } from './services/printifyMockupService';
import { saveProduct } from './services/historyService';
import { generateAdfusionBatch } from './services/adfusionService';
import type { Product } from './types';
import { PRODUCTS, ANIME_KEYWORDS } from './constants';

type ModalView = 'etsy' | 'checkout' | null;
type EngineType = 'Standard' | 'Anime';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [designImage, setDesignImage] = useState<string | null>(null);
  const [merchPreviewUrl, setMerchPreviewUrl] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product>(PRODUCTS[0]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalView, setModalView] = useState<ModalView>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [detectedEngine, setDetectedEngine] = useState<EngineType>('Standard');
  const [aiResult, setAiResult] = useState<AIGenerationResult | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [manualPreviewUrl, setManualPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const promptLower = prompt.toLowerCase();
    const isAnime = ANIME_KEYWORDS.some(keyword => promptLower.includes(keyword));
    setDetectedEngine(isAnime ? 'Anime' : 'Standard');
  }, [prompt]);

  const handleApplyClick = useCallback(async () => {
    if (!designImage) {
      setError("There is no design to apply. Please generate or upload one first.");
      return;
    }

    setIsLoading(true);
    setManualPreviewUrl(null);
    setMerchPreviewUrl(null);
    setError(null);
    setLoadingMessage(`Applying design to ${selectedProduct.name}...`);

    try {
      console.debug('[Apply] Starting apply flow', { product: selectedProduct.name });
      // Use only the Printify flow (create -> update print_areas -> poll for mockup)
      const { previewUrl, productId } = await generatePrintifyMockup({
        product: selectedProduct,
        designDataUrl: designImage,
        title: `${selectedProduct.name} - ${prompt || 'Custom Design'}`,
        description: `High-quality ${selectedProduct.type} featuring a unique AI-generated design.`,
      });
      if (previewUrl) {
        setMerchPreviewUrl(previewUrl);
      }
      setOverlayUrl(null);
      // Save to history and generate adfusion mockups
      try {
        let adfusionMockups: string[] = [];
        if (previewUrl) {
          try { adfusionMockups = await generateAdfusionBatch(previewUrl); } catch {}
        }
        await saveProduct({
          productId: productId || '',
          productType: selectedProduct.type,
          title: `${selectedProduct.name} - ${prompt || 'Custom Design'}`,
          previewUrl: previewUrl || undefined,
          designUrl: designImage,
          adfusionMockups,
          blueprint_id: selectedProduct.blueprint_id,
          print_provider_id: selectedProduct.print_provider_id,
        });
      } catch (_) {}
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to apply design. ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [designImage, selectedProduct]);


  const handleGenerateClick = useCallback(async () => {
    if (!prompt) {
      setError('Please enter a prompt to generate an image.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setDesignImage(null);
    setMerchPreviewUrl(null);
    setManualPreviewUrl(null);
    setAiResult(null);
    setUploadedImageUrl(null);
    setLoadingMessage('Generating your unique design...');

    try {
      // Try the new AI service first, fallback to Gemini if needed
      try {
        const result = await generateAIImage({ prompt, provider: 'openai' });
        setAiResult(result);
        setDesignImage(result.imageUrl);
        setLoadingMessage('');
      } catch (aiError) {
        console.warn('AI service failed, falling back to Gemini:', aiError);
        // Fallback to Gemini service
        const { generateImage } = await import('./services/geminiService');
        const imageDataUrl = await generateImage(prompt, detectedEngine);
        setDesignImage(imageDataUrl);
        setLoadingMessage('');
      }
    } catch (err) {
      console.error(err);
      setError(`Failed to generate design: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [prompt]);

  const handleDownload = () => {
    const src = manualPreviewUrl || merchPreviewUrl || designImage;
    if (!src) return;
    const link = document.createElement('a');
    link.href = src;
    const productTypeName = selectedProduct.type.toLowerCase().replace(/\s+/g, '-');
    link.download = `automerch-${productTypeName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      setIsLoading(true);
      setDesignImage(null);
      setMerchPreviewUrl(null);
      setManualPreviewUrl(null);
      setError(null);
      setPrompt('');
      setAiResult(null);
      setLoadingMessage("Uploading and processing image...");

      try {
        // First, read the file for immediate preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setDesignImage(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Temporarily skip ImgBB upload
        setLoadingMessage('');
      } catch (err) {
        console.error(err);
        setError(`Failed to upload image: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  const openModal = (view: ModalView) => {
    setModalView(view);
    setIsModalOpen(true);
    if(view === 'checkout') {
      setQuantity(1);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setModalView(null), 300); // Wait for animation
  };

  const renderModalContent = () => {
    if (!merchPreviewUrl) return null;

    if (modalView === 'etsy') {
      return (
        <div>
          <img src={merchPreviewUrl} alt="Product Preview" className="rounded-lg mb-4 max-h-64 mx-auto"/>
          <h3 className="text-xl font-bold mb-4">Publish to Etsy</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">Listing Title</label>
              <input type="text" disabled className="w-full bg-gray-700/50 rounded-md p-2 mt-1" value={`${selectedProduct.name} - ${prompt || 'Custom Design'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Description</label>
              <textarea disabled className="w-full bg-gray-700/50 rounded-md p-2 mt-1 h-24" value={`High-quality ${selectedProduct.type} featuring a unique AI-generated design.`}></textarea>
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-300">Price ($)</label>
              <input type="number" disabled className="w-full bg-gray-700/50 rounded-md p-2 mt-1" value={selectedProduct.price} />
            </div>
          </div>
          <button onClick={() => {alert('Published to Etsy! (Simulation)'); closeModal();}} className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-all">Confirm & Publish</button>
        </div>
      );
    }

    if (modalView === 'checkout') {
      const totalPrice = (selectedProduct.price * quantity).toFixed(2);
      return (
        <div>
           <img src={merchPreviewUrl} alt="Product Preview" className="rounded-lg mb-4 max-h-64 mx-auto"/>
           <h3 className="text-xl font-bold mb-4 text-center">Your Order</h3>
           <div className="flex justify-between items-center mb-4">
              <p className="text-lg">{selectedProduct.name}</p>
              <p className="text-lg font-semibold">${selectedProduct.price}</p>
           </div>
           <div className="flex justify-between items-center mb-4">
              <label className="text-lg">Quantity</label>
              <div className="flex items-center gap-4 bg-gray-700/50 rounded-lg p-1">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-3 py-1 text-lg font-bold">-</button>
                <span className="text-lg w-8 text-center">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="px-3 py-1 text-lg font-bold">+</button>
              </div>
           </div>
           <hr className="border-white/20 my-4" />
           <div className="flex justify-between items-center text-2xl font-bold">
              <p>Total:</p>
              <p>${totalPrice}</p>
           </div>
           <button onClick={() => {alert('Order Placed! (Simulation)'); closeModal();}} className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-all">Proceed to Payment</button>
        </div>
      );
    }
    return null;
  }


  return (
    <>
      <div className="min-h-screen w-full bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white font-sans p-4 sm:p-8">
        <div className="container mx-auto max-w-6xl">
          <Header />
          <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <div className="flex flex-col gap-8">
              <PromptInput
                prompt={prompt}
                setPrompt={setPrompt}
                onGenerate={handleGenerateClick}
                isLoading={isLoading}
                onImageUpload={handleImageUpload}
                engine={detectedEngine}
              />
              {aiResult && (
                <AIProviderInfo result={aiResult} detectedEngine={detectedEngine} />
              )}
              <ProductSelector
                products={PRODUCTS}
                selectedProduct={selectedProduct}
                onSelectProduct={setSelectedProduct}
                onApply={handleApplyClick}
                applyDisabled={!designImage || isLoading}
              />
              {error && (
                  <div className="bg-red-500/50 border border-red-700 text-white p-4 rounded-lg text-center">
                    <p><strong>Error:</strong> {error}</p>
                  </div>
                )}
            </div>
            <div className="flex flex-col gap-8">
              {manualPreviewUrl && (
                <div className="flex justify-end -mb-2">
                  <button
                    onClick={() => setManualPreviewUrl(null)}
                    className="text-xs underline opacity-80 hover:opacity-100"
                  >
                    Back to generated
                  </button>
                </div>
              )}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl h-full flex items-center justify-center min-h-[400px] lg:min-h-0">
                {(() => {
                  if (isLoading) return <Loader message={loadingMessage} />;
                  const basePreview = manualPreviewUrl || merchPreviewUrl || designImage || null;
                  const overlayForPreview = null; // disable combining when a previous product is clicked
                  if (basePreview) {
                    const alt = merchPreviewUrl
                      ? `${selectedProduct.name} with custom design`
                      : (prompt || 'Uploaded custom design');
                    return (
                      <MerchPreview
                        previewUrl={basePreview}
                        altText={alt}
                        overlayUrl={overlayForPreview}
                      />
                    );
                  }
                  return (
                    <div className="text-center text-white/70">
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-4 text-lg">Your generated merch will appear here</p>
                      <p className="text-sm">Enter a prompt and click "Generate" to start</p>
                    </div>
                  );
                })()}
              </div>
              <PreviousProducts onSelect={(url) => { setManualPreviewUrl(url); setOverlayUrl(null); }} />
              {merchPreviewUrl && !isLoading && (
                <ActionButtons 
                  onDownload={handleDownload} 
                  onPublish={() => openModal('etsy')}
                  onCheckout={() => openModal('checkout')}
                />
              )}
            </div>
          </main>
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        {renderModalContent()}
      </Modal>
    </>
  );
};

export default App;