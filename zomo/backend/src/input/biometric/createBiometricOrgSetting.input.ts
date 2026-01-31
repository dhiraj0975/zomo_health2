import { Type } from "class-transformer";
import { Allow, IsArray, ValidateNested } from "class-validator";
import { CreateOrgBiometricInput } from "./createOrgBiometricInput";
export class CreateBiometricOrgSettingInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() is_based: number;
    @Allow() is_hire: number;
    @Allow() is_required: number;
    @Allow() qualifie_type: number;
    @Allow() option: number;
    @Allow() category_option: number;
    @Allow() is_physician_follow: string;
    @Allow() is_talk_to_coach: string;
    @Allow() is_join_challenge: string;
    @Allow() is_learn_more: string;
    @Allow() is_hire_date: string;
    @Allow() is_complete_message: string;
    @Allow() is_incomplete_message: string;
    @Allow() is_ontrack_message: string;
    @Allow() status: number;
    // @Allow() 
    // setting?: CreateOrgBiometricInput[];
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateOrgBiometricInput)
    setting: CreateOrgBiometricInput[];
}
