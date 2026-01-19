import {
    MyPlanAssignRuleEntity, MyPlanBusinessRuleEntity,
} from "@common-constants";

export interface assignPlanInterface extends MyPlanAssignRuleEntity {
    br?: MyPlanBusinessRuleEntity;
}