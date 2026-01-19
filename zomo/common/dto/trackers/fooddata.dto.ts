import {Expose } from 'class-transformer';
export class FoodDataDto {
    @Expose() NDB_No: string;
    @Expose() FdGrp_Cd: string;
    @Expose() Long_Desc: string;
    @Expose() Shrt_Desc: string;
    @Expose() ComName: string;
    @Expose() ManufacName: string;
    @Expose() Survey: string;
    @Expose() Ref_desc: string;
    @Expose() Refuse: number;
    @Expose() SciName: string;
    @Expose() N_Factor: number;
    @Expose() Pro_Factor: number;
    @Expose() Fat_Factor: number;
    @Expose() CHO_Factor: number;
}
