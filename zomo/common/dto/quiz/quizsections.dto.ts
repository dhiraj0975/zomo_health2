import { Expose } from 'class-transformer';
export class QuizSectionsDto {
    @Expose() id: number;
    @Expose() name: string;
    @Expose() description: string;
    @Expose() quiz_id: number;
    @Expose() created_date: string;
    @Expose() modified_date: string;
}
