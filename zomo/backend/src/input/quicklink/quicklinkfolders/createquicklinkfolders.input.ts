import { Allow } from 'class-validator';
export class CreateQuickLinkFoldersInput {
    @Allow() c_companies_id: string;
    @Allow() folder_name: string;
    @Allow() status: number;
    @Allow() healthplanname: string;
    @Allow() usernotonhealthplan: number;
    @Allow() global_folder: number;
    @Allow() created_by: number;
}
