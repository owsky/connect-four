FROM node:16-alpine3.13
ENV NODE_ENV=development
WORKDIR /usr/src/app/api
COPY ["package.json", "package-lock.json*", "./"]
COPY . .
CMD ["npm", "run", "go"]
