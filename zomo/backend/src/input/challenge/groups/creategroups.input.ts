import { Allow } from 'class-validator';
export class CreateGroupsInput {
    @Allow() schedule_id: number;
    @Allow() org_id: number;
    @Allow() name: string;
    @Allow() logo: string;
    @Allow() status: number;
}
