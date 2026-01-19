import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {CAPostCodesEntity, TimezonesEntity, USPostCodesEntity} from "./entity";
import { appConstant } from './constant';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(CAPostCodesEntity, appConstant.READ_REPLICA.toLowerCase())
    private readonly readReplicaCAPostCodesRepository: Repository<CAPostCodesEntity>,
    @InjectRepository(CAPostCodesEntity, appConstant.MAIN.toLowerCase())
    private readonly writeReplicaCAPostCodesRepository: Repository<CAPostCodesEntity>,
    @InjectRepository(USPostCodesEntity, appConstant.READ_REPLICA.toLowerCase())
    private readonly readReplicaUSPostCodesRepository: Repository<USPostCodesEntity>,
    @InjectRepository(USPostCodesEntity, appConstant.MAIN.toLowerCase())
    private readonly writeReplicaUSPostCodesRepository: Repository<USPostCodesEntity>,
    @InjectRepository(TimezonesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaTimezonesRepository: Repository<TimezonesEntity>,
        @InjectRepository(TimezonesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaTimezonesRepository: Repository<TimezonesEntity>,
  ) {}

  async getPostalCodeUS(condition) {
    return await this.readReplicaUSPostCodesRepository
        .createQueryBuilder('us_post_codes')
        .where(condition)
        .select([
          'countrycode AS country',
          'zipcode AS postalcode',
          'city',
          'state',
          'statecode',
          'timezone'
        ])
        .getRawMany();
  }

  async getPostalCodeCA(condition, status) {
    if (status == 1) {
        return await this.readReplicaCAPostCodesRepository
            .createQueryBuilder('ca_post_codes')
            .where(condition)
            .select([
                'countrycode AS country',
                'postalcode',
                'city',
                'province AS state',
                'provincecode AS statecode',
                'timezone'
            ]).take(1).getRawMany();
    } else {
        return await this.readReplicaCAPostCodesRepository
            .createQueryBuilder('ca_post_codes')
            .where(condition)
            .select([
                'countrycode AS country',
                'postalcode',
                'city',
                'province AS state',
                'provincecode AS statecode',
                'timezone'
            ]).getRawMany()
    }
  }

    async getTimezone(condition) {
        return await this.readReplicaTimezonesRepository
            .createQueryBuilder('tz')
            .where(condition)
            .select([
                'id',
                'timezone_name',
                'timezone_desc',
                'timezone_value',
                'alias',
                'status',
            ])
            .orderBy('timezone_name', 'ASC')
            .getRawMany();
    }

    async getStateList(condition, country) {
      let query;
      let fields = [
        'state',
        'statecode'
      ];
      if(country == 'US') {
        query = this.readReplicaUSPostCodesRepository
        .createQueryBuilder('us_post_codes');
      }
      else{
        query = this.readReplicaCAPostCodesRepository
        .createQueryBuilder('ca_post_codes');
        fields = [
          'province AS state',
          'provincecode AS statecode'
        ];
      }
      return await query
          .where(condition)
          .select(fields)
          .distinct(true)
          .getRawMany();
    }
    async getCityList(condition, country) {
      let query;
      let fields = [
        'city',
        'statecode'
      ];
      if(country == 'US') {
        query = this.readReplicaUSPostCodesRepository
        .createQueryBuilder('us_post_codes');
      }
      else{
        query = this.readReplicaCAPostCodesRepository
        .createQueryBuilder('ca_post_codes');
        fields = [
          'city',
          'provincecode AS statecode'
        ];
      }
      return await query
          .where(condition)
          .select(fields)
          .distinct(true)
          .getRawMany();
    }
}
