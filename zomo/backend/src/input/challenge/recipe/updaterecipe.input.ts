import { Allow } from 'class-validator';
export class UpdateRecipeInput {
    @Allow() id: number;
    @Allow() schedule_id: number;
    @Allow() user_id: number;
    @Allow() org_id: number;
    @Allow() recipe_name: string;
    @Allow() recipe_type: number;
    @Allow() recipe_ingredients: string;
    @Allow() recipe_direction: string;
    @Allow() recipe_additional_notes: string;
    @Allow() recipe_healthy: string;
    @Allow() recipe_image: string;
    @Allow() status: number = 0;
    @Allow() added_source: number;
    @Allow() created_by: number;
    @Allow() created: number;
    @Allow() updated: number;
}
