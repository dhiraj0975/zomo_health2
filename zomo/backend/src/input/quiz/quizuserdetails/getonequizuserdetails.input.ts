import { Allow } from 'class-validator';
export class GetOneQuizUserDetailsInput {
    @Allow() id: number;
    @Allow() quiz_id: number;
}
