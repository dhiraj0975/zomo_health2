import {Expose } from 'class-transformer';
export class FoodWeightDto {
    @Expose() NDB_No: string;
    @Expose() Seq: string;
    @Expose() Amount: number;
    @Expose() Msre_Desc: string;
    @Expose() Gm_Wgt: number;
    @Expose() Num_Data_Pts: number;
    @Expose() Std_Dev: number;
}
