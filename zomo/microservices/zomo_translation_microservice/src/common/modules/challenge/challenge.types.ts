export type EntityKeyMap = Record<string, string>;
export type FieldDataResult = [Record<string, any>, Record<string, any>];

export interface ChallengeFieldParams {
    orgId: string;
    challengeId: string;
}

export interface ChallengeActivityFieldParams {
    activityId: string;
}