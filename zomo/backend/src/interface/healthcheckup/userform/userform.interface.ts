import { UserInterface } from "src/interface/user";
import { FormInstructionInterface } from "../forminstruction";
import { UserformsattachmentsInterface } from "../userformsattachments/userformsattachments.interface";

export interface UserFormInterface {
    id: number;
    org_id: string;
    is_history: string;
    user_id: string;
    form_id: string;
    zip_filename: string;
    decline_reason: string;
    status: number;
    popup_status: number;
    added_date: string;
    updated_date: string;
    user?: UserInterface;
    formInstructions?: FormInstructionInterface;
    Userformsattachments?: UserformsattachmentsInterface;
}
