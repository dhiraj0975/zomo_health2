import { Expose, Transform, Type } from 'class-transformer';
import { QuizCategoriesDto } from './categories.dto';
const S3_URL =  process.env.S3_URL_PROD
export class QuizQuizzesDto {
    @Expose() id: number;
    @Expose() cat_id: number;
    @Expose() quiz_name: string;
    @Expose() quiz_description: string;
    @Expose() question_per_page: number;
    @Expose() num_of_questions: number;
    @Expose() quiz_order: number;
    @Expose() status: number;
    @Expose() quiz_type: string;
    @Expose() question_type: string;
    @Expose() question_info: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value ? S3_URL + value : value), {
        toClassOnly: true,
    })
    image: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose() is_webinar?: number;
    @Expose() is_default?: number;
    @Expose() webinar_id?: number;
    @Expose()
    @Type(() => QuizCategoriesDto)
    @Transform(({ value }) => {
        if (value && value.id) {
            return {
                id: value.id,
                name: value.name,
            };
        }
        else {
            return null
        }
    })
    category: QuizCategoriesDto;
}
