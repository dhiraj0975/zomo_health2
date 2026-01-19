import { Allow } from 'class-validator';
export class QuizWebinarDeleteInput {
    @Allow() id?: number;
}
