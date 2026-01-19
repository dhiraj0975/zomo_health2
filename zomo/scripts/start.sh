#!/bin/bash
npm run start:prod --prefix backend &
npm run start:prod --prefix microservices/zomo_postcode_microservice &
npm run start:prod --prefix microservices/zomo_communication_microservice &
npm run start:prod --prefix microservices/zomo_cron_microservice &
npm run start:prod --prefix microservices/zomo_usda26_food_microservice &
npm run start:prod --prefix microservices/zomo_activitylog_microservice &
npm run start:prod --prefix microservices/zomo_common_microservice &
npm run start:prod --prefix microservices/zomo_census_microservice &
npm run start:prod --prefix microservices/zomo_fitbit_microservice &
npm run start:prod --prefix microservices/zomo_onboarding_microservice &
npm run start:prod --prefix microservices/zomo_translation_microservice &

# Keep the container running
tail -f /dev/null