import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from '../company';
import {AssessmentHaOptionsDto} from './index';
export class AssessmentHaQuestionsDto {
    @Expose() id: number;
    @Expose() questioncat_id: number;
    @Expose() language_id: number;
    @Expose() main_question_id: number;
    @Expose() title: string;
    @Expose() question_title: string;
    @Expose() type: number;
    @Expose() show: number;
    @Expose() company_id: string;
    @Expose()
    @Type(() => Number)
    @Transform(({ value }) => (value == null ? 0 : value), {
        toClassOnly: true,
    })
    parent_id: number;
    @Expose()
    @Type(() => Number)
    @Transform(({ value }) => (value == null ? 0 : value), {
        toClassOnly: true,
    })
    parent_option_id: number;
    @Expose() order: number;
    @Expose() general: string;
    @Expose() required: number;
    @Expose() na: number;
    @Expose() question_code: string;
    @Expose() chart_group: string;
    @Expose() mchart_group_wt: number;
    @Expose() fchart_group_wt: number;
    @Expose() msection_wt: number;
    @Expose() fsection_wt: number;
    @Expose() age_considered: number;
    @Expose() age_limit: number;
    @Expose() age_condition: number;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value && value.length) {
            for(let element of value){
                Object.keys(element).forEach((key) => {
                    if (!['id','company_name'].includes(key)) {
                      delete element[key];
                    }
                  });
            }
            return value;
        }
        else {
            return []
        }
    })
    company: CompaniesDto[];
    @Expose()
    @Type(() => AssessmentHaQuestionsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                question_title: value.question_title,
            };
        }
        else {
            return null
        }
    })
    parent: AssessmentHaQuestionsDto;
    @Expose()
    @Type(() => AssessmentHaOptionsDto)
    @Transform(({ obj }) => {
        if (obj.option) {
            let answer: any = obj.answer;
            if (obj.type == '1') {
                const optionMenu = (items,answer) => {
                    const map = new Map();
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        map.set(item.id, item);
                    }
                    const rootItems = [];
                    items.forEach(item => {
                        const option = map.get(item.id);
                        if (answer.includes(item.id.toString())) {
                            option.optionStatus = true
                        } else {
                            option.optionStatus = false
                        }
                        if (item.parent_id === 0) {
                            rootItems.push(option);
                        } else {
                            const parent = map.get(item.parent_id);
                            parent.optionMenu = [...(parent.optionMenu || []), option];
                        }
                    });
                    return rootItems;
                };
                return optionMenu(obj.option,answer)
            } else {
                const rootItems = [];
                obj.option.forEach(item => {
                    if (answer.includes(item.id.toString())) {
                        item.optionStatus = true
                    } else {
                        item.optionStatus = false
                    }
                    rootItems.push(item);
                });
                return rootItems
            }
        } else {
            return null
        }
    }, {
        toClassOnly: true,
    })
    option: AssessmentHaOptionsDto;
}
