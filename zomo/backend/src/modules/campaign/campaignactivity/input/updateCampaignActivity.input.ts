import { Allow } from 'class-validator';
import { CreateCampaignActivityInput } from './createCampaignActivity.input';
export class UpdateCampaignActivityInput extends CreateCampaignActivityInput {
    @Allow() id: number;
}
