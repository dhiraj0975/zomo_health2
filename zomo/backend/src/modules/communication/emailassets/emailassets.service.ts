import { CacheService, CommonDateService } from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

const S3COMMUNICATION_URL = process.env.AWS_COMMUNICATION_BUCKET_URL;
const EMAIL_ASSETS_CACHE_TTL = 60000;

@Injectable()
export class EmailAssetsService {
    constructor(
        private readonly cacheService: CacheService,
        private readonly commonDateService: CommonDateService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) {}

    getEmailAssetsListCacheKey(role_id: number, companyId: number, searchStr: string = ''): string {
        return `email-assets-list-${role_id}-${companyId ?? 0}-${searchStr}`;
    }

    private getListPrefixes(role_id: number, companyId: number): string[] {
        if (Number(role_id) === 11) return ['zhOrgImg/11/' + companyId, 'zhGloImg'];
        return ['zhGloImg'];
    }

    async fetchAssetsFromS3(role_id: number, companyId: number, searchStr?: string): Promise<{ list: any[]; total: number }> {
        const prefixs = this.getListPrefixes(role_id, companyId);
       
        let allDatas: any[] = [];
        for (const prefix of prefixs) {
            let continuationToken: string = null;
            do {
                const data = await lastValueFrom(
                    
                    this.commonMicroservice.send({ cmd: 'list_assests' }, { maxKeys: 1000, prefixes: [prefix], continuationToken }),
                    { defaultValue: { datas: [], nextContinuationToken: null } }
                    
                );
                // console.log("continuationToken",continuationToken)
                const batch = (data?.datas || []).filter(item => item?.Key);
                allDatas = allDatas.concat(batch);
                continuationToken = data?.nextContinuationToken || null;
            } while (continuationToken);
        }
        if (searchStr && String(searchStr).trim()) {
            const term = String(searchStr).trim().toLowerCase();
            allDatas = allDatas.filter(item => item.Key && item.Key.toLowerCase().includes(term));
        }
        const sorted = allDatas.sort((a, b) => new Date(b.LastModified || 0).getTime() - new Date(a.LastModified || 0).getTime());
        // console.log('[EMAIL_ASSETS FETCH] S3 result:', { totalItems: sorted.length });
        const list = sorted.map(item => {
            const key = item.Key || '';
            const parts = key.split('/');
            const fileName = parts[parts.length - 1] || '';

            return {
                ...item,
                url: `${S3COMMUNICATION_URL}${key}`,
                LastModifiedRaw: item.LastModified ?? null,
                LastModified: item.LastModified ? this.commonDateService.DateTimeFormat(item.LastModified, 'MM-DD-YYYY hh:mm A') : '',
                fileName,
            };
        });
        return { list, total: list.length };
    }

    getCachedList(role_id: number, companyId: number, searchStr: string = ''): { list: any[]; total: number } | null {
        const cacheKey = this.getEmailAssetsListCacheKey(role_id, companyId, searchStr);
        const raw = this.cacheService.getCache(cacheKey);
        if (!raw) return null;

        let cached: any = raw;
        try {
            if (typeof raw === 'string') {
                cached = JSON.parse(raw);
            }
        } catch {
            return null;
        }

        if (cached && Array.isArray(cached.list) && typeof cached.total === 'number') {
            return cached;
        }
        return null;
    }

    setCachedList(role_id: number, companyId: number, searchStr: string, list: any[], total: number): void {
        const cacheKey = this.getEmailAssetsListCacheKey(role_id, companyId, searchStr);
        this.cacheService.setCache(cacheKey, JSON.stringify({ list, total }), EMAIL_ASSETS_CACHE_TTL);
    }


     updateCacheOnCreate(role_id: number, companyId: number, createdKeys: string[]) {
        // console.log("updateCacheOnCreate",createdKeys );
        if (!createdKeys || !createdKeys.length) return;
        const cache = this.getCachedList(role_id, companyId, '');
        // console.log("updateCacheOnCreate cache",cache );
        if (!cache) return;

        const now = new Date();
        const nowFormatted = this.commonDateService.DateTimeFormat(now, 'MM-DD-YYYY hh:mm A');
        const newItems = createdKeys.map(key => {
            const safeKey = key || '';
            const parts = safeKey.split('/');
            const fileName = parts[parts.length - 1] || '';
            console.log("fileName",fileName );

            return {
                Key: safeKey,
                url: `${S3COMMUNICATION_URL}${safeKey}`,
                LastModifiedRaw: now.toISOString(),
                LastModified: nowFormatted,
                fileName,
            };
        });

        const newList = [...newItems, ...(cache.list || [])];
        const newTotal = (cache.total || 0) + createdKeys.length;
        this.setCachedList(role_id, companyId, '', newList, newTotal);
       
    }

    updateCacheOnDelete(role_id: number, companyId: number, assetKey: string): void {
        if (!assetKey) return;
        const cache = this.getCachedList(role_id, companyId, '');
        if (!cache) return;

        const filteredList = (cache.list || []).filter(item => item?.Key !== assetKey);
        const newTotal = Math.max(0, (cache.total || 0) - (filteredList.length === cache.list.length ? 0 : 1));
        this.setCachedList(role_id, companyId, '', filteredList, newTotal);
    }
}
