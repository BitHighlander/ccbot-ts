FROM node:14.15.3
ARG NPM_TOKEN
ARG NODE_ENV
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN apt-get update && apt-get install -y python build-essential wget libusb-1.0-0-dev libudev-dev
RUN echo //registry.npmjs.org/:_authToken=${NPM_TOKEN} > /usr/src/app/.npmrc
RUN npm --version
RUN npm uninstall libusb
RUN npm install
COPY . /usr/src/app
ENV NODE_ENV docker
CMD [ "npm", "run", "start" ]

#TODO pass push to circle
#TODO if fail push alert to slack

#CMD [ "ping", "google.com" ]
#CMD [ "node", "citadel-rest.eth.stage.js" ]

#TODO pass push to circle

#TODO if fail push alert to slack
