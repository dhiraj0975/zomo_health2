import { Allow } from 'class-validator';
export class CreateFoodNutritionInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() userName: string;
    @Allow() logType: string;
    @Allow() logId: number;
    @Allow() appName: string;
    @Allow() foodUnit: string;
    @Allow() amount: number;
    @Allow() NDB_No: string;
    @Allow() Long_Desc: string;
    @Allow() Nutr_No: number;
    @Allow() NutrDesc: string;
    @Allow() NutrVal: number;
    @Allow() logDate: string;
    @Allow() collectionDate: string;
    @Allow() status: number;
}
