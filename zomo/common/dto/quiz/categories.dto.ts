import { Transform, Type, Expose } from 'class-transformer';
export class QuizCategoriesDto {
    @Expose() id: number;
    @Expose() name: string;
    @Expose() description: string;
    @Expose() category_type	: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    modified: string;
}
