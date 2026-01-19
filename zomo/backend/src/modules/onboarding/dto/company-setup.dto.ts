import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsArray,
    Matches,
    ValidateNested, Allow, isNotEmpty, IsNumber, ValidateIf, IsUrl, IsIn,
} from 'class-validator';
import {Transform, Type} from 'class-transformer';
import { IsValidImage } from '../validators/IsValidImage';
import { OnboardInterface } from 'src/interface';
export class DashboardDataDto {
    @Transform(({ value }) => value === '' || value === undefined ? 0 : Number(value))
    @IsNumber()
    @IsOptional()  // Optional field
    is_default?: number;

    @IsOptional()
    @ValidateIf(o => o.is_default === 0 || o.is_default === undefined || o.is_default === null)
    @Matches(/\.(jpg|jpeg|png|gif)$/i, {
        message: 'Square img must be a valid image URL with extensions jpg, jpeg, png, or svg',
    })
    @IsNotEmpty({
        message: 'Square img should not be empty or blank',
    })
    @IsString()
    square_img?: string;

    @IsOptional()
    @ValidateIf(o => o.is_default === 0 || o.is_default === undefined || o.is_default === null)
    @Matches(/\.(jpg|jpeg|png|gif)$/i, {
        message: 'Mob square img must be a valid image URL with extensions jpg, jpeg, png, or svg',
    })
    @IsNotEmpty({
        message: 'Mob square img should not be empty or blank',
    })
    @IsString()
    mob_square_img?: string;

    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : Number(value))
    @IsIn([0, 1], { message: 'Square img link setting must be either 0 or 1' })
    square_img_link_isin?: number;

    @ValidateIf(o => o.square_img_link_isin === 1)
    @Transform(({ value }) => value === '' ? undefined : Number(value))
    @IsNumber({}, { message: 'Square img link ID must be a number' })
    @IsNotEmpty({ message: 'Square img link ID is required when square_img_link_isin is 1' })
    square_img_link_id?: number;

    @ValidateIf(o => o.square_img_link_isin === 0)
    @IsUrl({ require_protocol: true }, { message: 'Square img link must be a valid URL with http:// or https://' })
    @IsNotEmpty({ message: 'Square img link is required when square_img_link_isin is 0' })
    @IsString()
    square_img_link?: string;
}

export class CompanySetupDto {
    step: string;

    @IsOptional()
    @IsNotEmpty({ message: 'Company name should not be empty or blank' })
    @IsString()
    company_name: string;

    @IsOptional()
    @IsString()
    @Matches(/\.(jpg|jpeg|png|gif|bmp)$/i, {
        message: 'Company logo must be an image file (jpg, jpeg, png, svg)',
    })
    @IsNotEmpty({
        message: 'Company logo should not be empty or blank',
    })
    company_logo?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty({
        message: 'Street address should not be empty or blank',
    })
    street_address?: string;

    @IsOptional()
    @IsUrl({ require_protocol: true }, { message: 'Website must be a valid URL with http:// or https://' })
    website?: string;

    @IsOptional()
    @IsNotEmpty({
        message: 'Email should not be empty or blank',
    })
    @IsEmail({}, { message: 'Invalid email address' })
    email?: string;

    @IsOptional()
    @Matches(/^\+?[1-9]\d{9,14}$/, {
        message: 'Phone number must be valid, with 10 to 15 digits in total (including optional country code)',
    })
    phone?: string;

    @IsOptional()
    @IsString()
    b_company_name?: string;

    @IsOptional()
    @IsString()
    b_name?: string;

    @IsOptional()
    @IsNotEmpty({
        message: 'Broker email should not be empty or blank',
    })
    @IsEmail({}, { message: 'Invalid broker email' })
    b_email?: string;

    @IsOptional()
    @IsString()
    @Matches(/^#([0-9a-fA-F]{6})$/, {
        message: 'Theme color must be a valid 6-digit hex color code like #555555',
    })
    theme_color?: string;


    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DashboardDataDto)
    dashboard_data?: DashboardDataDto[];

    @IsOptional()
    user?: OnboardInterface;

    @IsOptional()
    @IsNumber()
    completed?: number;
}
