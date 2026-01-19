import {Expose} from 'class-transformer';
export class MarketingDto {
    @Expose()
    id: number;
    @Expose()
    email: string;
    @Expose()
    name: string;
    @Expose()
    company: string;
    @Expose()
    mobile: string;
    @Expose()
    message: string;
    @Expose()
    subscribe: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
