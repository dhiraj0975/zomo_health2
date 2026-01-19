import { Allow } from 'class-validator';
export class ListTeamsInput {
    @Allow() group_id: number;
    @Allow() schedule_id: number;
    @Allow() org_id: number;
    @Allow() type: string;
}