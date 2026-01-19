import { Expose, Transform } from 'class-transformer';
import { appConstant } from '../../constant/app.constant';
export class SubmmittedFormsDto {
    // @Expose() company_id: number;
    @Expose()
    date_obtain: string;
    @Expose()
    @Transform(({ obj }) => {
        if (!obj) {
            return null;
        }else{
            return `${obj.first_name} ${obj.last_name}`
        }   
    })
    full_name:string
    @Expose()
    @Transform(({ obj }) => {
        if (!obj) {
            return null;
        }
        if (obj) {
            let resultedData = {};
            let i = 1;
            if (obj.program_custom_name !== null) {
                var programCustomNameArr = JSON.parse(obj.program_custom_name);
            }
            while (i <= 6) {
                if (programCustomNameArr && programCustomNameArr[i] !== '' && programCustomNameArr[i] !== null && programCustomNameArr[i] !== 'null') {
                    resultedData[i] = programCustomNameArr[i];
                } else {
                    resultedData[i] = appConstant.HEALTH_FORM_DEFAULT_DATA[i];
                }
                i++;
            }
            if(obj.activity_id){
                let actId = (obj.activity_id).split(',').filter(id => id.trim() !== '');
                if(actId.includes('8784')){
                    obj.form_id = 5
                }
                if(actId.includes('9360')){
                    obj.form_id = 6
                }
            }
            return resultedData[obj.form_id] || null
        } else {
            return null
        }
    }, {
        toClassOnly: true,
    })
    form_type: string;
}
