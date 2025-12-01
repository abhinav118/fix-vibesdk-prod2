/**
 * Pexels Image Service
 * Fetches contextual images from Pexels API based on keywords
 */

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  liked: boolean;
  alt: string;
}

export interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

export type ImageSize = 'original' | 'large2x' | 'large' | 'medium' | 'small' | 'portrait' | 'landscape' | 'tiny';

export class PexelsImageService {
  private apiKey: string;
  private baseUrl = 'https://api.pexels.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetch a single contextual image by keyword
   */
  async getContextualImage(
    keyword: string,
    size: ImageSize = 'large'
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search?query=${encodeURIComponent(keyword)}&per_page=1`,
        {
          headers: {
            Authorization: this.apiKey
          }
        }
      );

      if (!response.ok) {
        console.error(`Pexels API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json() as PexelsSearchResponse;

      if (!data.photos || data.photos.length === 0) {
        console.warn(`No Pexels images found for keyword: ${keyword}`);
        return null;
      }

      const photo = data.photos[0];
      return photo.src[size] || photo.src.large || photo.src.original;
    } catch (error) {
      console.error(`Pexels fetch error for "${keyword}":`, error);
      return null;
    }
  }

  /**
   * Fetch multiple images for a keyword
   */
  async getMultipleImages(
    keyword: string,
    count: number = 5,
    size: ImageSize = 'large'
  ): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search?query=${encodeURIComponent(keyword)}&per_page=${Math.min(count, 80)}`,
        {
          headers: {
            Authorization: this.apiKey
          }
        }
      );

      if (!response.ok) {
        console.error(`Pexels API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json() as PexelsSearchResponse;

      if (!data.photos || data.photos.length === 0) {
        return [];
      }

      return data.photos.map(photo =>
        photo.src[size] || photo.src.large || photo.src.original
      );
    } catch (error) {
      console.error(`Pexels fetch error for "${keyword}":`, error);
      return [];
    }
  }

  /**
   * Get a curated photo (random high-quality photo)
   */
  async getCuratedImage(size: ImageSize = 'large'): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/curated?per_page=1&page=${Math.floor(Math.random() * 100) + 1}`,
        {
          headers: {
            Authorization: this.apiKey
          }
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as PexelsSearchResponse;

      if (!data.photos || data.photos.length === 0) {
        return null;
      }

      const photo = data.photos[0];
      return photo.src[size] || photo.src.large || photo.src.original;
    } catch (error) {
      console.error('Pexels curated fetch error:', error);
      return null;
    }
  }
}
