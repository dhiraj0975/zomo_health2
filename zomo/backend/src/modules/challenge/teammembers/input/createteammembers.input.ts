import { IsNumber, IsString } from 'class-validator';
export class CreateTeamMembersInput {
    @IsNumber() team_id: number;
    @IsNumber() org_id: number;
    @IsNumber() user_id: number;
    @IsNumber() user_order: number;
    @IsNumber() iscaptain: number;
    @IsNumber() baton_status: number;
    @IsString() baton_start: string;
    @IsNumber() status: number;
    @IsNumber() schedule_id?: number;
}
