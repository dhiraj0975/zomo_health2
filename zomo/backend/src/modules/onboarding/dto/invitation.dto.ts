import {
    IsOptional,
    IsString,
    IsArray,
    IsEmail,
    ArrayMinSize,
    IsNotEmpty,
    ValidateIf,
    IsNumber,
} from 'class-validator';
import { OnboardInterface } from 'src/interface';

export class InvitationDto {
    step: string;

    @IsOptional()
    @IsNumber({}, { message: 'sendToAll must be a number' })
    sendToAll?: number;

    @ValidateIf(o =>
        o.sendToAll !== 1 &&
        o.recipient_emails !== undefined &&
        o.recipient_emails.length > 0
    )
    @IsNotEmpty({ message: 'Subject is required when recipient_emails is provided' })
    @IsString({ message: 'Subject must be a string' })
    subject?: string;

    @ValidateIf(o =>
        o.sendToAll !== 1 &&
        o.subject !== undefined &&
        o.subject.trim() !== ''
    )
    @IsArray({ message: 'Recipient emails must be an array' })
    @ArrayMinSize(1, { message: 'At least one recipient email is required when subject is provided' })
    @IsEmail({}, { each: true, message: 'Each recipient email must be a valid email address' })
    recipient_emails?: string[];

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray({ message: 'attachment must be an array' })
    @IsString({ each: true, message: 'Each attachment must be a string' })
    @ValidateIf(o => !o.attachment || (o.attachment && o.attachment.length <= 3), { message: 'Maximum 3 attachments allowed' })
    @ValidateIf(o => {
        if (!o.attachment || !Array.isArray(o.attachment)) return true;
        const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
        return o.attachment.every((file: string) => {
            const extension = file.split('.').pop()?.toLowerCase();
            return extension && allowedExtensions.includes(extension);
        });
    }, { message: 'Only PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF files are allowed' })
    attachment?: string[];




    @IsOptional()
    user?: OnboardInterface;

    @IsOptional()
    @IsNumber()
    completed?: number;

}
