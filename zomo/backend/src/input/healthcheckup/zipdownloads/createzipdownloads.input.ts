import { Allow } from 'class-validator';
export class CreateZipDownloadsInput {
    @Allow() zip_filename: string;
    @Allow() status: number;
}
