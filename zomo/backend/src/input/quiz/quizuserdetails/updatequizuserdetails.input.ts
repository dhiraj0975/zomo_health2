import { Allow } from 'class-validator';
export class UpdateQuizUserDetailsInput {
    @Allow() id: number;
    @Allow() quiz_id: number;
    @Allow() question_id: number;
    @Allow() user_id: number;
    @Allow() skip: number;
    @Allow() answer: string;
    @Allow() correct_answer: string;
    @Allow() date: string;
    @Allow() qtype: string;
    @Allow() user_detail_id: number;
    @Allow() status: number;
}
