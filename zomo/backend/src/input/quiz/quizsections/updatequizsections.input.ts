import { Allow } from 'class-validator';
export class UpdateQuizSectionsInput {
    @Allow() id: number;
    @Allow() quiz_id: number;
    @Allow() name: string;
    @Allow() description: string;
}
