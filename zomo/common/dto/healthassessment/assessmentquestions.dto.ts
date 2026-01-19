import { Expose, Transform, Type } from 'class-transformer';
import { appConstant } from '../../constant/app.constant';
import {
    AssessmentOptionsDetailsDto,
    AssessmentQuestionsDetailsDto,
    AssessmentResultsDto,
    AssessmentTabsDto
} from "./index";
export class AssessmentQuestionsDto {
    @Expose() id: number;
    @Expose() tab_id: number;
    @Expose() type: number;
    @Expose() question_type: number;
    @Expose() show_gender: number;
    @Expose() parent_id: number;
    @Expose() parent_option_id: number;
    @Expose() sort_order: number;
    @Expose() required: number;
    @Expose() general_info: number;
    @Expose() not_applicable: number;
    @Expose() m_section_weight: number;
    @Expose() f_section_weight: number;
    @Expose() age_considered: number;
    @Expose() age_limit: number;
    @Expose() age_condition: number;
    @Expose() result_type: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() status: number;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
            return appConstant.QUESTION_TYPE[obj.risk_rating];
    }, {
        toClassOnly: true,
    })
    type_text: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => AssessmentQuestionsDetailsDto)
    @Transform(({ obj }) => {
        if (obj.aqd) {
            return obj.aqd
        } else {
            return null
        }
    }, {
        toClassOnly: true,
    })
    aqd: AssessmentQuestionsDetailsDto;
    @Expose()
    @Type(() => AssessmentTabsDto)
    @Transform(({ obj }) => {
        if (obj.at) {
            return obj.at
        } else {
            return null
        }
    }, {
        toClassOnly: true,
    })
    at: AssessmentTabsDto;
    @Expose()
    @Type(() => AssessmentOptionsDetailsDto)
    @Transform(({ obj }) => {
        if (obj?.aod) {
            return obj?.aod
        } else {
            return null
        }
    }, {
        toClassOnly: true,
    })
    aod: AssessmentOptionsDetailsDto;
    @Expose()
    @Type(() => AssessmentResultsDto)
    @Transform(({ obj }) => {
        if (obj.ar) {
            return obj.ar
        } else {
            return null
        }
    }, {
        toClassOnly: true,
    })
    ar: AssessmentResultsDto;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj.question_detail) {
            return obj.question_detail
        } else {
            return null
        }
    }, {
        toClassOnly: true,
    })
    question_detail: string;
}
