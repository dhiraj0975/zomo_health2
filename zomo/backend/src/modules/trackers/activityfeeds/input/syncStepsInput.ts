import { Type } from 'class-transformer';
import {
    Allow,
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsString,
    Matches,
    ValidateNested
} from 'class-validator';

class StepEntry {
    @IsNotEmpty({ message: 'Date is required!' })
    @IsString({ message: 'Date must be a string!' })
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'Date must be in YYYY-MM-DD format!',
    })
    date: string;

    @IsNotEmpty({ message: 'Steps value is required!' })
    @IsString({ message: 'Steps must be a string!' })
    steps: string;

    @IsNumber({}, { message: 'Calories must be a number!' })
    @Type(() => Number) 
    calories: number;
}

export class SyncStepsInput {
  @Allow() user_id: number;
  @Allow() data_type: number;
  @Allow() app_name: string;
  @Allow() appId: string;
  @Allow() timezone: string;

  @IsArray({ message: 'Steps must be an array!' })
  @ValidateNested({ each: true })
  @Type(() => StepEntry)
  steps: StepEntry[];
}
