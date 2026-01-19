import { Allow, IsNumber, IsOptional, IsString } from 'class-validator';
export class MyChallengeInput {
    @IsNumber()
    @IsOptional()
    @Allow() id?: number;
    @IsNumber()
    @IsOptional()
    @Allow() challenge_id?: number;
    @IsNumber()
    @IsOptional()
    @Allow() org_id?: number;
    @IsNumber()
    @IsOptional()
    @Allow() status?: number;
    @IsString()
    @IsOptional()
    @Allow() logo?: string;
    @IsString()
    @IsOptional()
    @Allow() buttonClick?: string;
    @IsNumber()
    @IsOptional()
    @Allow() agreement_id?: number;
    @IsString()
    @IsOptional()
    @Allow() agreement_name?: string;
    @IsString()
    @IsOptional()
    @Allow() agreement_signed?: string;
    @IsNumber()
    @IsOptional()
    @Allow() trek_level_id?: number;
    @IsNumber()
    @IsOptional()
    @Allow() team_id?: number;
    @IsString()
    @IsOptional()
    @Allow() team_name?: string;
    @IsNumber()
    @IsOptional()
    @Allow() is_invited_challenge?: number;
    @IsString()
    @IsOptional()
    @Allow() exitTeamStatus?: string;
    @IsString()
    @IsOptional()
    @Allow() exitTeamIds?: string;
    @IsOptional()
    @Allow() show_type?: number;
    @IsOptional()
    @Allow() dashboardList?: number;
    @IsNumber()
    @IsOptional()
    @Allow() signature_type?: number;
}
