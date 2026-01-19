import {Expose, Transform, Type} from 'class-transformer';
import { SurveyQuestionsDto } from './surveyquestions.dto';
export class SurveyAnswersDto {
    @Expose() id: number;
    @Expose() q_id: number;
    @Expose() title : string;
    @Expose() correct_ans: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => SurveyQuestionsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                org_id: value.org_id,
                title: value.title,
                popup_id: value.popup_id,
                ans_option_type: value.ans_option_type,
            };
        } else {
            return null
        }
    })
    question: SurveyQuestionsDto;
}
