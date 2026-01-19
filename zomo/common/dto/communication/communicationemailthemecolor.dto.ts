import { Transform, Type, Expose } from 'class-transformer';
export class CommunicationEmailThemeColorDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() newsletterthemecolors: string;
    @Expose() updated_by: number;
}