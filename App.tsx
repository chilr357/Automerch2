import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { ProductSelector } from './components/ProductSelector';
import { MerchPreview } from './components/MerchPreview';
import { ActionButtons } from './components/ActionButtons';
import { PreviousProducts } from './components/PreviousProducts';
import { Loader } from './components/Loader';
import { Modal } from './components/Modal';
import { AIProviderSelector, type ProviderOption } from './components/AIProviderSelector';
import { generateImage as generateAIImage, type AIGenerationResult, type AIProvider } from './services/aiService';
// import { uploadBase64DataUrl } from './services/imageUploadService';
import { applyDesignToProduct } from './services/geminiService';
import { generatePrintifyMockup } from './services/printifyMockupService';
import { saveProduct, updateProduct as updateHistoryProduct } from './services/historyService';
import { generateAdfusionBatch } from './services/adfusionService';
import { generateVideosFromStills, generatePhoneCommercial } from './services/videoAdService';
import { buildListingContent, type ListingContent } from './services/aiContentService';
import { publishListing, type PublishResult } from './services/etsyApiService';
import type { Product } from './types';
import { PRODUCTS, ANIME_KEYWORDS } from './constants';
import { IntegrationRoadmap } from './components/IntegrationRoadmap';
import AdfusionUploader from './components/AdfusionUploader';

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
  const [perplexityOutput, setPerplexityOutput] = useState<string | null>(null);
  const [listingContent, setListingContent] = useState<ListingContent | null>(null);
  const [isGeneratingListingContent, setIsGeneratingListingContent] = useState<boolean>(false);
  const [listingContentError, setListingContentError] = useState<string | null>(null);
  const [isPublishingListing, setIsPublishingListing] = useState<boolean>(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [publishStatusMessage, setPublishStatusMessage] = useState<string | null>(null);
  const [adfusionVideos, setAdfusionVideos] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<'auto' | AIProvider>(() => {
    try {
      const envDefault = (import.meta as any).env?.VITE_DEFAULT_AI_PROVIDER as AIProvider | undefined;
      return envDefault || 'auto';
    } catch {
      return 'auto';
    }
  });

  const providerCapabilities = useMemo(() => {
    try {
      const env = (import.meta as any).env || {};
      return {
        hasOpenAI: Boolean(env.VITE_OPENAI_API_KEY),
        hasMidjourney: Boolean(env.VITE_MIDJOURNEY_API_KEY),
        hasGemini: Boolean(env.VITE_GEMINI_API_KEY || env.API_KEY),
        hasGrok: Boolean(env.VITE_GROK_API_KEY),
        hasPerplexity: Boolean(env.VITE_PERPLEXITY_API_KEY),
      };
    } catch {
      return { hasOpenAI: false, hasMidjourney: false, hasGemini: false, hasGrok: false, hasPerplexity: false };
    }
  }, []);

  const { hasOpenAI, hasMidjourney, hasGemini, hasGrok, hasPerplexity } = providerCapabilities;

  const handleInspirationSelected = useCallback((_: string) => {
    if (hasMidjourney) {
      setSelectedProvider('midjourney');
    }
  }, [hasMidjourney]);
  useEffect(() => {
    if (selectedProvider === 'auto') return;
    const availabilityMap: Record<AIProvider, boolean> = {
      openai: hasOpenAI,
      midjourney: hasMidjourney,
      grok: hasGrok,
      gemini: hasGemini,
      perplexity: hasPerplexity,
    };
    if (!availabilityMap[selectedProvider]) {
      setSelectedProvider('auto');
    }
  }, [selectedProvider, hasOpenAI, hasMidjourney, hasGemini, hasGrok, hasPerplexity]);

  useEffect(() => {
    if (isLoading) return;
    if (!selectedProduct) return;
    const hasContext = Boolean((prompt && prompt.trim()) || designImage || uploadedImageUrl || merchPreviewUrl);
    if (!hasContext) {
      setListingContent(null);
      return;
    }

    let cancelled = false;
    setIsGeneratingListingContent(true);
    setListingContentError(null);

    (async () => {
      try {
        const content = await buildListingContent({
          product: selectedProduct,
          prompt: prompt?.trim() || selectedProduct.name,
          mockupUrl: merchPreviewUrl || designImage || uploadedImageUrl || undefined,
        });
        if (!cancelled) {
          setListingContent(content);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to prepare listing content.';
          setListingContentError(message);
          setListingContent(null);
        }
      } finally {
        if (!cancelled) {
          setIsGeneratingListingContent(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedProduct, prompt, merchPreviewUrl, designImage, uploadedImageUrl, isLoading]);

  const providerOptions = useMemo<ProviderOption[]>(() => [
    {
      id: 'auto',
      name: 'Automatic',
      description: 'Let AutoMerch route your prompt to the best available provider.',
      icon: '✨',
      helperText: 'Great default if you are unsure which API to use.',
    },
    {
      id: 'openai',
      name: 'OpenAI DALL·E 3',
      description: 'High-quality generation for most designs.',
      icon: '🎨',
      disabled: !hasOpenAI,
      disabledReason: 'Add VITE_OPENAI_API_KEY to enable this option.',
    },
    {
      id: 'midjourney',
      name: 'Midjourney Niji',
      description: 'Specialized anime & manga styling.',
      icon: '🎌',
      helperText: 'Great for anime prompts when you want full control.',
      disabled: !hasMidjourney,
      disabledReason: 'Add VITE_MIDJOURNEY_API_KEY to enable this option.',
    },
    {
      id: 'grok',
      name: 'Grok',
      description: 'Alternative provider with OpenAI-compatible API.',
      icon: '🪐',
      disabled: !hasGrok,
      disabledReason: 'Add VITE_GROK_API_KEY to enable this option.',
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'Reliable fallback option with good quality.',
      icon: '🤖',
      disabled: !hasGemini,
      disabledReason: 'Add VITE_GEMINI_API_KEY to enable this option.',
    },
    {
      id: 'perplexity',
      name: 'Perplexity Research',
      description: 'Fetch real anime scene references with timestamps and screenshots.',
      icon: '📺',
      helperText: 'Returns JSON data instead of generated art.',
      disabled: !hasPerplexity,
      disabledReason: 'Add VITE_PERPLEXITY_API_KEY to enable this option.',
    },
  ], [hasOpenAI, hasMidjourney, hasGrok, hasGemini, hasPerplexity]);

  const adfusionIntegrationEnabled = useMemo(() => {
    try {
      const flag = (import.meta as any).env?.VITE_ENABLE_ADFUSION_INTEGRATION;
      if (typeof flag === 'string') {
        const normalized = flag.trim().toLowerCase();
        return normalized === '1' || normalized === 'true';
      }
    } catch {}
    return false;
  }, []);

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
      // Save to history and generate Adfusion mockups
      try {
        const adfusionResult = previewUrl
          ? await generateAdfusionBatch(previewUrl, selectedProduct.type)
          : null;

        const integrationAssets = adfusionResult
          ? [...(adfusionResult.stills || []), ...(adfusionResult.videos || [])]
          : [];
        if (adfusionResult?.videos?.length) {
          setAdfusionVideos((prev) => Array.from(new Set([...prev, ...adfusionResult.videos!])));
        }

        const dedupeAssets = (values: string[]): string[] => {
          const map = new Map<string, string>();
          values.forEach((value) => {
            if (!value) return;
            const key = value.startsWith('data:') ? value.slice(0, 120) : value;
            if (!map.has(key)) {
              map.set(key, value);
            }
          });
          return Array.from(map.values());
        };

        const combinedAssets = dedupeAssets([...integrationAssets, ...adfusionVideos]);

        const saved = await saveProduct({
          productId: productId || '',
          productType: selectedProduct.type,
          title: `${selectedProduct.name} - ${prompt || 'Custom Design'}`,
          previewUrl: previewUrl || undefined,
          designUrl: designImage,
          adfusionMockups: combinedAssets,
          blueprint_id: selectedProduct.blueprint_id,
          print_provider_id: selectedProduct.print_provider_id,
        });

        const hasVideoAsset = combinedAssets.some((asset) =>
          /^data:video\//i.test(asset) || /\.(mp4|webm)(?:\?.*)?$/i.test(asset),
        );

        if (previewUrl && saved?.id) {
          (async () => {
            try {
              const enableVideos = (() => {
                try {
                  const v = (import.meta as any).env?.VITE_ENABLE_VIDEO_ADS;
                  return v === '1' || String(v).toLowerCase() === 'true';
                } catch {
                  return false;
                }
              })();
              if (enableVideos && !hasVideoAsset) {
                let videos: string[] = [];
                if (selectedProduct.type === 'Phone Case') {
                  try {
                    const phoneVideo = await generatePhoneCommercial(previewUrl);
                    if (phoneVideo) videos = [phoneVideo];
                  } catch {}
                } else {
                  const imageAssets = combinedAssets.filter((asset) =>
                    !(/^data:video\//i.test(asset) || /\.(mp4|webm)(?:\?.*)?$/i.test(asset)),
                  );
                  const fashionStill = imageAssets[0];
                  const chicStill = imageAssets[1];
                  videos = await generateVideosFromStills(fashionStill, chicStill);
                }
                if (videos.length) {
                  const updatedAssets = dedupeAssets([...combinedAssets, ...videos]);
                  await updateHistoryProduct(saved.id, { adfusionMockups: updatedAssets });
                  setAdfusionVideos((prev) => Array.from(new Set([...prev, ...videos])));
                }
              }
            } catch {}
          })();
        }
      } catch (integrationError) {
        console.warn('Adfusion integration failed, falling back to legacy mockups', integrationError);
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to apply design. ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [adfusionVideos, designImage, prompt, selectedProduct]);


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
    setPerplexityOutput(null);
    setUploadedImageUrl(null);
    setAdfusionVideos([]);
    setListingContent(null);
    setListingContentError(null);
    setLoadingMessage('Generating your unique design...');

    try {
      // Try the new AI service first, fallback to Gemini if needed
      try {
        const provider = selectedProvider === 'auto' ? undefined : selectedProvider;
        const result = await generateAIImage({ prompt, provider, size: '1024x1024', quality: 'hd', style: 'vivid' });
        setAiResult(result);
        if (result.provider === 'perplexity') {
          const raw = result.data || '[]';
          setPerplexityOutput(raw);
          try {
            type PerplexityScene = {
              anime_title?: string;
              scene_name?: string;
              description?: string;
              screenshot?: string;
              screenshot_source?: string;
              video_url?: string;
              timestamp?: string;
              manual_review?: boolean;
            };
            const scenes = JSON.parse(raw) as PerplexityScene[];
            const trustedHosts = ['crunchyroll.com','www.crunchyroll.com','funimation.com','www.funimation.com','hulu.com','www.hulu.com','netflix.com','www.netflix.com','disneyplus.com','www.disneyplus.com','primevideo.com','www.primevideo.com','amazon.com','www.amazon.com','toei-animation.com','www.toei-animation.com','aniplex.co.jp','www.aniplex.co.jp','aniplex.jp','viz.com','www.viz.com','fandom.com','www.fandom.com','hero.wikia.com','static.wikia.nocookie.net','myanimelist.net','wallpaperaccess.com','wallpapercave.com','anime-pictures.net','imgur.com','i.imgur.com','youtube.com','www.youtube.com','m.youtube.com','youtu.be'];

            const fallback = scenes.find((scene) => {
              if (typeof scene?.screenshot !== 'string') return false;
              const value = scene.screenshot.trim();
              if (value.startsWith('data:image/')) return true;
              const source = typeof scene?.screenshot_source === 'string' ? scene.screenshot_source : scene?.video_url;
              if (!source) return false;
              try {
                const { hostname } = new URL(source);
                return trustedHosts.includes(hostname.toLowerCase());
              } catch {
                return false;
              }
            });

            if (fallback?.screenshot) {
              setDesignImage(fallback.screenshot);
            } else {
              const searchTarget = scenes.find((scene) => !scene.manual_review);
              if (searchTarget) {
                try {
                  setLoadingMessage('Searching reference still...');
                  const queryParts = [
                    searchTarget.anime_title,
                    searchTarget.scene_name,
                    searchTarget.description,
                  ].filter(Boolean);
                  const resp = await fetch('/api/image-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: queryParts.join(' ') }),
                  });
                  if (!resp.ok) throw new Error(`image search failed (${resp.status})`);
                  const payload = await resp.json();
                  const first = Array.isArray(payload?.results) ? payload.results.find((r) => typeof r?.url === 'string') : null;
                  setDesignImage(first?.url || null);
                } catch (searchErr) {
                  console.warn('Image search fallback failed', searchErr);
                  setDesignImage(null);
                } finally {
                  setLoadingMessage('');
                }
              } else {
                setDesignImage(null);
              }
            }
          } catch (err) {
            console.warn('Failed to parse Perplexity JSON for preview', err);
            setDesignImage(null);
          }
        } else {
          setDesignImage(result.imageUrl);
        }
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
  }, [prompt, detectedEngine, selectedProvider]);

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

  const handlePerplexityDownload = useCallback(() => {
    if (!perplexityOutput) return;
    const blob = new Blob([perplexityOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'perplexity-anime-scenes.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [perplexityOutput]);

  const handlePerplexityCopy = useCallback(async () => {
    if (!perplexityOutput || !navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(perplexityOutput);
    } catch (err) {
      console.warn('Failed to copy Perplexity output', err);
    }
  }, [perplexityOutput]);

  const handleAdfusionVideosImported = useCallback((videos: string[]) => {
    if (!Array.isArray(videos) || !videos.length) return;
    setAdfusionVideos((prev) => Array.from(new Set([...prev, ...videos])));
    console.log('Imported Adfusion videos:', videos);
  }, []);

  const handlePublishToEtsy = useCallback(async () => {
    if (!listingContent) {
      setPublishStatusMessage('Listing content is still preparing. Try again in a moment.');
      return;
    }
    if (!merchPreviewUrl) {
      setPublishStatusMessage('Generate a product mockup before publishing to Etsy.');
      return;
    }

    setIsPublishingListing(true);
    setPublishStatusMessage(null);

    try {
      const result = await publishListing({
        title: listingContent.title,
        description: listingContent.description,
        tags: listingContent.tags,
        product: selectedProduct,
        previewUrl: merchPreviewUrl,
        designUrl: designImage || uploadedImageUrl,
        price: selectedProduct.price,
        quantity,
      });
      setPublishResult(result);
      const message = result.source === 'etsy'
        ? `Listing published to Etsy (ID: ${result.listingId}).`
        : 'Simulated Etsy draft created. Connect Etsy API credentials to auto-publish.';
      setPublishStatusMessage(message);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish listing to Etsy.';
      setPublishStatusMessage(message);
      console.error('Publish to Etsy failed', err);
    } finally {
      setIsPublishingListing(false);
    }
  }, [listingContent, merchPreviewUrl, selectedProduct, designImage, uploadedImageUrl, quantity]);

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
      setPerplexityOutput(null);
      setAdfusionVideos([]);
      setListingContent(null);
      setListingContentError(null);
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
    } else if (view === 'etsy') {
      setPublishStatusMessage(null);
      setPublishResult(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setModalView(null), 300); // Wait for animation
  };

  const renderModalContent = () => {
    if (!merchPreviewUrl) return null;

    if (modalView === 'etsy') {
      const title = listingContent?.title || `${selectedProduct.name} - ${prompt || 'Custom Design'}`;
      const description = listingContent?.description || `High-quality ${selectedProduct.type} featuring a unique AI-generated design.`;
      const tags = listingContent?.tags || [];
      return (
        <div>
          <img src={merchPreviewUrl} alt="Product Preview" className="rounded-lg mb-4 max-h-64 mx-auto"/>
          <h3 className="text-xl font-bold mb-4">Publish to Etsy</h3>
          {isGeneratingListingContent && (
            <div className="mb-3 text-sm text-white/70">Generating SEO-optimized listing content...</div>
          )}
          {listingContentError && (
            <div className="mb-3 text-sm text-red-300">{listingContentError}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">Listing Title</label>
              <input type="text" disabled className="w-full bg-gray-700/50 rounded-md p-2 mt-1" value={title} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Description</label>
              <textarea disabled className="w-full bg-gray-700/50 rounded-md p-2 mt-1 h-32" value={description}></textarea>
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-300">Price ($)</label>
              <input type="number" disabled className="w-full bg-gray-700/50 rounded-md p-2 mt-1" value={selectedProduct.price} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Tags</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {tags.length ? (
                  tags.map(tag => (
                    <span key={tag} className="text-xs bg-white/10 px-2 py-1 rounded-full border border-white/20">{tag}</span>
                  ))
                ) : (
                  <span className="text-xs text-white/60">Tags will appear once content is ready.</span>
                )}
              </div>
            </div>
          </div>
          {publishStatusMessage && (
            <div className={`mt-4 text-sm ${publishStatusMessage.toLowerCase().includes('fail') ? 'text-red-300' : 'text-emerald-200'}`}>
              {publishStatusMessage}
              {publishResult?.url && (
                <div className="mt-1"><a href={publishResult.url} target="_blank" rel="noreferrer" className="underline">View listing</a></div>
              )}
            </div>
          )}
          <button
            onClick={handlePublishToEtsy}
            disabled={isPublishingListing || isGeneratingListingContent}
            className={`w-full mt-6 text-white font-bold py-3 px-4 rounded-lg transition-all ${isPublishingListing || isGeneratingListingContent ? 'bg-orange-500/60 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'}`}
          >
            {isPublishingListing ? 'Publishing…' : 'Confirm & Publish'}
          </button>
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
                onInspirationSelected={handleInspirationSelected}
              />
              {perplexityOutput && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">Perplexity Anime Scene Dataset</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handlePerplexityCopy}
                        className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs transition"
                      >
                        Copy JSON
                      </button>
                      <button
                        onClick={handlePerplexityDownload}
                        className="px-3 py-1 rounded-full bg-pink-500/80 hover:bg-pink-500 text-xs transition"
                      >
                        Download JSON
                      </button>
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-xl p-3 max-h-72 overflow-auto text-left text-xs font-mono whitespace-pre-wrap">
                    {perplexityOutput}
                  </div>
                  <p className="text-xs text-white/70">
                    This response lists verified streaming links, timestamps, and screenshot references for the top 100 anime action scenes.
                  </p>
                </div>
              )}
              <AIProviderSelector
                options={providerOptions}
                selected={selectedProvider}
                onSelect={setSelectedProvider}
                isLoading={isLoading}
                lastResult={aiResult}
                detectedEngine={detectedEngine}
              />
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
              {adfusionIntegrationEnabled && (
                <div className="mt-6">
                  <AdfusionUploader
                    designImage={designImage || merchPreviewUrl}
                    onVideosImported={handleAdfusionVideosImported}
                  />
                </div>
              )}
            </div>
          </main>
        </div>
        <div className="container mx-auto max-w-6xl mt-10">
          <IntegrationRoadmap />
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        {renderModalContent()}
      </Modal>
    </>
  );
};

export default App;
