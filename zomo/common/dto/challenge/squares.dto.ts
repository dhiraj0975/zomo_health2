import { Expose, Transform, Type } from 'class-transformer';
import { InterlinksDto } from '../company';
import { CardsDto } from './cards.dto';
const S3_URL =  process.env.S3_URL_PROD
export class SquaresDto {
    @Expose() id: number;
    @Expose() card_id: number;
    @Expose() schedule_id: number;
    @Expose() org_id: number;
    @Expose() name: string;
    @Expose() description: string;
    @Expose() parent_id: number = 0;
    @Expose() order_no: number;
    @Expose() link_type: number = 0;
    @Expose() link_id?: number;
    @Expose() link?: string;
    @Expose() status: number;
    @Expose() created_date: string;
    @Expose() modified_date: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('chsquarel_') ? S3_URL + value : value && value.includes('square') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    logo: string;
    @Expose()
    @Type(() => CardsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                name: value.name,
            };
        }
    })
    card: CardsDto;
    @Expose()
    @Type(() => InterlinksDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                linktitle: value.linktitle,
                newlink: value?.newlink,
            };
        }
    })
    internal_link: InterlinksDto;
}
