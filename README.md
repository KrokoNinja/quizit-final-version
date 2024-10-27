First install the dependencies

```bash
npm install
```

Setup Environment variables

Required Variables:
DATABASE_URL
ROOT_URL
SESSION_SECRET
NODE_ENV
SECRET_SALT

Optional variables:
ADMIN-EMAILS

As an example you can createa .env in the root folder with the following values:
```bash
DATABASE_URL="file:./dev.db"
ROOT_URL="http://localhost:3000" # If used on a local server. If used in a docker container dont forget to map the port to the outside.
SESSION_SECRET="123456789"
NODE_ENV="development"
SECRET_SALT="123456789"

ADMIN-EMAILS="admin@quiz.it"
```
Generate the database:
```bash
npx prisma generate
```

Try accessing the databse studio
```bash
npx prisma studio
```

Run the development server

```bash
npm run dev
```

How to run the Websocket
```bash
cd websocket_server
nodemon socket.js
```
