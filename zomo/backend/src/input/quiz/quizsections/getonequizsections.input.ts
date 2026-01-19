import { Allow } from 'class-validator';
export class GetOneQuizSectionsInput {
    @Allow() id: number;
    @Allow() quiz_id: number;
}
