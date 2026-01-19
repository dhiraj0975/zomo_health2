import { Allow } from 'class-validator';
export class DeleteQuizDetailsInput {
    @Allow() id: number;
    @Allow() quiz_id: number;
}
