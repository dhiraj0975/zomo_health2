import { Transform, Expose } from 'class-transformer';
export class CommunicationTemplateTextsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() type: number;
    @Expose() text: string;
    @Expose()
    @Transform(({ value }) => {
        const userDomain = 'https://' + process.env.DOMAIN;
        return value?.replaceAll('{{IMAGE_BASE_URL}}', userDomain);
    })
    new_text?: string; // with domain Link (image)
    // @Expose()
    // new_text: string; // with out domain Link
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
