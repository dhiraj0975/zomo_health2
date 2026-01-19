import { Transform, Type, Expose } from 'class-transformer';
export class UcaSettingDto {
    @Expose() id: number;
    @Expose() org_id : number;
    @Expose() events: number;
    @Expose() challenges: number;
    @Expose() manual_entry: number;
    @Expose() incentive: number;
    @Expose() future_plan: number;
    @Expose() timeline: number;
    @Expose() status: number;
    @Expose() created: string;
    @Expose() update: string;
}
