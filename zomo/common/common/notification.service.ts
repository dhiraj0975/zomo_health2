import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
const S3_URL =  process.env.S3_URL_PROD;
const projectId = process.env.FCM_PROJECT_ID_PROD;
const clientEmail = process.env.FCM_CLIENT_MAIL_PROD;
const privateKey = process.env.FCM_API_KEY_PROD?.replace(/\\n/g, '\n');
@Injectable()
export class FirebaseService {
  constructor() {
    let key = {projectId,clientEmail,privateKey}
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(key),
      });
    }
  }
  async sendNotification(deviceToken: string, title: string, body: string, payload: any): Promise<string | void> {
    try{
      if(!deviceToken){
        return
      }
      let payloadData = {};
      if (payload['id']) {
        payloadData['id'] = String(payload['id']);
      }
      if (payload['url']) {
        payloadData['url'] = String(payload['url']);
      }
      if (payload['c_type']) {
        payloadData['info'] = { c_type: String(payload['c_type']) };
      }
      if (payload['c_type'] === 'organization') {
          payloadData['name'] = "With My Organization";
          payloadData['info']['org_id'] = String(payload['org_id']); 
      }
      if (payload['c_type'] === 'department') {
          payloadData['name'] = "With My Department";
          payloadData['info']['dep_id'] = String(payload['dept_id']); 
      }
      if (payload['c_type'] === 'location') {
          payloadData['name'] = "With My Location";
          payloadData['info']['loc_id'] = String(payload['loc_id']); 
      }
      if (payload['c_type'] === 'team') {
          payloadData['name'] = payload['tname'] ? `With Team - ${payload['tname']}` : "";
          payloadData['info']['team_id'] = String(payload['team_id']); 
      }
      if (payload['c_type'] === 'user' || (payload['c_type'] === 'support' && payload['user_to'] !== -1)) {
          payloadData['name'] = title;
          payloadData['profile'] = S3_URL + (payload['profile_image'] ?? 'comn/img/avatar_0001.png');
          payloadData['info']['send_to'] = String(payload['user_id']); 
      }
      if (payload['c_type'] === 'support' && payload['user_to'] === -1) {
          payloadData['name'] = title;
          payloadData['profile'] = S3_URL + (payload['profile_image'] ?? 'comn/img/avatar_0001.png');
          payloadData['info']['send_to'] = String(payload['user_id']); 
      }
      if (payload['c_type'] === 'challenge' || payload['c_type'] === 'Challenges') {
          payloadData['name'] = title;
          payloadData['profile'] = S3_URL + (payload['profile_image'] ?? 'comn/img/avatar_0001.png');
          payloadData['challenge_id'] = String(payload['challenge_id']); 
          payloadData['schedule_id'] = String(payload['schedule_id']); 
          payloadData['url'] = String(payload['url']); 
      }
      if (!payload['c_type'] || payload['c_type'] === '') {
          payloadData['info'] = { c_type: '' };
          payloadData['name'] = title;
          payloadData['body'] = body;
          payloadData['info']['org_id'] = String(payload['org_id'] ?? '');
          payloadData['info']['send_to'] = String(payload['send_to'] ?? '');
          payloadData['profile'] = String(payload['profile'] ?? '');
      }
      const stringifiedPayloadData = {};
      for (const key in payloadData) {
        const value = typeof payloadData[key] === "object"
          ? JSON.stringify(payloadData[key])
          : String(payloadData[key]);
          stringifiedPayloadData[key] = value;
      }
      const message = {
          notification: {
            title: title,
            body: body,
            imageUrl: S3_URL + 'comn/img/avatar_0001.png'
          },
          data: stringifiedPayloadData,
          token: deviceToken,
      };
      const response =  await admin.messaging().send(message);
      return response;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw new Error('Notification sending failed');
    }
  }
  async sendNotificationToMultiple(tokens: string[], title: string, body: string, payload: any): Promise<admin.messaging.BatchResponse | void> {
    try{
      let payloadData = {};
      if (payload['c_type']) {
          payloadData['info'] = { c_type: String(payload['c_type']) };
      }
      if (payload['c_type'] === 'organization') {
          payloadData['name'] = "With My Organization";
            payloadData['body'] = body;
          payloadData['info']['org_id'] = String(payload['org_id']); 
      }
      if (payload['c_type'] === 'department') {
          payloadData['name'] = "With My Department";
            payloadData['body'] = body;
          payloadData['info']['dep_id'] = String(payload['dept_id']); 
      }
      if (payload['c_type'] === 'location') {
          payloadData['name'] = "With My Location";
            payloadData['body'] = body;
          payloadData['info']['loc_id'] = String(payload['loc_id']); 
      }
      if (payload['c_type'] === 'team') {
          payloadData['name'] = payload['tname'] ? `With Team - ${payload['tname']}` : "";
          payloadData['info']['team_id'] = String(payload['team_id']); 
      }
      if (payload['c_type'] === 'user' || (payload['c_type'] === 'support' && payload['user_to'] !== -1)) {
          payloadData['name'] = title;
            payloadData['body'] = body;
          payloadData['profile'] = S3_URL + (payload['profile_image'] ?? 'comn/img/avatar_0001.png');
          payloadData['info']['send_to'] = String(payload['user_id']); 
      }
      if (payload['c_type'] === 'support' && payload['user_to'] === -1) {
          payloadData['name'] = title;
            payloadData['body'] = body;
          payloadData['profile'] = S3_URL + (payload['profile_image'] ?? 'comn/img/avatar_0001.png');
          payloadData['info']['send_to'] = String(payload['user_id']); 
      }
      if (!payload['c_type'] || payload['c_type'] === '') {
        payloadData['info'] = { c_type: '' };
        payloadData['name'] = title;
        payloadData['body'] = body;
        payloadData['info']['org_id'] = String(payload['org_id'] ?? '');
        payloadData['info']['send_to'] = String(payload['send_to'] ?? '');
        payloadData['profile'] = String(payload['profile'] ?? '');
    }
    if (payload['c_type'] === 'challenge') {
        payloadData['name'] = title;
        payloadData['body'] = body;
        payloadData['profile'] = S3_URL + (payload['profile_image'] ?? 'comn/img/avatar_0001.png');
        payloadData['challenge_id'] = String(payload['challenge_id']); 
        payloadData['schedule_id'] = String(payload['schedule_id']); 
        payloadData['url'] = String(payload['url']); 
    }
    const stringifiedPayloadData = {};
    for (const key in payloadData) {
        stringifiedPayloadData[key] = String(payloadData[key]);
    }
      const message = {
          notification: {
            title: title,
            body: body,
            imageUrl: S3_URL + 'comn/img/avatar_0001.png'
          },
          data: stringifiedPayloadData, 
          tokens: tokens,
      };
      const response = await admin.messaging().sendEachForMulticast(message);
      return response;
    } catch (error) {
      console.error('Error sending notifications:', error);
      throw new Error('Notifications sending failed');
    }
  }
}