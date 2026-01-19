import { Allow } from 'class-validator';
export class GetoneAssignQuizOrgInput {
    @Allow() id: number;
    @Allow() quiz_id: number;
    @Allow() organization_id: number;
    @Allow() type: string;
}
