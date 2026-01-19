import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
} from 'class-validator';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];

export function IsValidImage(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isValidImage',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (typeof value !== 'string') return false;

                    const matches = value.match(/^data:(.+);base64,(.*)$/);
                    if (!matches) return false;

                    const mimeType = matches[1];
                    const base64Data = matches[2];

                    if (!ALLOWED_TYPES.includes(mimeType)) return false;

                    const buffer = Buffer.from(base64Data, 'base64');
                    return buffer.length <= MAX_FILE_SIZE;
                },
                defaultMessage(args: ValidationArguments) {
                    return 'Invalid image. Must be SVG, PNG, JPG, or GIF, and less than 2MB.';
                },
            },
        });
    };
}
