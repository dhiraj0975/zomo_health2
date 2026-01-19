export type EntityKeyMap = Record<string, string>;
export type FieldDataResult = [Record<string, any>, Record<string, any>];

export interface CampaignFieldParams {
    campaignId: string;
}

export interface CampaignCategoryFieldParams {
    categoryId: string;
}