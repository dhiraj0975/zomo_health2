import { Allow, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
export class CreateUserInput {
    @Allow() id: number;
    @Allow() code: string;
    @Allow() role_id: number;
    @Allow() first_name: string;
    @Allow() middle_name: string;
    @Allow() last_name: string;
    @Allow() full_name?: string;
    @Allow() gender: string;
    @IsOptional() 
    @IsString({ message: 'Username must be a string.' })
    @MinLength(3, { message: 'Username must be at least 3 characters long.' })
    @MaxLength(61, { message: 'Username must be no more than 61 characters long.' })
    @Matches(/^[a-zA-Z0-9_-]+$/, {
        message: 'Username can only contain letters, numbers, underscores, and hyphens.',
    })
    username?: string;
    @IsOptional()
    @IsEmail({}, { message: 'Please provide a valid email address.' })
    email: string;
    @Allow() p_email: string;
    @Allow() employeeid: string;
    @Allow() securitycode: string;
    @Allow() timezone: string;
    @Allow() password: string;
    @Allow() new_password: string;
    @Allow() dob: string;
    @Allow() date_of_hire: string;
    @Allow() last_login: string;
    @Allow() docpassword: string;
    @Allow() ssoIdentifier: string;
    @Allow() profile_image: string;
    @Allow() activation_key: string;
    @Allow() on_insurance_plan: string;
    @Allow() insurance_plan_name: string;
    @Allow() location: string;
    @Allow() department_id: number;
    @Allow() physiciantype_id: number;
    @Allow() pname: string;
    @Allow() companytype_id: number;
    @Allow() org_id: number;
    @Allow() membership_code: string;
    @Allow() entered_code: string;
    @Allow() num_login: number;
    @Allow() user_type: number;
    @Allow() on_current_census: string;
    @Allow() relationship_id: string;
    @Allow() is_aro_build: number;
    @Allow() status: number;
    @Allow() refresh_token: string;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() autouser: number;
    @Allow() stopmailsend: number;
    @Allow() assign_org: string;
    @Allow() popup_status: number;
    @Allow() preferred_lang: number;
}
