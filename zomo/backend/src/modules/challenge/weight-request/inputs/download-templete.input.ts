import { IsNotEmpty, IsNumber } from 'class-validator';

export class DownloadTempleteInput {
    @IsNumber()
    @IsNotEmpty()
    org_id: number;
}
