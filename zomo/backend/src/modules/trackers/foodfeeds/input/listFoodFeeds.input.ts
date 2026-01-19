import { Allow } from 'class-validator';
export class ListFoodFeedsInput {
    @Allow() user_id: number;
    @Allow() logDate: string;
    @Allow() activityType: string;
    @Allow() mealTypeId: number;
    @Allow() activityTypeId: number;
    @Allow() name: string;
    @Allow() schedule_id: number;
    @Allow() collect_date: any;
}
