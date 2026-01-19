import {Expose, Transform, Type} from 'class-transformer';
export class ZipDownloadsDto {
    @Expose()
    id: number;
    @Expose()
    zip_filename: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}