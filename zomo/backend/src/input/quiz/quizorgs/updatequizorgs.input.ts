import { Allow } from 'class-validator';
export class UpdateQuizOrgInput {
    @Allow() id: number;
    @Allow() quiz_id: number;
    @Allow() org_id: string;
    @Allow() status: number;
}
