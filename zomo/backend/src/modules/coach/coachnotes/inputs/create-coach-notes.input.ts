import { MonthlyBasis, RecurringPatternTypeCoach } from '@common-constants';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
export class CreateCoachNotesInputs {
    @IsNumber()
    @IsNotEmpty()
    user_id: number;

    @IsNumber()
    @IsNotEmpty()
    contant_type: number;

    @IsNumber()
    @IsOptional()
    coach_id?: number;

    @IsString()
    @IsNotEmpty()
    subject?: string;

    @IsString()
    @IsNotEmpty()
    start_time?: string;

    @IsNumber()
    @IsOptional()
    interaction_type?: number;

    @IsString()
    @IsNotEmpty()
    start_date?: string;

    @IsString()
    @IsOptional()
    due_date?: string;

    @IsString()
    @IsOptional()
    assign_task?: string;

    @IsString()
    @IsOptional()
    note?: string;

    @IsString()
    @IsOptional()
    timezone?: string;

    @IsEnum(RecurringPatternTypeCoach)
    @IsOptional()
    recurring_pattern_type?: RecurringPatternTypeCoach;

    @IsString()
    @IsOptional()
    weekly_basis_day?: string;

    @IsEnum(MonthlyBasis)
    @IsOptional()
    monthly_basis?: MonthlyBasis;

    @IsString()
    @IsOptional()
    monthly_date_basis?: string;

    @IsNumber()
    @IsOptional()
    monthly_basis_Type?: number;

    @IsNumber()
    @IsOptional()
    monthly_basis_day?: number;

    @IsNumber()
    @IsOptional()
    year_basis_day?: number;

    @IsNumber()
    @IsOptional()
    year_basis_month?: number;

    @IsNumber()
    @IsOptional()
    priority?: number;

    @IsNumber()
    @IsOptional()
    user_status?: number;

    @IsNumber()
    @IsOptional()
    status?: number;
}