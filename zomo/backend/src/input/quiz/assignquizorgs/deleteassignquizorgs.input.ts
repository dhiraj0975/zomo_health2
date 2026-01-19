import { Allow } from 'class-validator';
export class DeleteAssignQuizOrgInput {
    @Allow() id: number;
    @Allow() quiz_id: number;
    @Allow() type: string;
    @Allow() webinar_id: number;
    @Allow() org_id: number | string;
    @Allow() organization_id: string;
}
