import {Expose, Transform, Type} from 'class-transformer';
export class FoodNutritionValuesDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() userName: string;
    @Expose() logType: string;
    @Expose() logId: number;
    @Expose() appName: string;
    @Expose() foodUnit: string;
    @Expose() amount: number;
    @Expose() NDB_No: string;
    @Expose() Long_Desc: string;
    @Expose() Nutr_No: number;
    @Expose() NutrDesc: string;
    @Expose() NutrVal: number;
    @Expose() logDate: string;
    @Expose() collectionDate: string;
    @Expose() status: number;
    @Expose()
    timestamp: string;
}
