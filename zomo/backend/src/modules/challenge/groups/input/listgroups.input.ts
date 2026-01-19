import { Allow } from 'class-validator';
export class ListGroupsInput {
    @Allow() schedule_id?: number;
    @Allow() org_id?: number;
    @Allow() type?: string;
}