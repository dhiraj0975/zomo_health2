import { Allow } from 'class-validator';
export class DeleteActivityTrackerFormInput {
    @Allow() id: number;
    @Allow() org_id: string;
    @Allow() role_id: number;
}
