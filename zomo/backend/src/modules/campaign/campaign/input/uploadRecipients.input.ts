import { Allow, IsNotEmpty } from 'class-validator';

export class UploadRecipientsInput {
    @IsNotEmpty()
   
    campaign_id: number;
}
