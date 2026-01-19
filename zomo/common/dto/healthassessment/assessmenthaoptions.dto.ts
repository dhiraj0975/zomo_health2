import { Expose, Transform, Type } from 'class-transformer';
import { AssessmentHaQuestionsDto } from './assessmenthaquestions.dto';
export class AssessmentHaOptionsDto {
    @Expose() id: number;
    @Expose() question_id: number;
    @Expose() option_title: string;
    @Expose() algo_value: number;
    @Expose() parent_id: number;
    @Expose() main_option_id: number;
    @Expose() order: number;
    @Expose() type: number;
    @Expose() risk_rating: number;
    @Expose()
    @Type(() => AssessmentHaQuestionsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                questioncat_id: value.questioncat_id,
                question_title: value.question_title,
            };
        }
        else {
            return null
        }
    })
    question: AssessmentHaQuestionsDto;
    @Expose()
    @Type(() => AssessmentHaOptionsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                type: value.type,
                option_title: value.option_title,
            };
        }
        else {
            return null
        }
    })
    parent: AssessmentHaOptionsDto;
}
