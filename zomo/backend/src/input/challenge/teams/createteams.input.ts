import { Allow } from 'class-validator';
export class CreateTeamsInput {
    @Allow() group_id: number;
    @Allow() schedule_id: number;
    @Allow() tname: string;
    @Allow() logo: string;
    @Allow() org_id: number;
    @Allow() team_size: number;
    @Allow() dept_id: number;
    @Allow() loc_id: number;
    @Allow() dept_with_loc_id: number;
    @Allow() created_by: number;
    @Allow() status: number;
    @Allow() join_challenge : number;
}
