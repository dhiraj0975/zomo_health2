import { Transform, Type, Expose } from 'class-transformer';
import {AssessmentQuestionsDto} from "./index";
export class AssessmentTabsDto {
    @Expose() id: number;
    @Expose() organization_id: number;
    @Expose() title: string;
    @Expose() sort_order: number;
    @Expose() 'marker-low': string;
    @Expose() 'marker-mod': string;
    @Expose() 'marker-high': string;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => AssessmentQuestionsDto)
    @Transform(({ obj }) => {
        let object = [];
        let dob = obj.dob;
        if (obj.aq) {
            let earArr = obj?.ear?.eaa;
            let earObj = {};
            if (earArr) {
                earArr.forEach(item => {
                    if (item.answer) {
                        earObj[`${item.option_id}`] = [...(earObj[`${item.option_id}`] || []), item]
                    } else {
                        earObj[`${item.option_id}`] = item
                    }
                });
            }
            let parentOption = [],parentArray = [];
            for (let i = 0; i < obj.aq.length; i++) {
                let val = obj.aq[i];
                if (val.age_considered == '1') {
                    let ageLimit = val.age_limit;
                    let ageCondition = val.age_condition;
                    let ageResult = false;
                    let ageConditions = {
                        "1": dob > ageLimit,
                        "2": dob >= ageLimit,
                        "3": dob < ageLimit,
                        "4": dob <= ageLimit,
                        "5": dob == ageLimit,
                    }
                    ageResult = ageConditions[ageCondition] || false;
                    if (!ageResult) {
                        continue;
                    }
                }
                if (val.parent_option_id) {
                    parentOption[val.parent_option_id] = {id: val.id,parent_id: val.parent_id,parent_option_id: val.parent_option_id};
                    parentArray.push(val.parent_id)
                }
                if (val.aqd) {
                    let {ao, ...data} = val.aqd;
                    let {aqd, ...dataval} = val;
                    data = {...data, ...dataval}
                    data['option_answer'] = null;
                    let submenu = [];
                    // let multiOptionStatus = true;
                    if (val.aqd.ao.length > 0) {
                        for (let j = 0; j < val.aqd.ao.length; j++) {
                            let values = val.aqd.ao[j];
                            let checkAnswer = earObj[`${val.aqd.ao[j]['aod']?.option_id}`];
                            val.aqd.ao[j]['aod'] = val.aqd.ao[j]['aod'] || {};
                            val.aqd.ao[j]['aod'].option_answer = null;
                            val.aqd.ao[j]['aod'].parent_id = values.parent_id;
                            val.aqd.ao[j]['aod'].sort_order = values.sort_order;
                            val.aqd.ao[j]['aod'].type = val.aqd.ao[j].type;
                            if (data['question_type'] === 4) {
                                if (checkAnswer?.[0]?.answer) {
                                    data['option_answer'] = checkAnswer?.[0]?.answer;
                                }
                            } else {
                                val.aqd.ao[j]['aod'].option_status = false;
                                if (checkAnswer) {
                                    // if ([0,2,3].includes(data['question_type'])) {
                                    //     multiOptionStatus = false;
                                    // }
                                    val.aqd.ao[j]['aod'].option_status = true;
                                    val.aqd.ao[j]['aod'].option_answer = checkAnswer.answer;
                                    val.aqd.ao[j]['aod'].option_answer_id = checkAnswer.id;
                                }
                                submenu.push(val.aqd.ao[j]['aod'])
                            }
                        }
                        if (data['type'] == '1' && data['question_type'] !== 4) {
                            const optionMenu = (items) => {
                                const map = new Map();
                                items.forEach(item => {
                                    map.set(item.option_id, {...item});
                                });
                                const rootItems = [];
                                items.forEach(item => {
                                    const option = map.get(item.option_id);
                                    if (item.parent_id === 0 || item.parent_id === null) {
                                        rootItems.push(option);
                                    } else {
                                        const parent = map.get(item.option_id);
                                        parent['option_menu'] = [...(parent['option_menu'] || []), option];
                                    }
                                });
                                return rootItems;
                            };
                            submenu = optionMenu(submenu)
                            data['submenu'] = submenu
                        }
                    }
                    object.push(data);
                }
            }
            object.forEach((obj, objIndex) => {
                if (parentArray.includes(obj.question_id)) {
                    obj.submenu.forEach((optionObj, index) => {
                        if (parentOption[optionObj.option_id]) {
                            object[objIndex].submenu[index].children_question_id = parentOption[optionObj.option_id].id
                        }
                    });
                }
            });
            return object
        } else {
            return []
        }
    }, {
        toClassOnly: true,
    })
    aq: AssessmentQuestionsDto;
}
