/**
 * Image Placeholder Processor
 * Replaces {IMAGE:keyword} placeholders with actual Pexels image URLs
 */

import { PexelsImageService, ImageSize } from '../services/pexels/PexelsImageService';

// Matches {IMAGE:keyword} or {IMAGE:keyword:size} patterns
const IMAGE_PLACEHOLDER_REGEX = /\{IMAGE:([^}:]+)(?::([^}]+))?\}/g;

// Special keywords that trigger random/curated images
const RANDOM_KEYWORDS = ['random', 'placeholder', 'generic', 'any'];

export interface ProcessImageOptions {
  /** Default image size if not specified in placeholder */
  defaultSize?: ImageSize;
  /** Whether to use Pexels curated as fallback when keyword search fails */
  useFallback?: boolean;
}

/**
 * Process all {IMAGE:keyword} placeholders in code and replace with Pexels URLs
 */
export async function processImagePlaceholders(
  code: string,
  pexelsService: PexelsImageService,
  options: ProcessImageOptions = {}
): Promise<string> {
  const {
    defaultSize = 'large',
    useFallback = true
  } = options;

  // Find all matches
  const matches = [...code.matchAll(IMAGE_PLACEHOLDER_REGEX)];

  if (matches.length === 0) {
    return code;
  }

  // Create a map to avoid duplicate API calls for same keyword
  const keywordToUrl = new Map<string, string>();

  // Fetch all unique images in parallel
  const uniqueKeywords = [...new Set(matches.map(m => m[1]))];

  await Promise.all(
    uniqueKeywords.map(async (keyword) => {
      const keywordLower = keyword.toLowerCase().trim();

      // Check if this is a request for a random/placeholder image
      if (RANDOM_KEYWORDS.includes(keywordLower)) {
        // Use Pexels curated endpoint for random high-quality images
        const imageUrl = await pexelsService.getCuratedImage(defaultSize);
        if (imageUrl) {
          keywordToUrl.set(keyword, imageUrl);
        }
      } else {
        // Use keyword search for contextual images
        const imageUrl = await pexelsService.getContextualImage(keyword, defaultSize);

        if (imageUrl) {
          keywordToUrl.set(keyword, imageUrl);
        } else if (useFallback) {
          // Fallback to Pexels curated if keyword search fails
          const curatedUrl = await pexelsService.getCuratedImage(defaultSize);
          if (curatedUrl) {
            keywordToUrl.set(keyword, curatedUrl);
          }
        }
      }
    })
  );

  // Replace all placeholders
  let processedCode = code;
  for (const match of matches) {
    const [placeholder, keyword] = match;
    const url = keywordToUrl.get(keyword);

    if (url) {
      processedCode = processedCode.replace(placeholder, url);
    }
  }

  return processedCode;
}

/**
 * Extract all image keywords from code without processing
 */
export function extractImageKeywords(code: string): string[] {
  const matches = [...code.matchAll(IMAGE_PLACEHOLDER_REGEX)];
  return [...new Set(matches.map(m => m[1]))];
}

/**
 * Count image placeholders in code
 */
export function countImagePlaceholders(code: string): number {
  const matches = [...code.matchAll(IMAGE_PLACEHOLDER_REGEX)];
  return matches.length;
}

/**
 * Process a single file's content
 */
export async function processFileContent(
  content: string,
  pexelsService: PexelsImageService,
  options?: ProcessImageOptions
): Promise<{ content: string; replacedCount: number }> {
  const originalCount = countImagePlaceholders(content);
  const processedContent = await processImagePlaceholders(content, pexelsService, options);
  const remainingCount = countImagePlaceholders(processedContent);

  return {
    content: processedContent,
    replacedCount: originalCount - remainingCount
  };
}

/**
 * Process multiple files in parallel
 */
export async function processMultipleFiles(
  files: Array<{ path: string; content: string }>,
  pexelsService: PexelsImageService,
  options?: ProcessImageOptions
): Promise<Array<{ path: string; content: string; replacedCount: number }>> {
  return Promise.all(
    files.map(async (file) => {
      const result = await processFileContent(file.content, pexelsService, options);
      return {
        path: file.path,
        content: result.content,
        replacedCount: result.replacedCount
      };
    })
  );
}
