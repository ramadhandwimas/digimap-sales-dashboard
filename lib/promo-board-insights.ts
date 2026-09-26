import type { PromoParseResult, PromoProduct } from "@/lib/promo-board-parser";

export type PromoChangeType =
  | "NEW_PRODUCT"
  | "NEW_PROMO"
  | "PROMO_PRICE_DOWN"
  | "PROMO_PRICE_UP"
  | "PROMO_ENDED"
  | "PROMO_PERIOD_CHANGED"
  | "UNCHANGED"
  | "REMOVED_PRODUCT";

export type PromoChange = {
  type: PromoChangeType;
  sapArticle: string;
  description: string;
  previous?: PromoProduct;
  current?: PromoProduct;
};

export type PromoComparison = {
  changes: PromoChange[];
  counts: Record<PromoChangeType, number>;
};

export type PromoProductGroup = {
  key: string;
  title: string;
  category: string;
  normalPrice: number;
  promotionPrice: number;
  savingAmount: number;
  discountPercentage: number;
  promoStartDate: string | null;
  promoEndDate: string | null;
  promoPeriodType: PromoProduct["promoPeriodType"];
  promoStatus: PromoProduct["promoStatus"];
  daysRemaining: number | null;
  remarks: string;
  variants: PromoProduct[];
};

const COLOR_TOKENS = [
  "SPG", "SLV", "GLD", "STL", "MDN", "BLK", "WHT", "BLU", "BLUE", "BLACK", "WHITE",
  "PINK", "RED", "GRN", "GREEN", "PUR", "PURPLE", "YEL", "YELLOW", "NAT", "NATURAL",
  "SILVER", "GOLD", "MIDNIGHT", "STARLIGHT", "SPACE GREY", "SPACE GRAY", "GRAPHITE",
];

function hasDiscount(product?: PromoProduct) {
  return Boolean(product && product.normalPrice > 0 && product.promotionPrice > 0 && product.promotionPrice < product.normalPrice);
}

function promoSignature(product: PromoProduct) {
  return [
    product.normalPrice,
    product.promotionPrice,
    product.remarks,
    product.promotionInstallmentBundling ?? 0,
    product.promotionCashBundling ?? 0,
    product.promoStartDate ?? "",
    product.promoEndDate ?? "",
    product.promoPeriodType,
  ].join("|");
}

export function comparePromoPriceLists(previous: PromoParseResult | null, current: PromoParseResult | null): PromoComparison {
  const counts: Record<PromoChangeType, number> = {
    NEW_PRODUCT: 0,
    NEW_PROMO: 0,
    PROMO_PRICE_DOWN: 0,
    PROMO_PRICE_UP: 0,
    PROMO_ENDED: 0,
    PROMO_PERIOD_CHANGED: 0,
    UNCHANGED: 0,
    REMOVED_PRODUCT: 0,
  };
  if (!current) return { changes: [], counts };

  const oldMap = new Map((previous?.products ?? []).map((item) => [item.sapArticle, item]));
  const newMap = new Map(current.products.map((item) => [item.sapArticle, item]));
  const changes: PromoChange[] = [];

  for (const item of current.products) {
    const old = oldMap.get(item.sapArticle);
    let type: PromoChangeType = "UNCHANGED";
    if (!old) type = "NEW_PRODUCT";
    else if (!hasDiscount(old) && hasDiscount(item)) type = "NEW_PROMO";
    else if (hasDiscount(old) && !hasDiscount(item)) type = "PROMO_ENDED";
    else if (item.promotionPrice > 0 && old.promotionPrice > 0 && item.promotionPrice < old.promotionPrice) type = "PROMO_PRICE_DOWN";
    else if (item.promotionPrice > 0 && old.promotionPrice > 0 && item.promotionPrice > old.promotionPrice) type = "PROMO_PRICE_UP";
    else if (
      item.remarks !== old.remarks ||
      item.promoStartDate !== old.promoStartDate ||
      item.promoEndDate !== old.promoEndDate ||
      item.promoPeriodType !== old.promoPeriodType
    ) type = "PROMO_PERIOD_CHANGED";
    else if (promoSignature(item) !== promoSignature(old)) type = "PROMO_PERIOD_CHANGED";

    counts[type] += 1;
    changes.push({ type, sapArticle: item.sapArticle, description: item.sapDescription, previous: old, current: item });
  }

  for (const old of previous?.products ?? []) {
    if (newMap.has(old.sapArticle)) continue;
    counts.REMOVED_PRODUCT += 1;
    changes.push({ type: "REMOVED_PRODUCT", sapArticle: old.sapArticle, description: old.sapDescription, previous: old });
  }

  return { changes, counts };
}

function stripColorToken(value: string) {
  let normalized = value.toUpperCase().replace(/\s+/g, " ").trim();
  for (const token of COLOR_TOKENS.sort((a, b) => b.length - a.length)) {
    const pattern = new RegExp(`(^|[\\s/()-])${token.replace(/ /g, "\\s+")}(?=($|[\\s/()-]))`, "gi");
    normalized = normalized.replace(pattern, "$1");
  }
  return normalized.replace(/\s+/g, " ").replace(/\s*\/\s*/g, "/").trim();
}

export function groupPromoProducts(products: PromoProduct[]): PromoProductGroup[] {
  const groups = new Map<string, PromoProductGroup>();

  for (const product of products) {
    const title = stripColorToken(product.sapDescription) || product.sapDescription;
    const key = [
      product.category,
      title,
      product.normalPrice,
      product.promotionPrice,
      product.remarks,
      product.promoStartDate ?? "",
      product.promoEndDate ?? "",
      product.promoPeriodType,
    ].join("|");

    const existing = groups.get(key);
    if (existing) {
      existing.variants.push(product);
      continue;
    }

    groups.set(key, {
      key,
      title,
      category: product.category,
      normalPrice: product.normalPrice,
      promotionPrice: product.promotionPrice,
      savingAmount: product.savingAmount,
      discountPercentage: product.discountPercentage,
      promoStartDate: product.promoStartDate,
      promoEndDate: product.promoEndDate,
      promoPeriodType: product.promoPeriodType,
      promoStatus: product.promoStatus,
      daysRemaining: product.daysRemaining,
      remarks: product.remarks,
      variants: [product],
    });
  }

  return [...groups.values()].sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (b.savingAmount !== a.savingAmount) return b.savingAmount - a.savingAmount;
    return a.title.localeCompare(b.title);
  });
}
