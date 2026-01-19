import { Expose, Transform, Type } from 'class-transformer';
import { FitnessActivityDto } from './fitnessactivity.dto';
import { OrgInvitesDto } from './orginvites.dto';
import { WeeksDto } from './weeks.dto';
const S3_URL =  process.env.S3_URL_PROD
export class ChallengeDto  {
    @Expose() id: number;
    @Expose() uid: number;
    @Expose() challenge_name: string;
    @Expose() challenge_desc: string;
    @Expose() challenge_type: string;
    @Expose() biomatrics: string;
    @Expose() biomatrics_criteria: string;
    @Expose() data_entry: string;
    @Expose() data_interval: string;
    @Expose() bio_challenge_type: string;
    @Expose() activity_id: number;
    @Expose() activity_desc: string;
    @Expose() stepactivity_type: string;
    @Expose() max_time_day: number;
    @Expose() numberofsteps: number;
    @Expose() startdate: string;
    @Expose() enddate: string;
    @Expose() weektimeframe: number;
    @Expose() requirementbased: number;
    @Expose() numberofday: number;
    @Expose() numberofweek: number;
    @Expose() oz_water_per_day: number;
    @Expose() status: number;
    @Expose()
    added_date: string;
    @Expose()
    updated_date: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('challengei') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    icon: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('challengel') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    logo: string;
    @Expose()
    org_invite: OrgInvitesDto;
    @Expose()
    fitness: FitnessActivityDto;
    @Expose()
    @Type(() => WeeksDto)
    @Transform(({ obj }) => {
        if (obj && obj.weeks) {
            for(let week of obj.weeks){
                week.logofile = week?.logofile?.includes('chweekl_') ? S3_URL + week.logofile : week.logofile;
                if(obj.challenge_type == 'H'){
                    week.activity = week.health_activity ?? week.activity;
                }
                delete week.health_activity;
                for(let day of week.days){
                    day.logofile = day?.logofile?.includes('chdayl_') ? S3_URL + day.logofile : day.logofile;
                    if(obj.challenge_type == 'H'){
                        day.activity = day.health_activity ?? week.activity;
                    }
                    delete day.health_activity;
                }
            }
            return obj.weeks;
        } else {
            return obj.weeks;
        }
    }, {
        toClassOnly: true,
    })
    weeks: WeeksDto;
}
