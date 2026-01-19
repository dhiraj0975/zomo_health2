# Use a base Node.js image from the Docker Hub
#FROM public.ecr.aws/docker/library/node:20
# FROM public.ecr.aws/docker/library/node:22.15  ## Commented on 12 Nov 2025
FROM public.ecr.aws/docker/library/node:24.11.0-trixie 

# Install Required Python modules

RUN apt-get update
RUN apt-get install -y python3-pip
RUN apt-get install -y libxshmfence-dev libatk1.0-dev libatk1.0-0 libcups2 libx11-xcb1 libgdk-pixbuf-2.0-0 libnspr4 libnss3 libxcomposite1 libxrandr2 libatk-bridge2.0-0 libappindicator3-1 libasound2 libdbus-1-3 libxss1 libgbm1 ## Install Dependency to Support PDF Generation
RUN apt-get install -y python3-openpyxl python3-pandas
RUN pip3 install pyzipper python-pptx  requests --break-system-packages boto3 ## needed to install this package as it was not present in main repo

RUN ln -s /usr/bin/python3 /usr/bin/python


# Create and set the working directory inside the container
WORKDIR /app

# Copy the entire codebase into the working directory
COPY . .

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Build Projects

RUN npm run build --prefix backend
RUN npm run build --prefix microservices/zomo_postcode_microservice # 3311
RUN npm run build --prefix microservices/zomo_communication_microservice #3312
RUN npm run build --prefix microservices/zomo_cron_microservice #3313
RUN npm run build --prefix microservices/zomo_usda26_food_microservice #3314
RUN npm run build --prefix microservices/zomo_activitylog_microservice #3315
RUN npm run build --prefix microservices/zomo_common_microservice #3316
RUN npm run build --prefix microservices/zomo_census_microservice #3317
RUN npm run build --prefix microservices/zomo_fitbit_microservice #3318
RUN npm run build --prefix microservices/zomo_onboarding_microservice #3319
RUN npm run build --prefix microservices/zomo_translation_microservice #3320


# Copy tsconfig.json files from subfolders to the working directory
#COPY backend/tsconfig.json backend/
#COPY microservices/zomo_postcode_microservice/tsconfig.json microservices/zomo_postcode_microservice/

# Expose the port the app runs on
EXPOSE 8080
EXPOSE 3311
EXPOSE 3312
EXPOSE 3313
EXPOSE 3314
EXPOSE 3315
EXPOSE 3316
EXPOSE 3317
EXPOSE 3318
EXPOSE 3319
EXPOSE 3320


# Define the command to start the Node.js applications in the respective subfolders
#CMD ["sh", "-c", "cd backend && npm start & cd ../microservices/zomo_postcode_microservice && npm start"]
#CMD npm run start:prod --prefix backend && npm run start:prod  --prefix microservices/zomo_postcode_microservice
CMD ["bash", "./scripts/start.sh"]
