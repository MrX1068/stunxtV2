import { Injectable } from '@nestjs/common';

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: 'auto' | number;
  format?: 'auto' | 'webp' | 'jpg' | 'png';
  crop?: 'fill' | 'fit' | 'scale';
}

@Injectable()
export class ImageTransformService {
  
  /**
   * Generate optimized image URLs for different use cases
   */
  getOptimizedUrl(originalUrl: string, options: ImageTransformOptions): string {
    if (!originalUrl || !originalUrl.includes('cloudinary.com')) {
      return originalUrl; // Return as-is for non-Cloudinary URLs
    }

    const transformations = [];
    
    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.crop) transformations.push(`c_${options.crop}`);
    if (options.format) transformations.push(`f_${options.format}`);
    if (options.quality) transformations.push(`q_${options.quality}`);

    const transformString = transformations.join(',');
    
    // Insert transformations into Cloudinary URL
    return originalUrl.replace('/upload/', `/upload/${transformString}/`);
  }

  /**
   * Predefined avatar sizes for consistent UI
   */
  getAvatarSizes(avatarUrl: string) {
    if (!avatarUrl) return null;

    return {
      thumbnail: this.getOptimizedUrl(avatarUrl, { 
        width: 40, height: 40, crop: 'fill', quality: 'auto', format: 'auto' 
      }),
      small: this.getOptimizedUrl(avatarUrl, { 
        width: 80, height: 80, crop: 'fill', quality: 'auto', format: 'auto' 
      }),
      medium: this.getOptimizedUrl(avatarUrl, { 
        width: 150, height: 150, crop: 'fill', quality: 'auto', format: 'auto' 
      }),
      large: this.getOptimizedUrl(avatarUrl, { 
        width: 300, height: 300, crop: 'fill', quality: 'auto', format: 'auto' 
      }),
      original: avatarUrl
    };
  }

  /**
   * Get responsive image URLs for different screen densities
   */
  getResponsiveAvatars(avatarUrl: string, baseSize: number) {
    if (!avatarUrl) return null;

    return {
      '1x': this.getOptimizedUrl(avatarUrl, { 
        width: baseSize, height: baseSize, crop: 'fill', quality: 'auto', format: 'auto' 
      }),
      '2x': this.getOptimizedUrl(avatarUrl, { 
        width: baseSize * 2, height: baseSize * 2, crop: 'fill', quality: 'auto', format: 'auto' 
      }),
      '3x': this.getOptimizedUrl(avatarUrl, { 
        width: baseSize * 3, height: baseSize * 3, crop: 'fill', quality: 'auto', format: 'auto' 
      }),
    };
  }
}
