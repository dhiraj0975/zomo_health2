import { Allow } from 'class-validator';
export class DeleteQuizUserDetailsInput {
    @Allow() id: number;
    @Allow() quiz_id: number;
}
