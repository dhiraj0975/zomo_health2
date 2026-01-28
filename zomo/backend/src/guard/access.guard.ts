import { appConstant } from '@common-constants';
import {
  CallHandler,
  CanActivate,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthService } from 'src/modules/auth/auth.service';
import { BrokerService } from 'src/modules/broker/broker.service';
import { CoachesService } from 'src/modules/coach/coaches/coaches.service';
import { AssignEngagementMangerService } from 'src/modules/company/assignengagementmanger/assignEngagementManger.service';
import { ClientManagerAssignService } from 'src/modules/company/clientmanagerassign/clientmanagerassign.service';
import { WellnessAssignmentService } from 'src/modules/company/wellnessassignment/wellnessAssignment.service';
import { DataManagersService } from 'src/modules/healthcheckup/datamanagers/datamanagers.service';
import { TranslationService } from 'src/modules/translation/translation.service';
import { Not } from 'typeorm';
let allowedRole
 = [appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.COACH, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER,appConstant.ROLE.MARKETINGMANAGER,
appConstant.ROLE.ENGAGEMENTDATAMANAGER, appConstant.ROLE.DATAMANAGER, appConstant.ROLE.WCH, appConstant.ROLE.CLIENTENGAGEMENTMANAGER, appConstant.ROLE.REGIONALADMIN,
];

@Injectable()
export class AccessGuard implements CanActivate, NestInterceptor {
  constructor(
    private readonly translatorService: TranslationService,
    private readonly coachesService: CoachesService,
    private readonly brokerService: BrokerService,
    private readonly assignEngagementManagerService: AssignEngagementMangerService,
    private readonly dataManagersService: DataManagersService,
    private readonly wellnessAssignmentService: WellnessAssignmentService,
    private readonly authService: AuthService,
    private readonly clientManagerAssignService: ClientManagerAssignService,
  ) {}

  private async validateRequest(request: any): Promise<boolean> {
    const userDetails = request.tokenUser;
    const requestBody = request.body ? JSON.parse(JSON.stringify(request.body)) : null;

    if (
      userDetails?.role_id === appConstant.ROLE.ADMIN ||
      userDetails?.role_id === appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER
    ) {
      return true;
    }
    if (requestBody?.company_id) {
      requestBody['org_id'] = requestBody.company_id.toString();
    }
    if (requestBody?.organization_id) {
      requestBody['org_id'] = requestBody.organization_id.toString();
    }
    if (requestBody?.user_id && !allowedRole.includes(userDetails.role_id)) {
        // let user_id = request?.url?.includes('events') ? requestBody?.created_by_user_id : requestBody?.user_id;
        let user_id =  requestBody?.created_by_user_id ?? requestBody?.user_id;
        let userDetailsFromAuth = await this.authService.findOne(
            { id: user_id },
            null,
            null,
            request,
        );
        requestBody['org_id'] = requestBody['org_id'] ?? userDetailsFromAuth?.org_id.toString();
    }
    if (['/user/get-profile'].includes(request?.url)) {
      return true;
    }
    if ([appConstant.ROLE.REGISTERED, appConstant.ROLE.SPOUSE].includes(userDetails?.role_id)) {
      if (requestBody?.org_id && requestBody?.org_id?.toString() !== userDetails?.org_id?.toString()) {
        throw new Error(this.translatorService.translate(request.lang, 'ERR_FORBIDDEN_ACCESS'));
      }
    } else {
      if (userDetails?.role_id === appConstant.ROLE.ORGADMIN) {
        if (requestBody?.org_id && requestBody?.org_id?.toString() !== userDetails?.org_id?.toString()) {
          throw new Error(this.translatorService.translate(request.lang, 'ERR_FORBIDDEN_ACCESS'));
        }
      }
      if (allowedRole.includes(userDetails.role_id))
        {
        let org_id = null;
        let resultedData: any[] = [];
        if (userDetails?.role_id === appConstant.ROLE.GLOBALCOACH) {
          resultedData = await this.coachesService.listRecord({ coach_manager_id: userDetails?.id, status: Not(2) }, null, ['coach.org_id']);
        }
        if (userDetails?.role_id === appConstant.ROLE.COACH) {
          resultedData = await this.coachesService.listRecord({ user_id: userDetails?.id, status: Not(2) }, null, ['coach.org_id']);
        }
        if (userDetails?.role_id === appConstant.ROLE.BROKERADMIN) {
          resultedData = await this.brokerService.brokerOrgList({ broker_admin_id: userDetails?.id, status: Not(2) }, ['org_id']);
          if(resultedData.length == 0 && requestBody?.org_id == userDetails.org_id){
            resultedData = [{org_id: userDetails.org_id?.toString()}];
          }
        }
        if (userDetails?.role_id === appConstant.ROLE.BROKER) {
          resultedData = await this.brokerService.brokerOrgList({ user_id: userDetails?.id, is_global: 1, status: Not(2) }, ['org_id']);
          if(resultedData.length == 0 && requestBody?.org_id == userDetails.org_id){
            resultedData = [{org_id: userDetails.org_id?.toString()}];
          }
        }
        if (userDetails?.role_id === appConstant.ROLE.REGIONALADMIN) {
          resultedData = await this.brokerService.brokerOrgList({ user_id: userDetails?.id, is_global: 2, status: Not(2) }, ['org_id']);
        }
        if (userDetails?.role_id === appConstant.ROLE.MARKETINGMANAGER) {
          let engagementData = await this.assignEngagementManagerService.listRecord({ user_id: userDetails?.id, status: Not(2) });
          if (engagementData?.map(ele => ele.company_id?.toString()).includes(requestBody?.org_id)) {
            org_id = requestBody?.org_id;
          }
        }
        if (userDetails?.role_id === appConstant.ROLE.DATAMANAGER) {
          resultedData = await this.dataManagersService.listRecord({ user_id: userDetails?.id, status: Not(2) }, null, ['datamanager.org_id']);
        }
        if (userDetails?.role_id === appConstant.ROLE.WCH) {
          resultedData = await this.wellnessAssignmentService.listRecord(`wellnessAssignment.user_id = ${userDetails?.id} AND wellnessAssignment.status != 2`, null);
        }
        if (userDetails?.role_id === appConstant.ROLE.CLIENTENGAGEMENTMANAGER) {
          resultedData = await this.clientManagerAssignService.listRecord({ user_id: userDetails?.id, status: Not(2) }, null);
        }
        const allowedOrgIds = resultedData?.map(ele => ele.org_id?.toString()) ?? [];
        org_id = allowedOrgIds.join(',');
        if (requestBody?.org_id && typeof requestBody.org_id !== 'string') {
          requestBody.org_id = requestBody.org_id.toString();
        }
        if (requestBody?.org_id && allowedOrgIds.length) {
          requestBody.org_id = requestBody.org_id
            .split(',')
            .map(id => id.trim())
            .filter(id => allowedOrgIds.includes(id))
            .join(',');
        }
        if (requestBody?.org_id) {
          if (typeof requestBody.org_id !== 'string') {
            requestBody.org_id = requestBody.org_id.toString();
          }
          requestBody.org_id = requestBody.org_id
            .split(',')
            .map(id => id.trim())
            .filter(id => allowedOrgIds.includes(id))
            .join(',');
          if (requestBody.org_id && !requestBody.org_id.includes(',')) {
            org_id = requestBody.org_id;
          }
        }
        if(!requestBody?.org_id || requestBody?.org_id == '') {
          return true;
        }
        if (allowedOrgIds.length === 0) {
          throw new Error(this.translatorService.translate(request.lang, 'please assign org to current user.'));
        }
        if (!org_id || (org_id && requestBody?.org_id !== org_id)) {
          throw new Error(this.translatorService.translate(request.lang, 'ERR_FORBIDDEN_ACCESS'));
        }
      }
    }
    return true;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    return this.validateRequest(request);
  }

  async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    await this.validateRequest(request);
    return next.handle();
  }
}
