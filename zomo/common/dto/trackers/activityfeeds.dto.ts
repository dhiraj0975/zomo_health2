import { Expose } from 'class-transformer';
export class ActivityFeedsDto {
    @Expose() acId: number;
    @Expose() user_id: number;
    @Expose() userName: string;
    @Expose() appId: string;
    @Expose() logType: string;
    @Expose() appName: string;
    @Expose() activityId: number;
    @Expose() parentId: number;
    @Expose() parentName: string;
    @Expose() activityName: string;
    @Expose() calories: number;
    @Expose() distance: number;
    @Expose() steps: number;
    @Expose() duration: number;
    @Expose() hasStartTime: string;
    @Expose() isFavorite: string;
    @Expose() logId: number;
    @Expose() startTime: string;
    @Expose() timeFormat: string;
    @Expose() description: string;
    @Expose() activityTypeId: number;
    @Expose() activityType: string;
    @Expose() timezone: string;
    @Expose() status: number;
    @Expose()
    timestamp: string;
    @Expose()
    collectionDate: string;
}
