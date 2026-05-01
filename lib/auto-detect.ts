import Anthropic from '@anthropic-ai/sdk';
import type { MediaClassification, AlbumColor } from './supabase/types';
import { PRESET_COLORS, SIZE_SETS } from './variants';
import { photoUrl } from './storage';

const VISION_MODEL = 'claude-haiku-4-5-20251001';
// Grouping uses Sonnet — runs once per batch, needs to handle the tool schema
// reliably. Haiku 4.5 was returning empty tool input on this prompt.
const GROUPING_MODEL = 'claude-sonnet-4-6';

function client(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  // SDK auto-retries 429s honoring `retry-after`. Default is 2; bump for rate-limited tiers.
  return new Anthropic({ apiKey: key, maxRetries: 5 });
}

const PRESET_NAMES = PRESET_COLORS.map((c) => c.name).join(', ');

const CLASSIFY_PROMPT = `You are classifying a single product photo from a vendor's image library.

Return ONLY a JSON object with this exact shape (no prose, no markdown fences):
{
  "category": "footwear" | "clothing" | "accessory" | "other",
  "title": string (3-6 words, e.g. "Black leather Chelsea boot"),
  "dominant_colors": [{ "name": string, "hex": string }],
  "descriptors": string[] (3-6 short tokens describing material, silhouette, distinguishing details — used to group photos of the same product)
}

Rules:
- "footwear" = any shoe, boot, sneaker, sandal.
- "clothing" = tops, bottoms, outerwear, dresses.
- "accessory" = bag, hat, belt, jewelry, eyewear, scarf.
- "other" = anything else (lookbook shot, store interior, packaging, etc.).
- For dominant_colors, prefer one of these preset names when applicable: ${PRESET_NAMES}. Otherwise invent a sensible name. Always include a hex.
- descriptors should be specific enough that two photos of the SAME product (front + back view) share most descriptors, but two photos of similar but DIFFERENT products do not. Example: ["chelsea-boot", "black-leather", "elastic-side-panel", "round-toe", "pull-tab"].`;

const GROUPING_PROMPT = `You are grouping product photos into individual products AND assigning each product to the vendor's best-fitting category.

Each photo has been pre-classified. Two photos belong to the SAME group if and only if they show the SAME physical product in the SAME color/colorway (e.g. front view + back view of one black boot). Different colorways of the same model = different groups. Different products = different groups.

You will receive two inputs:
1. A JSON array of photos with fields { id, category, title, dominant_colors, descriptors }
2. A JSON array of the vendor's categories with fields { id, name, parent }. "parent" is the parent category's name (e.g. "Casablanca" might have parent "Brands"). Categories may be empty.

Output ONLY a JSON object:
{
  "groups": [
    {
      "photo_ids": string[],
      "title": string (4-7 words, derived from the photos),
      "category": "footwear" | "clothing" | "accessory" | "other",
      "colors": [{ "name": string, "hex": string }],
      "vendor_category_id": string | null
    }
  ]
}

Rules:
- Every input photo_id MUST appear in exactly one group.
- Photos with category "other" each go in their own single-photo group (we still want them as draft products the user can delete).
- Pick the group's category as the most common category among its photos.
- Pick the group's colors by intersecting the dominant_colors of its photos (the colors they all share).
- For vendor_category_id: pick the SINGLE best-fitting vendor category id by matching brand names, product types, or descriptors. Prefer the MOST SPECIFIC match — e.g. a Casablanca tennis shirt should match the "Casablanca" category id, not its parent "Brands". If no category clearly fits, use null. If the vendor has no categories, always use null.`;

export type ClassifyResult = {
  mediaId: string;
  classification: MediaClassification;
  /** True when classification is a fallback because the call failed. Don't cache these. */
  failed?: boolean;
};

export type VendorCategory = {
  id: string;
  name: string;
  parent: string | null;
};

export type DetectedGroup = {
  photoIds: string[];
  title: string;
  category: MediaClassification['category'];
  colors: AlbumColor[];
  categoryId: string | null;
};

export async function classifyImage(
  storageKey: string,
): Promise<MediaClassification> {
  const url = photoUrl(storageKey);
  const anthropic = client();

  const msg = await anthropic.messages.create({
    model: VISION_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url },
          },
          { type: 'text', text: CLASSIFY_PROMPT },
        ],
      },
    ],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  return parseJson<MediaClassification>(text);
}

export async function classifyImages(
  items: Array<{ id: string; storage_key: string }>,
  concurrency = 3,
): Promise<ClassifyResult[]> {
  const out: ClassifyResult[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      const item = items[i];
      try {
        const classification = await classifyImage(item.storage_key);
        out.push({ mediaId: item.id, classification });
      } catch (err) {
        const fallback: MediaClassification = {
          category: 'other',
          title: 'Untitled product',
          dominant_colors: [],
          descriptors: [],
        };
        // Mark as failed so the route knows not to cache this — re-runs will retry.
        out.push({ mediaId: item.id, classification: fallback, failed: true });
        console.error('[auto-detect] classify failed', item.id, err);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return out;
}

export async function groupClassifications(
  results: ClassifyResult[],
  categories: VendorCategory[] = [],
): Promise<DetectedGroup[]> {
  if (results.length === 0) return [];

  // Skip the LLM only when there's nothing to group AND no category to assign.
  if (results.length === 1 && categories.length === 0) {
    const r = results[0];
    return [
      {
        photoIds: [r.mediaId],
        title: r.classification.title,
        category: r.classification.category,
        colors: r.classification.dominant_colors,
        categoryId: null,
      },
    ];
  }

  const photos = results.map((r) => ({
    id: r.mediaId,
    category: r.classification.category,
    title: r.classification.title,
    dominant_colors: r.classification.dominant_colors,
    descriptors: r.classification.descriptors,
  }));

  const validCategoryIds = new Set(categories.map((c) => c.id));

  const anthropic = client();
  type ParsedGroup = {
    photo_ids: string[];
    title: string;
    category: MediaClassification['category'];
    colors: AlbumColor[];
    vendor_category_id: string | null;
  };
  let parsed: { groups: ParsedGroup[] };

  try {
    // Use tool-use to force a typed JSON output. The model can't emit invalid
    // JSON when constrained to a tool schema — parse failures we kept seeing
    // with raw text output are eliminated by this approach.
    const msg = await anthropic.messages.create({
      model: GROUPING_MODEL,
      max_tokens: 16384,
      tools: [
        {
          name: 'create_product_groups',
          description:
            'Group product photos into individual products and assign each to the best-fitting vendor category.',
          input_schema: {
            type: 'object' as const,
            properties: {
              groups: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    photo_ids: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Photo ids belonging to this single product/colorway.',
                    },
                    title: {
                      type: 'string',
                      description: '4-7 word product name.',
                    },
                    category: {
                      type: 'string',
                      enum: ['footwear', 'clothing', 'accessory', 'other'],
                    },
                    colors: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          hex: { type: 'string' },
                        },
                        required: ['name', 'hex'],
                      },
                    },
                    vendor_category_id: {
                      type: 'string',
                      description:
                        'Best-fitting vendor category id. Use an empty string if no category clearly fits or if the vendor has no categories.',
                    },
                  },
                  required: ['photo_ids', 'title', 'category', 'colors'],
                },
              },
            },
            required: ['groups'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'create_product_groups' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: GROUPING_PROMPT },
            { type: 'text', text: `Photos:\n${JSON.stringify(photos, null, 2)}` },
            {
              type: 'text',
              text: `Vendor categories:\n${JSON.stringify(categories, null, 2)}`,
            },
          ],
        },
      ],
    });

    const toolUse = msg.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );
    if (!toolUse) {
      console.error('[auto-detect] no tool_use block. stop_reason=%s, content=%j',
        msg.stop_reason, msg.content);
      throw new Error('Model did not call create_product_groups');
    }
    const input = toolUse.input as { groups?: ParsedGroup[] };
    if (!Array.isArray(input.groups) || input.groups.length === 0) {
      console.error('[auto-detect] tool returned bad input. stop_reason=%s, input=%j',
        msg.stop_reason, toolUse.input);
      throw new Error(
        `tool returned invalid shape: ${JSON.stringify(toolUse.input).slice(0, 200)}`,
      );
    }
    parsed = { groups: input.groups };
  } catch (err) {
    // Grouping failed (rate limit exhausted, validation error, etc.). DON'T
    // fall back to per-photo — that creates a flood of bad single-photo drafts
    // the user then has to clean up. Surface the error; vision work is cached
    // so a retry is fast and free.
    console.error('[auto-detect] grouping failed', err);
    throw new Error(
      'Grouping AI returned an unexpected response. Please click again — your image classifications are cached so the retry is free.',
    );
  }

  const seen = new Set<string>();
  const groups: DetectedGroup[] = parsed.groups.map((g) => {
    const photoIds = Array.isArray(g.photo_ids) ? g.photo_ids : [];
    for (const id of photoIds) seen.add(id);
    // Drop hallucinated category ids and our empty-string sentinel for "no fit".
    const rawCategoryId = g.vendor_category_id;
    const categoryId =
      rawCategoryId && rawCategoryId !== '' && validCategoryIds.has(rawCategoryId)
        ? rawCategoryId
        : null;
    return {
      photoIds,
      title: g.title ?? 'Untitled product',
      category: g.category ?? 'other',
      colors: Array.isArray(g.colors) ? g.colors : [],
      categoryId,
    };
  });

  // Safety: if the model dropped any photos, give them their own groups.
  for (const r of results) {
    if (!seen.has(r.mediaId)) {
      groups.push({
        photoIds: [r.mediaId],
        title: r.classification.title,
        category: r.classification.category,
        colors: r.classification.dominant_colors,
        categoryId: null,
      });
    }
  }

  return groups;
}

/** Pick a default size set per detected category. */
export function defaultSizesFor(
  category: MediaClassification['category'],
): string[] {
  if (category === 'footwear') {
    const set = SIZE_SETS.find((s) => s.id === 'shoes-uk');
    return set ? set.sizes.filter((s) => {
      const n = parseInt(s.replace(/\D/g, ''), 10);
      return n >= 5 && n <= 13;
    }) : [];
  }
  if (category === 'clothing') {
    return ['XS', 'S', 'M', 'L', 'XL'];
  }
  return [];
}

function parseJson<T>(text: string): T {
  // Models occasionally wrap JSON in ```json fences despite instructions.
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const match = candidate.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`Model returned non-JSON: ${text.slice(0, 200)}`);
    return JSON.parse(match[0]) as T;
  }
}
