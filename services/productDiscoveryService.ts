import type { DiscoveredProduct, ProductScore } from '../types';
import type { BlueprintSummary, VariantSummary } from './printifyProductService';
import { listBlueprints, getBlueprintDetails } from './printifyProductService';
import { listProducts as listHistoryProducts } from './historyService';

export interface DiscoveryFilters {
  category?: string;
  limit?: number;
}

export interface DiscoveryResult {
  items: DiscoveredProduct[];
  generatedAt: string;
}

const CATEGORY_BY_BLUEPRINT: Record<number, string> = {
  5: 'tshirts',
  326: 'bags',
  249: 'canvas',
  447: 'stickers',
};

const CATEGORY_PRIORITY = ['tshirts', 'bags', 'stickers', 'canvas', 'mugs', 'phone_cases'];

const DEFAULT_LIMIT = 12;

const computeScore = (blueprint: BlueprintSummary, variant: VariantSummary | undefined, historicalCount: number): ProductScore => {
  const baseCategory = CATEGORY_BY_BLUEPRINT[blueprint.id] || 'general';
  const demandIndex = Math.min(1, historicalCount / 10 + 0.2);
  const competitionIndex = Math.max(0.1, 1 - demandIndex * 0.6);
  const price = variant?.price ?? 20;
  const profitEstimate = price * 0.4;
  const score = Number((demandIndex * 1.5 + competitionIndex + (profitEstimate ? profitEstimate / 40 : 0)).toFixed(2));
  return {
    blueprintId: blueprint.id,
    providerId: 0,
    variantId: variant?.id,
    category: baseCategory,
    score,
    demandIndex: Number(demandIndex.toFixed(2)),
    competitionIndex: Number(competitionIndex.toFixed(2)),
    profitEstimate: Number(profitEstimate.toFixed(2)),
    trending: demandIndex > 0.6,
    metadata: { historicalCount, price },
  };
};

const sortByScore = (a: DiscoveredProduct, b: DiscoveredProduct) => b.score.score - a.score.score;

export async function discoverTopProducts(filters: DiscoveryFilters = {}): Promise<DiscoveryResult> {
  const maxItems = filters.limit && filters.limit > 0 ? filters.limit : DEFAULT_LIMIT;
  const history = await listHistoryProducts();
  const historyCountByBlueprint: Record<number, number> = {};
  history.forEach((item) => {
    const blueprint = Number(item.blueprint_id);
    if (!Number.isFinite(blueprint)) return;
    historyCountByBlueprint[blueprint] = (historyCountByBlueprint[blueprint] || 0) + 1;
  });

  const blueprints = await listBlueprints();
  const enriched: DiscoveredProduct[] = [];

  for (const blueprint of blueprints) {
    const category = filters.category || CATEGORY_BY_BLUEPRINT[blueprint.id];
    if (filters.category && category !== filters.category) continue;

    const details = await getBlueprintDetails(blueprint.id);
    if (!details) continue;
    const variants = details.variants.length ? details.variants : [undefined];
    const providerId = details.providers?.[0]?.id || 0;
    const historicalCount = historyCountByBlueprint[blueprint.id] || 0;

    variants.forEach((variant) => {
      const score = computeScore(blueprint, variant, historicalCount);
      enriched.push({
        blueprint,
        variant,
        providerId,
        category: score.category || category || 'general',
        score,
        lastUpdated: new Date().toISOString(),
      });
    });
  }

  const grouped: Record<string, DiscoveredProduct[]> = {};
  for (const item of enriched) {
    const category = item.category || 'general';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(item);
  }
  Object.values(grouped).forEach((list) => list.sort(sortByScore));

  const merged: DiscoveredProduct[] = [];
  const categories = filters.category ? [filters.category] : CATEGORY_PRIORITY;
  for (const category of categories) {
    const slice = grouped[category];
    if (!slice?.length) continue;
    merged.push(...slice.slice(0, Math.ceil(maxItems / categories.length)));
  }

  const final = merged.sort(sortByScore).slice(0, maxItems);
  return {
    items: final,
    generatedAt: new Date().toISOString(),
  };
}


