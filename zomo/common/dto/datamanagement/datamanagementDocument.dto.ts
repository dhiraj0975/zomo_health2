import { Expose, Transform, Type } from 'class-transformer';
let DOMAIN_URL = process.env.DOMAIN;
export class DataManagementDocumentDto {
    @Expose() id: number;
    @Expose() title: string;
    @Expose() organization_id: number;
    @Expose() description: string;
    @Expose() file_name: string;
    @Expose() is_global: number;
    @Expose() is_login: number;
    @Expose() status: number;
    @Expose() created_by: number;
    @Expose() created: string;
    @Expose() modified: string;
    @Expose() doc_name: string;

    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (!obj || !obj.id) return '';

        const baseUrl = DOMAIN_URL;
        const path = obj.is_login === 1 ? 'download-document' : 'download-pdocument';

        return `https://${baseUrl}/${path}/15/${obj.id}`;
    }, { toClassOnly: true })
    doc_url: string;
}
