import type { Product } from './types';

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Classic T-Shirt',
    type: 'T-Shirt',
    price: 29.99,
    mockupUrl: 'https://images.printify.com/mockup-catalog/blueprint-5.png',
    blueprint_id: 5, // Unisex Cotton Crew Tee (per Merchable)
    print_provider_id: 42, // Drive Fulfillment (per Merchable)
    // Add default known variant id if available (example)
    // For Drive Fulfillment T-Shirt, you may need to replace this with an exact variant id
    // that exists for your shop. We will also dynamically fetch when needed.
    // @ts-ignore
    default_variant_id: 4012,
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
    mockupUrl: 'https://images.printify.com/mockup-catalog/blueprint-1389.png',
    blueprint_id: 1389, // Tote Bag (AOP)
    print_provider_id: 10, // MWW On Demand
    // @ts-ignore
    default_variant_id: 103600, // 16" x 16" / Black (sample good default)
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
    "A majestic wolf howling at a galaxy moon",
    "A vibrant chameleon made of geometric patterns",
    "A retro robot surfing on a data wave",
    "A serene zen garden on a floating island",
    "A steampunk owl with glowing gears",
    "A beautiful cherry blossom tree in pixel art",
    "A cyberpunk city street at night in the rain",
    "An astronaut playing guitar in space",
    "A fox in a kimono drinking tea, ukiyo-e style",
    "A bioluminescent jellyfish in a neon-lit city",
    "A raccoon pirate captain on a ship made of junk",
    "A red panda meditating on a stack of ancient books",
    "A hummingbird made of stained glass and light",
    "A capybara relaxing in a yuzu hot spring",
    "A squirrel knight in ornate armor with an acorn shield",
    "An octopus DJ with headphones on each tentacle",
    "A majestic grizzly bear with constellations in its fur",
    "A Corgi wizard casting a spell that summons bacon",
    "An ancient library inside a giant, hollowed-out tree",
    "A crystal golem forged in the heart of a volcano",
    "A spaceship shaped like a manta ray in a nebula",
    "A floating castle held aloft by giant, glowing crystals",
    "A druid merging with a forest of data streams",
    "An elven archer with a bow made of pure energy",
    "A dwarf blacksmith forging a sword with a star fragment",
    "A goblin market in a steampunk city's underbelly",
    "A time traveler's pocket watch showing multiple timelines",
    "A serene alien landscape with two suns and purple grass",
    "A city skyline made of musical instruments, Art Deco",
    "A mechanical heart with intricate gears, steampunk",
    "A low-poly render of a peaceful mountain lake at sunrise",
    "A mosaic of a phoenix rising from the ashes",
    "An impossible Escher-like staircase in a brutalist building",
    "Minimalist line art of a cat on a crescent moon",
    "The sound of rain visualized as colorful streaks of light",
    "A mandala made of circuit board patterns",
    "A psychedelic pattern of melting clocks",
    "A hidden waterfall cascading into a glowing cenote",
    "Giant redwood forest with rays of light piercing through",
    "The Northern Lights over a field of arctic flowers",
    "A desert oasis at night under a star-filled sky",
    "A volcanic island with black sand beaches",
    "A coral reef with fantastical, imaginary sea creatures",
    "Sunflowers that follow a passing comet",
    "A bonsai tree that contains a miniature galaxy",
    "A dramatic storm over the ocean with a lighthouse",
    "A tranquil bamboo forest shrouded in mist",
    "A vintage typewriter typing out a story made of stars",
    "A magical potion bottle containing a swirling nebula",
    "A stack of antique books with one glowing with runes",
    "A detailed illustration of a ramen bowl with fantasy ingredients",
    "A futuristic motorcycle with neon-lit wheels",
    "An enchanted compass that points to your heart's desire",
    "A terrarium containing a tiny fantasy world",
    "A slice of cake that looks like a miniature planet",
    "A gramophone playing music that materializes as birds",
    "A samurai sword with a blade made of ice",
    "A plague doctor with a glowing bird in his mask cage",
    "A modern-day witch taking a selfie with her spectral cat",
    "A robot gardener tending to metallic flowers",
    "A post-apocalyptic scavenger with a cybernetic arm",
    "A sky pirate with a small, wise-cracking dragon",
    "A bard playing a lute that controls the weather",
    "A celestial being whose hair is a flowing galaxy",
    "A gnome inventor with his steam-powered contraption",
    "A ghost detective from the 1920s in the modern world",
    "A knight whose armor is made from a fallen meteorite",
    "A coffee cup with a storm brewing inside",
    "A vinyl record player spinning a galaxy disc",
    "Origami animals coming to life and flying off the page",
    "A synthwave sunset over a retro-futuristic city",
    "A skeleton wearing a flower crown, Dia de los Muertos",
    "A lone astronaut discovering a glowing alien flower",
    "An Art Nouveau portrait of a woman with butterfly wings",
    "A hyper-detailed vector illustration of a lion's face",
    "A sloth astronaut lazily floating through space",
    "A Viking longship sailing on the Bifrost bridge",
    "A geometric wolf howling at a fragmented moon",
    "A sugar skull cat with intricate patterns",
    "A dragon hoarding a pile of books instead of gold",
    "A retro video game controller overgrown with moss",
    "A bonsai tree on the back of a giant, ancient turtle",
    "A kitsune (nine-tailed fox) in a snowy forest",
    "A submarine exploring a lost underwater city",
    "A glass apple with a tiny, living universe inside",
    "A warrior riding a giant, armored pangolin",
    "A serene painting of a Japanese koi pond",
    "A robot with human emotions in its eyes",
    "A magical forest of giant, glowing mushrooms",
    "A phoenix feather turning into a flaming sword",
    "A cassette tape unraveling into a highway",
    "A teacup with a galaxy swirling inside",
    "A lighthouse that beams a rainbow instead of light",
    "An astronaut fishing for stars on the moon",
    "A cyberpunk samurai with a neon katana",
    "A dreamcatcher that has caught tiny constellations",
    "An owl with keys for feathers",
    "A whale swimming through the clouds",
    "A cityscape reflected in a puddle after a rainstorm",
    "A turtle with a city on its shell",
    "A vintage camera that captures ghosts on film",
    "A human heart made of interwoven branches and vines",
    "A clock melting, Salvador Dali style",
    "A griffin perched on a skyscraper",
    "A mermaid with scales made of opals",
    "A chess match between a robot and a wizard",
    "A majestic stag with crystalline antlers",
    "A hot air balloon that looks like a jellyfish",
    "A roaring tiger made of fire and embers",
    "A gramophone horn from which flowers are blooming",
    "A vintage diving helmet overgrown with coral",
    "A landscape painting of a planet with rings",
    "A chameleon whose skin pattern is a world map",
];


export const ANIME_KEYWORDS: string[] = [
    'anime', 'manga', 'otaku', 'kawaii', 'chibi', 'moe', 'waifu', 'husbando',
    'shoujo', 'shounen', 'seinen', 'josei', 'mecha', 'magical girl',
    'ninja', 'samurai', 'yokai', 'japanese', 'tokyo', 'kyoto',
    'school uniform', 'kimono', 'yukata', 'cherry blossom',
    'character', 'protagonist', 'hero', 'heroine', 'villain',
    'tsundere', 'yandere', 'dandere', 'kuudere', 'isekai', 'senpai', 'kouhai'
];