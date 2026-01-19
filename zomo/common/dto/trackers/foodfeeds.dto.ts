import {Expose, Transform, Type} from 'class-transformer';
import * as moment from 'moment-timezone';
export class FoodFeedsDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() userName: string;
    @Expose() appId: string;
    @Expose() logType: string;
    @Expose() appName: string;
    @Expose() logId: number;
    @Expose() foodId: number;
    @Expose() locale: string;
    @Expose() mealTypeId: number;
    @Expose() name: string;
    @Expose() calories: number;
    @Expose() carbs: number;
    @Expose() fat: number;
    @Expose() fiber: number;
    @Expose() protein: number;
    @Expose() sodium: number;
    @Expose() water: number;
    // @Expose() logDate: string;
    @Expose() isFavorite: string;
    @Expose() accessLevel: string;
    @Expose() amount: number;
    @Expose() foodUnit: string;
    // @Expose() collectionDate: string;
    @Expose() activityTypeId: number;
    @Expose() activityType: string;
    @Expose() status: number;
    @Expose()
    timestamp: string;
    @Expose()
    // @Type(() => String)
    // @Transform(({ value }) => (value ? moment(value, 'YYYY-MM-DD').valueOf().toString() : null), {
    //     toClassOnly: true,
    // })
    logDate: string;
    @Expose()
    collectionDate: string;
}
