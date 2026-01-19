import { Expose, Transform } from 'class-transformer';
export class QuizOrgDto {
    @Expose() id: number;
    @Expose() quiz_id: number;
    @Expose() org_id: number;
    @Expose() created: string;
    @Expose() updated: string;
    @Expose() status: number;
    @Expose()
    @Transform(({ obj }) => (obj.quiz ? obj.quiz.quiz_name : null ), { toClassOnly: true })
    quiz_name: any;
}
