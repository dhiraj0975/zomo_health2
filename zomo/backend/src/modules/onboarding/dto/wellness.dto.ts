import {
    IsNotEmpty,
    IsOptional,
    IsString,
    IsDateString,
    IsArray,
    ValidateNested,
    IsNumber,
    ValidateIf,
    Validate,
    ValidationArguments,
    registerDecorator,
    ValidationOptions, Min, IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { OnboardInterface } from 'src/interface';

// Custom decorator for end date validation
function IsEndDateAfterStartDate(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isEndDateAfterStartDate',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const obj = args.object as any;
                    const startDate = obj.start_date;
                    const endDate = value;
                    
                    if (startDate && endDate) {
                        const start = new Date(startDate);
                        const end = new Date(endDate);
                        
                        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                            return false;
                        }
                        
                        return end >= start;
                    }
                    
                    return true;
                },
                defaultMessage(args: ValidationArguments) {
                    return 'End date must be after start date';
                }
            }
        });
    };
}

// Custom decorator for requiring start date when end date exists
function IsStartDateRequiredWhenEndDateExists(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'IsStartDateRequiredWhenEndDateExists',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(_: any, args: ValidationArguments) {
                    const obj = args.object as any;
                    const { start_date, end_date } = obj;

                    // Both missing: valid
                    if (!start_date && !end_date) return true;

                    // One exists, the other doesn't: invalid
                    if ((start_date && !end_date) || (!start_date && end_date)) return false;

                    // Both exist: check order
                    const start = new Date(start_date);
                    const end = new Date(end_date);

                    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

                    return end >= start;
                },
                defaultMessage(_: ValidationArguments) {
                    return 'Both start and end dates must be provided, and end date must not be before start date';
                }
            }
        });
    };
}

export class ActivityDataDto {
    @IsNotEmpty({ message: 'Activity ID should not be empty, blank, or 0 and must be a valid positive number' })
    @IsNumber({}, { message: 'Activity ID must be a number' })
    @Min(1, { message: 'Activity ID must be a positive number greater than 0' })
    @Transform(({ value }) => value === '' ? undefined : Number(value))
    activity_id: number;

    @IsOptional()
    @ValidateIf((o) => o.cust_name !== undefined && o.cust_name !== null && o.cust_name !== '')
    @IsNotEmpty({ message: 'Custom name should not be empty or blank' })
    @IsString({ message: 'Custom name must be a string' })
    cust_name?: string;

    @IsOptional()
    @ValidateIf((o) => o.detail !== undefined && o.detail !== null && o.detail !== '')
    @IsNotEmpty({ message: 'Detail should not be empty or blank' })
    @IsString({ message: 'Detail must be a string' })
    detail?: string;
}

export class RewardsDto {
    @IsNotEmpty({ message: 'Reward name should not be empty or blank' })
    @IsString({ message: 'Reward name must be a string' })
    cust_name?: string;


    @IsNotEmpty({ message: 'Reward amount should not be empty, blank, or 0 and must be a valid positive number' })
    @IsNumber({}, { message: 'Reward amount must be a number' })
    @Min(1, { message: 'Reward amount must be a positive number greater than 0' })
    @Transform(({ value }) => value === '' ? undefined : Number(value))
    amt_user?: number;
}

export class WellnessDto {
    step: string;

    @IsOptional()
    @IsNotEmpty({ message: 'Campaign name should not be empty or blank' })
    @IsString({ message: 'Campaign name must be a string' })
    campaign_name: string;

    @IsOptional()
    @IsDateString({}, { message: 'Invalid start date format' })
    @IsStartDateRequiredWhenEndDateExists()
    start_date?: string;

    @IsOptional()
    @IsDateString({}, { message: 'Invalid end date format' })
    @IsStartDateRequiredWhenEndDateExists()
    @IsEndDateAfterStartDate()
    end_date?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ActivityDataDto)
    activity_data?: ActivityDataDto[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RewardsDto)
    rewards?: RewardsDto[];

    @IsOptional()
    user?: OnboardInterface;

    @IsOptional()
    @IsNumber()
    completed?: number;

}
