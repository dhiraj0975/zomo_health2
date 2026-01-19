import { Transform, Type, Expose } from 'class-transformer';
import { CovidQuestionsDto } from './covidQuestions.dto';
export class CovidAnswersDto {
    @Expose() id: number;
    @Expose() q_id: number;
    @Expose() title: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => CovidQuestionsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                org_id: value.org_id,
                title: value.title,               
            };
        }
        else {
            return null
        }
    })
    question: CovidQuestionsDto;
}
