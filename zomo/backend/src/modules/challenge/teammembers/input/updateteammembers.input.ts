import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateTeamMembersInput } from './createteammembers.input';

export class UpdateTeamMembersInput extends PartialType(CreateTeamMembersInput) {
    @IsOptional()
    @IsNumber() id?: number;
    @IsOptional()
    @IsString() action?: string;
    @IsOptional()
    @IsNumber() member_id?: number;
    @IsOptional()
    @IsNumber() inviter_id?: number;
    @IsOptional()
    @IsString() reorder_ids?: string;
    @IsOptional()
    @IsNumber() team_member_id?: number;
}


