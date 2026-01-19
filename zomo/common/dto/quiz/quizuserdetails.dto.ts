import { Expose } from 'class-transformer';
export class QuizUserDetailsDto {
    @Expose() id: number;
    @Expose() quiz_id: number
    @Expose() question_id: number
    @Expose() user_id: number
    @Expose() skip: number
    @Expose() answer: string
    @Expose() correct_answer: string
    @Expose() date: number
    @Expose() qtype: string
    @Expose() user_detail_id: number
    @Expose() status: number
}
