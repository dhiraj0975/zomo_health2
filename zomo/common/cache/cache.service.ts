import { Injectable } from '@nestjs/common';
import { FlatCache } from 'flat-cache';
interface CacheItem {
  data: any;
  ttl: number; 
  timestamp: number; 
}
@Injectable()
export class CacheService {
  private cache;
  constructor() {
    this.cache = new FlatCache();
  }
  setCache(key: string, data: any, ttl: number): void {
    const cacheItem: CacheItem = {
      data,
      ttl,
      timestamp: Date.now(),
    };
    this.cache.setKey(key, cacheItem);
    this.cache.save();
  }
  getCache(key: string): any {
    const cacheItem = this.cache.getKey(key) as CacheItem;
    if (cacheItem) {
      const currentTime = Date.now();
      const expirationTime = cacheItem.timestamp + cacheItem.ttl;
      if (currentTime < expirationTime) {
        return JSON.parse(cacheItem.data);
      } else {
        this.cache.removeKey(key);
        this.cache.save();
      }
    }
    return null;
  }
  hasCache(key: string): boolean {
    return this.cache.exists(key);
  }
  clearCache(): void {
    this.cache.clear();
    this.cache.save();
  }
  removeCache(key: string): void {
    this.cache.removeKey(key);
    this.cache.save();
  }

  removeKeysByPrefix(prefix: string): void {
    try {
      const all = typeof this.cache.all === 'function' ? this.cache.all() : {};
      if (!all || typeof all !== 'object') return;
      Object.keys(all).filter((k) => k.startsWith(prefix)).forEach((k) => this.cache.removeKey(k));
      this.cache.save();
    } catch (_) {}
  }
}
