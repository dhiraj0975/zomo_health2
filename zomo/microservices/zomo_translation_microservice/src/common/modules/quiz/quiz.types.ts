export type EntityKeyMap = Record<string, string>;
export type FieldDataResult = [Record<string, any>, Record<string, any>];

export interface QuizFieldParams {
    orgId: string;
    quizId: string;
}

export interface QuizCategoryFieldParams {
    categoryId: string;
}