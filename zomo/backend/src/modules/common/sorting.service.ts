import { Injectable } from '@nestjs/common';
@Injectable()
export class SortingService {
    async sortCampaignData(s_type: string = 'asc', data:any[] = [], fieldOne: string = null, fieldTwo: string = null): Promise<any> {
        if(fieldOne != null){
            if(s_type == 'asc'){
                data = data.sort((a, b) => {
                    if (a[fieldOne] === 0 || a[fieldOne] === undefined || a[fieldOne] === null) return 1;
                    if (b[fieldOne] === 0 || b[fieldOne] === undefined || b[fieldOne] === null) return -1;
                    if (a[fieldOne] !== b[fieldOne]) {
                        return a[fieldOne] - b[fieldOne];
                    }
                    if(fieldTwo == 'tab_titled' || fieldTwo == 'full_name'){
                        return a[fieldTwo].localeCompare(b[fieldTwo]);
                    }else{
                        if(fieldTwo != null){
                            return a[fieldTwo] - b[fieldTwo];
                        }
                    }
                });
            }else if(s_type == 'desc'){
                data = data.sort((a, b) => {
                    if (b[fieldOne] === 0 || b[fieldOne] === undefined || b[fieldOne] === null) return 1;
                    if (a[fieldOne] === 0 || a[fieldOne] === undefined || a[fieldOne] === null) return -1;
                    if (b[fieldOne] !== a[fieldOne]) {
                        return b[fieldOne] - a[fieldOne];
                    }
                    if(fieldTwo == 'tab_titled'){
                        return b[fieldTwo].localeCompare(a[fieldTwo]);
                    }
                    else if(fieldTwo == 'full_name'){
                        return a[fieldTwo].localeCompare(b[fieldTwo]);
                    }else{
                        if(fieldTwo != null){
                            return b[fieldTwo] - a[fieldTwo];
                        }
                    }
                });
            }else if(s_type == 'asc_date'){
                data = data.sort((a, b) => {
                    return new Date(a[fieldOne]).getTime() - new Date(b[fieldOne]).getTime();
                });
            }else if(s_type == 'desc_date'){
                data = data.sort((a, b) => {
                    return new Date(b[fieldOne]).getTime() - new Date(a[fieldOne]).getTime();
                });
            }
        }
        return data;
    }
}
