FROM node:latest

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

ARG DATABASE_URL=file:/app/app/prisma/dev.db
ENV DATABASE_URL=$DATABASE_URL

ARG ADMIN_EMAILS="lenni.pfundtner@gmail.com, l.pfundtner@optimerch.de, testadmin@test.com"
ENV ADMIN_EMAILS=$ADMIN_EMAILS

RUN chmod 777 /app/app/prisma/dev.db || true

RUN npx prisma generate

ENV NODE_ENV=production

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]