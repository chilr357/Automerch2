import type { Product } from './types';

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Classic T-Shirt',
    type: 'T-Shirt',
    price: 29.99,
    mockupUrl: 'https://images.printify.com/mockup-catalog/blueprint-5.png',
    blueprint_id: 5, // Unisex Cotton Crew Tee
    print_provider_id: 99, // Printify Choice (broad availability across shops)
    // @ts-ignore
    default_variant_id: 17391, // Heather Grey / S (Printify Choice)
    printAreaPosition: 'front',
  },
  {
    id: 2,
    name: 'Cozy Hoodie',
    type: 'Hoodie',
    price: 49.99,
    mockupUrl: 'https://images.printify.com/mockup-catalog/blueprint-1908.png',
    blueprint_id: 1908, // Pigment-Dyed Hoodie (per Merchable mapping)
    print_provider_id: 410, // Printful
    // @ts-ignore
    default_variant_id: 1,
    printAreaPosition: 'large_center_embroidery',
  },
  {
    id: 3,
    name: 'Coffee Mug',
    type: 'Mug',
    price: 19.99,
    mockupUrl: 'https://images.printify.com/mockup-catalog/blueprint-68.png',
    blueprint_id: 68, // Mug 11oz
    print_provider_id: 1, // SPOKE Custom Products
    // @ts-ignore
    default_variant_id: 33719, // 11oz
    printAreaPosition: 'front',
  },
  {
    id: 4,
    name: 'Phone Case',
    type: 'Phone Case',
    price: 24.99,
    mockupUrl: 'https://images.printify.com/mockup-catalog/blueprint-1273.png',
    blueprint_id: 1273, // iPhone Cases
    print_provider_id: 88,
    // @ts-ignore
    default_variant_id: 96135,
    printAreaPosition: 'front',
  },
  {
    id: 5,
    name: 'Tote Bag',
    type: 'Tote Bag',
    price: 22.99,
    mockupUrl: 'https://images.printify.com/mockup-catalog/blueprint-326.png',
    blueprint_id: 326, // Weekender Tote (matches Vibrant Rose Tote Bag)
    print_provider_id: 10, // MWW On Demand
    // @ts-ignore
    default_variant_id: 44271, // 24" × 13" default
    printAreaPosition: 'front',
  },
  {
    id: 6,
    name: 'Matte Poster',
    type: 'Poster',
    price: 14.99,
    mockupUrl: 'https://images.printify.com/mockup-catalog/blueprint-282.png',
    blueprint_id: 282, // Matte Vertical Posters
    print_provider_id: 2, // Sensaria
    // @ts-ignore
    default_variant_id: 43135, // 11" x 14" / Matte
    printAreaPosition: 'front',
  },
  {
    id: 7,
    name: 'Stretched Canvas',
    type: 'Canvas',
    price: 39.99,
    mockupUrl: 'https://images.printify.com/mockup-catalog/blueprint-555.png',
    blueprint_id: 555, // Stretched Canvas
    print_provider_id: 69, // Prodigi
    // @ts-ignore
    default_variant_id: 1,
    printAreaPosition: 'front',
  },
  {
    id: 8,
    name: 'Sherpa Blanket',
    type: 'Blanket',
    price: 49.99,
    mockupUrl: 'https://images.printify.com/mockup-catalog/blueprint-238.png',
    blueprint_id: 238, // Sherpa Fleece Blanket
    print_provider_id: 10, // MWW On Demand
    // @ts-ignore
    default_variant_id: 41656, // 50 x 60
    printAreaPosition: 'front',
  },
  {
    id: 9,
    name: 'Square Pillow',
    type: 'Pillow',
    price: 24.99,
    mockupUrl: 'https://images.printify.com/mockup-catalog/blueprint-220.png',
    blueprint_id: 220, // Spun Polyester Square Pillow
    print_provider_id: 10, // MWW On Demand
    // @ts-ignore
    default_variant_id: 41527, // 18 x 18
    printAreaPosition: 'front',
  },
  {
    id: 10,
    name: 'Die-Cut Stickers',
    type: 'Sticker',
    price: 4.99,
    mockupUrl: 'https://images.printify.com/mockup-catalog/blueprint-600.png',
    blueprint_id: 600, // Die-Cut Stickers
    print_provider_id: 73, // Printed Simply
    // @ts-ignore
    default_variant_id: 72007, // 3" x 3"
    printAreaPosition: 'front',
  },
  {
    id: 11,
    name: 'Hardcover Journal',
    type: 'Journal',
    price: 16.99,
    mockupUrl: 'https://images.printify.com/mockup-catalog/blueprint-485.png',
    blueprint_id: 485, // Hardcover Journal Matte
    print_provider_id: 28, // District Photo
    // @ts-ignore
    default_variant_id: 65223, // Journal
    printAreaPosition: 'front',
  },
];

export const INSPIRATION_PROMPTS: string[] = [
    "Anime-inspired poster of Monkey D. Luffy stretching Gum-Gum arms toward the horizon, blazing sunset palette, bold manga speed lines.",
    "Elegant illustration of Levi Ackerman mid-spin with twin blades, ODM trails slicing the air, moody grayscale with crimson accents.",
    "Serene portrait of Hinata Hyuga channeling gentle fist chakra, Byakugan glow, lavender petals swirling softly.",
    "Dynamic street battle of Ichigo Kurosaki unleashing Bankai Tensa Zangetsu, inky spirit energy swirling like storm clouds.",
    "Heroic Sailor Moon transformation frame, radiant moonlight beams, sparkling pastel gradients and ribboned motion.",
    "Neo-noir city alley with Spike Spiegel leaning on the Swordfish II, neon reflections, cigarette smoke drifting.",
    "Whimsical ramen shop vignette of Naruto Uzumaki devouring noodles, steam hearts and warm nostalgic lighting.",
    "Gritty battlefield tableau of Guts wielding Dragonslayer, embers flying, painterly dark fantasy brushwork.",
    "Mystic shrine scene of Inuyasha and Kagome under moonlit wisteria, soft watercolor glow.",
    "High-energy arena shot of Ryuko Matoi activating Senketsu, explosive red slashes and bold anime typography.",
    "Dreamy celestial spread of Cardcaptor Sakura floating with Clow Cards, iridescent clouds and sparkling magic aura.",
    "Stoic samurai stance of Roronoa Zoro honing swords beneath falling sakura, teal rim lighting.",
    "Festival night featuring Tanjiro Kamado performing Water Breathing, waves rendered in ukiyo-e style.",
    "Futuristic skyline with Motoko Kusanagi phasing via thermoptic camouflage, glitch art overlays and holographic signage.",
    "Cozy café moment of Tohru Honda serving tea to the Sohma family, warm ambient bokeh and gentle smiles.",
    "Electrifying chase of Killua Zoldyck in Godspeed mode, lavender lightning arcs and kinetic speed lines.",
    "Classical oil-style painting of Edward Elric transmuting a suit of armor, golden alchemical runes circling.",
    "Pastel rooftop dreamscape of Usagi Tsukino and Chibiusa stargazing, constellations shaped like Sailor Guardians.",
    "Intense martial arts close-up of Yuji Itadori unleashing Black Flash, gritty red-black energy burst.",
    "Romantic twilight walk of Howl and Sophie beside the moving castle port, lantern-lit painterly hues.",
];

export const ANIME_KEYWORDS: string[] = [
    'anime', 'manga', 'otaku', 'kawaii', 'chibi', 'moe', 'waifu', 'husbando',
    'shoujo', 'shounen', 'seinen', 'josei', 'mecha', 'magical girl',
    'ninja', 'samurai', 'yokai', 'japanese', 'tokyo', 'kyoto',
    'school uniform', 'kimono', 'yukata', 'cherry blossom',
    'character', 'protagonist', 'hero', 'heroine', 'villain',
    'tsundere', 'yandere', 'dandere', 'kuudere', 'isekai', 'senpai', 'kouhai',
    'luffy', 'ackerman', 'levi', 'hinata', 'kurosaki', 'sailor moon', 'usagi',
    'spike spiegel', 'naruto', 'guts', 'inuyasha', 'kagome', 'ryuko', 'matoi',
    'cardcaptor', 'sakura', 'clow card', 'roronoa', 'zoro', 'tanjiro', 'kamado',
    'motoko', 'kusanagi', 'tohru', 'sohma', 'killua', 'zoldyck', 'edward elric',
    'elric', 'chibiusa', 'itadori', 'yuji', 'howl', 'sophie', 'studio ghibli'
];


export const DAILY_PROMPT_COUNT = 5;
