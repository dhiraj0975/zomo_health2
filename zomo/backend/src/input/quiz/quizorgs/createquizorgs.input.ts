import { Allow } from 'class-validator';
export class CreateQuizOrgInput {
    @Allow() quiz_id: number;
    @Allow() org_id: string;
    @Allow() status: number;
}
