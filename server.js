import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';


const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();
let roomQuestions = {};
let onlineUsers = {};
let roomUsersReady = {};

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  io.on('connection', async (socket) => {
    console.log('User connected');
    socket.on('sendMessage', (data) => {
      console.log(data);
      socket.to(data.roomId).emit('receiveMessage', data);
    });

    socket.on('joinRoom', async (data) => {
      console.log(`User joined room ${data.roomId}`);
      socket.join(data.roomId);
      let temp = onlineUsers[data.roomId] || [data.user];
      !temp.includes(data.user) ? temp.push(data.user) : null;
      if (onlineUsers[data.roomId]) {
        if (onlineUsers[data.roomId].includes(data.user)) {
          null;
        } else {
          onlineUsers[data.roomId].push(data.user);
        }
      } else {
        onlineUsers[data.roomId] = [data.user];
      }
      console.log("Online users:", onlineUsers[data.roomId]);
      socket.to(data.roomId).emit('userJoined', temp);
      console.log("Quiz:", data.quiz);

      if (data.quiz) {
        if (roomQuestions[data.roomId]) {
          socket.emit('receiveQuestions', {questions: roomQuestions[data.roomId]});
        } else {
          const response = await fetch(`http://localhost:3000/api/get-quiz-questions?courseId=${data.courseId}`);
          const questions = await response.json();
          roomQuestions[data.roomId] = questions;
          if (response.ok) {
            socket.emit('receiveQuestions', { questions });
          }
        }
      }
    });

    socket.on('setReady', (data) => {
      if (data.quiz) {
        const { roomId, user, isReady } = data;

        // Initialize room's usersReady if it doesn't exist
        if (!roomUsersReady[roomId]) {
          roomUsersReady[roomId] = {};
        }

        // Update the user's ready status
        roomUsersReady[roomId][user] = isReady;

        // Broadcast the updated usersReady to all clients in the room
        socket.to(roomId).emit('someoneReady', {
          usersReady: roomUsersReady[roomId],
        });
      }
      socket.to(data.roomId).emit('someoneReady', {
        usersReady: data.usersReady,
        course: data.course,
      });
    });

    socket.on('setCourse', async (data) => {
      socket
        .to(data.roomId)
        .emit('courseChange', { courseData: data.courseData });
      const response = await fetch(`http://localhost:3000/api/get-quiz-questions?courseId=${data.courseData}`);
      const questions = await response.json();
      roomQuestions[data.roomId] = questions;
    });

    socket.on('sendAnswer', (data) => {
      console.log("Sending: ", data)
      socket.to(data.roomId).emit('receiveAnswer', data.answers);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
