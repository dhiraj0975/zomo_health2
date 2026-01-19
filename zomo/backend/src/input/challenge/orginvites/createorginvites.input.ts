import { Allow } from 'class-validator';
export class CreateOrgInvitesInput {
    @Allow() challenge_id: number;
    @Allow() org_id: number;
    @Allow() start_date: string;
    @Allow() end_date: string;
    @Allow() status: number;
}
