import { Allow } from 'class-validator';
export class GetOneQuizOrgInput {
    @Allow() id: number;
    @Allow() quiz_id: number;
    @Allow() org_id: number;
}
