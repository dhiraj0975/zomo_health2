import { IsOptional, IsString, IsNumber, IsUrl } from 'class-validator';
import { IsValidImage } from '../validators/IsValidImage';

export class DashboardItemDto {
    @IsOptional()
    @IsString()
    @IsValidImage()
    square_img?: string;

    @IsOptional()
    @IsString()
    @IsValidImage()
    mob_square_img?: string;

    @IsOptional()
    @IsNumber()
    square_img_link_isin?: number;

    @IsOptional()
    @IsNumber()
    square_img_link_id?: number;

    @IsOptional()
    @IsString()
    @IsUrl({}, { message: 'square_img_link must be a valid URL' })
    square_img_link?: string;
}
