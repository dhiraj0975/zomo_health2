import { Expose, Transform, Type } from 'class-transformer';
import { appConstant } from '../../constant/app.constant';
import { AssessmentOptionsDetailsDto } from "./index";
export class AssessmentOptionsDto {
    @Expose() id: number;
    @Expose() question_id: number;
    @Expose() parent_id: number;
    @Expose() sort_order: number;
    @Expose() range_type: number;
    @Expose() start_value: number;
    @Expose() end_value: number;
    @Expose() risk_rating: number;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if ([0,1,2,3,4].includes(obj.risk_rating)) {
            return appConstant.OPTION_LEVEL[obj.risk_rating];
        } else {
            return null
        }
    }, {
        toClassOnly: true,
    })
    level_text: string;
    @Expose() type: number;
    @Expose() message_add: string;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => AssessmentOptionsDetailsDto)
    @Transform(({ obj }) => {
        if (obj.aod) {
            return obj.aod
        } else {
            return []
        }
    }, {
        toClassOnly: true,
    })
    aod: AssessmentOptionsDetailsDto;
    @Expose()
    @Type(() => AssessmentOptionsDetailsDto)
    @Transform(({ obj }) => {
        if (obj.parent_option) {
            return obj.parent_option
        } else {
            return {}
        }
    }, {
        toClassOnly: true,
    })
    parent_option: AssessmentOptionsDetailsDto;
}
