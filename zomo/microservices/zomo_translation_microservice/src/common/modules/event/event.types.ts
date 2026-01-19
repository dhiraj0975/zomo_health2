export type EntityKeyMap = Record<string, string>;
export type FieldDataResult = [Record<string, any>, Record<string, any>];

export interface EventFieldParams {
    eventId: string;
}

export interface EventCategoryFieldParams {
    categoryId: string;
}