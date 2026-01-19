import { Allow } from 'class-validator';
export class QuizWebinarGetOneInput {
    @Allow() id?: number;
}
