import {Expose, Transform, Type} from 'class-transformer';
export class BodyFeedsDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() userName: string;
    @Expose() appId: string;
    @Expose() logType: string;
    @Expose() appName: string;
    @Expose() measurementUnit: string;
    @Expose() age: string;
    @Expose() weight: number;
    @Expose() chest: number;
    @Expose() abdominal: number;
    @Expose() thigh: number;
    @Expose() tricep: number;
    @Expose() subscapular: number;
    @Expose() suprailiac: number;
    @Expose() midaxillary: number;
    @Expose() method: string;
    @Expose() status: number;
    @Expose()
    date: string;
    @Expose()
    added_date: string;
    @Expose()
    updated_date: string;
}
