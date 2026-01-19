import { Allow } from 'class-validator';
export class CreateCommunicationEmailGroupsInput {
    @Allow() id: number;
    @Allow() group_name: string;
    @Allow() orgs_ids: string;
    @Allow() role_id: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() status: number;
}
