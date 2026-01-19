import { Allow } from 'class-validator';
export class CreateActivityFeedsInput {
    @Allow() acId: number;
    @Allow() user_id: number;
    @Allow() userName: string;
    @Allow() appId: string;
    @Allow() logType: string;
    @Allow() appName: string;
    @Allow() activityId: number;
    @Allow() parentId: number;
    @Allow() parentName: string;
    @Allow() activityName: string;
    @Allow() calories: number;
    @Allow() distance: number;
    @Allow() steps: number;
    @Allow() duration: number;
    @Allow() hasStartTime: string;
    @Allow() isFavorite: string;
    @Allow() logId: number;
    @Allow() startTime: string;
    @Allow() timeFormat: string;
    @Allow() description: string;
    @Allow() activityTypeId: number;
    @Allow() activityType: string;
    @Allow() collectionDate: string;
    @Allow() timezone: string;
    @Allow() unit: string;
    @Allow() status: number;
}
