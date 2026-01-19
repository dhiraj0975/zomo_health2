import { Transform, Type, Expose } from 'class-transformer';
import { MyPlanBusinessRuleDto } from '../index';
export class MyPlanAssignRuleDto {
    @Expose() id: number;
    @Expose() plan_id: number;
    @Expose() rule_id: number;
    @Expose() org_id: number;
    @Expose() optional: number;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        let optionalArr = ['AND', 'OR'];
        return optionalArr[obj.optional];
    }, {
        toClassOnly: true,
    })
    optional_name: string;
    @Expose() bstart_date: string;
    @Expose() bend_date: string;
    @Expose() created: string;
    @Expose() updated: string;
    @Expose() recommended_base: number;
    @Expose() status: number;
    @Expose()
    @Type(() => MyPlanBusinessRuleDto)
    @Transform(({ obj }) => {
        if (obj.br) {
            return obj.br;
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    br: MyPlanBusinessRuleDto;
}
