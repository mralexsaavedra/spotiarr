FROM node:18.20.4-alpine AS builder
WORKDIR /spotiarr
COPY . .
RUN npm ci
RUN npm run build

FROM node:18.20.4-alpine
WORKDIR /spotiarr
COPY --from=builder /spotiarr/dist .
COPY --from=builder /spotiarr/src ./src
COPY --from=builder /spotiarr/package.json ./package.json
COPY --from=builder /spotiarr/package-lock.json ./package-lock.json
COPY --from=builder /spotiarr/src/backend/.env.docker ./.env
RUN npm prune --production
RUN rm -rf src package.json package-lock.json
RUN apk add --no-cache ffmpeg
RUN apk add --no-cache redis
RUN apk add --no-cache python3 py3-pip
EXPOSE 3000
CMD ["node", "backend/main.js"]