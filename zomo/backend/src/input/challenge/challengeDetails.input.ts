import { ActivitiesDto, ChallengeDto, ScheduleChallengeDto } from '@common-constants';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';

export class challengeDetailsInput {
  @IsNumber()
  challenge_id: number;

  @IsString()
  challenge_name : string;

  @IsString()
  challengestatus : string;

  @IsString()
  custom_logo: string;

  @IsString()
  customdesc : string;

  @IsString()
  customname : string;

  @IsOptional()
  @IsString()
  edate ?: string;

  @IsOptional()
  @IsBoolean()
  invitation ?: boolean;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  sdate ?: string;

  @IsNumber()
  startdays: number;

  @IsNumber()
  totaldays: number;

  @IsOptional()
  @IsString()
  ucurrentdate?: string;

  @IsNumber()
  uptodays : number;
  
}

export class ChallengeDetailsInput {
  @IsNumber()
  id: number;

  @IsOptional()
  @IsString()
  added_date?: string;

  @IsOptional()
  @IsString()
  completed_lock_locations?: string;

  @IsNumber()
  in_park_complete: number;

  @IsNumber()
  in_ranking: number;

  @IsNumber()
  in_week_complete: number;

  @IsOptional()
  @IsString()
  joinDate?: string;
  
  @IsOptional()
  @IsString()
  relay_race_detail?: string;

  @IsNumber()
  trek_level_id: number;

  @ValidateNested()
  @Type(() => ActivitiesDto)
  ac: ActivitiesDto;

  @ValidateNested()
  @Type(() => ChallengeDto)
  ch: ChallengeDto;

  @ValidateNested()
  @Type(() => ScheduleChallengeDto)
  @Transform(({ value }) => {
    if (value){
      value['time_elapsed'] = value['time_elapsed'];
    }
    return value;
  })
  sc: ScheduleChallengeDto;

  @ValidateNested()
  @Type(() => challengeDetailsInput)
  challengeDetails: challengeDetailsInput;
}