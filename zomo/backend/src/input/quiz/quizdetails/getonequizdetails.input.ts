import { Allow } from 'class-validator';
export class GetOneQuizDetailsInput {
    @Allow() id: number;
    @Allow() quiz_id: number;
    @Allow() quiz_type: string;
}
