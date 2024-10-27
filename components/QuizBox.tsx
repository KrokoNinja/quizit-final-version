'use client';

import { getQuizQuestions, getSession } from '@/lib/actions';
import { Question } from '@prisma/client';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
import { Dialog, DialogClose } from './ui/dialog';
import ReviewQuestionDialog from './ReviewQuestionDialog';
import { useRouter } from 'next/navigation';
import { socket } from '../socket';
import { isArgumentsObject } from 'util/types';
import { objectEnumNames } from '@prisma/client/runtime/library';

interface QuizBoxProps {
  courseId: string;
  isTeamQuiz?: boolean;
  team?: string ;
}

const QuizBox = ({ courseId, isTeamQuiz, team }: QuizBoxProps) => {
  const [open, setOpen] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [points, setPoints] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState([false, false, false, false, false]);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [usersReady, setUsersReady] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [choices, setChoices] = useState<
    { choice: string; correct: boolean }[]
  >([]);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const sessionUser = async () => {
      const response = await getSession();
      if (!response.username) {
        router.push('/login');
        return;
      }
      setUsername(response.username);
      console.log("Username: ", response.username);
    }
    if (isTeamQuiz) {
      socket.on('connect', () => {
        console.log(socket.id);
      });
      socket.on('receiveQuestions', (data) => {
        console.log(data)
        setQuestions(data.questions);
      });
      const joinRoom = async () => {
        const user = await sessionUser();
        socket.emit('joinRoom', { roomId: team, quiz: true, courseId: courseId, user: user });
      }
      joinRoom();
      socket.on('userJoined', data => {
        console.log("userJoined: ", data);
        let temp: {[key: string]: boolean} = {};
        data.forEach((user: string) => {
          console.log("Data user: ", user);
          if(user) {
            temp[user] = false;
          }
        });
        console.log("Temp: ", temp);
        setUsersReady(temp);
      })
      socket.on('receiveAnswer', (data) => {
        console.log("receiveAnswer", data);
        setIsReady(false);
        // Only reset the specific user that sent the answer, not the entire `usersReady` state.
        setUsersReady((prevUsersReady) => ({
          ...prevUsersReady,
          [username]: false,  // Reset only the current user
        }));
        socket.emit('setReady', {usersReady: {...usersReady, [username]: false}, quiz: true, roomId: team});
        setSelected(data);
      });

      socket.on('someoneReady', (data) => {
        setUsersReady(data.usersReady);
      });
    } else if (!isTeamQuiz) {
      // fetch quiz questions
      const fetchQuestions = async () => {
        const questions = await getQuizQuestions(courseId);
        setQuestions(questions);
      };
      fetchQuestions();
    }
  }, [isTeamQuiz, team, courseId]);

  useEffect(() => {
    console.log("UserReady Client: ", usersReady);
  }), [usersReady];

  useEffect(() => {
    //First look for questions to be set
    if (questions && (questionNumber < questions.length)) {
      const currentQuestion = questions[questionNumber];

      const choiceData = [
        {
          choice: currentQuestion.choice1,
          correct: currentQuestion.choice1Correct,
        },
        {
          choice: currentQuestion.choice2,
          correct: currentQuestion.choice2Correct,
        },
        {
          choice: currentQuestion.choice3,
          correct: currentQuestion.choice3Correct,
        },
      ];

      if (currentQuestion.choice4) {
        choiceData.push({
          choice: currentQuestion.choice4,
          correct: currentQuestion.choice4Correct!,
        });
      }
      if (currentQuestion.choice5) {
        choiceData.push({
          choice: currentQuestion.choice5,
          correct: currentQuestion.choice5Correct!,
        });
      }

      if (isTeamQuiz) {
        setChoices(choiceData);
      }
      else {
        const shuffledChoices = choiceData.sort(() => Math.random() - 0.5);
        setChoices(shuffledChoices);
      }
    }
  }, [questionNumber, questions, isTeamQuiz]);

  const checkAnswer = () => {
    if(isTeamQuiz) {
      console.log("Before:",usersReady);
      setIsReady(true);
      // Only reset the specific user that sent the answer, not the entire `usersReady` state.
      setUsersReady((prevUsersReady) => ({
        ...prevUsersReady,
        [username]: true,  // Reset only the current user
      }));
      socket.emit('setReady', {
        roomId: team,
        user: username,
        isReady: true,
        quiz: true,
      });
    } else {
      let isAnswerCorrect = true;

      for (let i = 0; i < choices.length; i++) {
        if (choices[i].correct !== selected[i]) {
          isAnswerCorrect = false;
          break;
        }
      }

      if (isAnswerCorrect) {
        setPoints(points + 1);
      }
      setIsCorrect(isAnswerCorrect);
      setOpen(true);
    }
  };

  const handleSelect = (index: number) => {
    const updatedSelected = selected.map((value, i) =>
      i === index ? !value : value,
    );
    setSelected(updatedSelected);
    if (isTeamQuiz) {
      socket.emit('sendAnswer', {
        roomId: team,
        answers: updatedSelected,
      });
      setIsReady(false);
      let temp = {...usersReady};
      console.log("Before set:",temp);
      for (const user in usersReady) {
        temp[user] = false;
      }
      console.log("After set:",temp);
      setUsersReady(temp);
      socket.emit('setReady', {
        roomId: team,
        user: username,
        isReady: false, // Not ready after selecting an answer
        quiz: true,
      });
    }
  };

  const nextQuestion = () => {
    setQuestionNumber(questionNumber + 1);
    setSelected([false, false, false, false, false]);
    setIsCorrect(false);
    setOpen(false);
    console.log(
      `Questionnumber: ${questionNumber}, Questions length: ${questions.length}`,
    );
    if (questionNumber >= questions.length - 1) {
      updatePoints(points);
    }
  };

  const updatePoints = async (points: number) => {
    if (isTeamQuiz) {
      return;
    }
    const response = await fetch('/api/add-points', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ points }),
    });

    if (!response.ok) {
      const data = await response.json();
      console.error(data.error);
    } else {
      const data = await response.json();
      console.log('Points updated successfully', data);
      localStorage.setItem('points', points.toString());
      // Proceed with the redirection after points are updated
      router.push(`/dashboard/courses/${courseId}/quiz/review`);
    }
  };

  const getReadyUsers = () => {
    let readyUsersCount = 0;
    console.log(usersReady);
    for (const user in usersReady) {
      if (usersReady[user]) {
        readyUsersCount++;
      }
    }
    return readyUsersCount;
  };

  return (
    <div className="flex h-full flex-col">
      <p className="mb-6 text-xl font-bold">Points: {points}</p>
      {questions && questions.length > 0 ? (
        questionNumber < questions.length ? (
          <div className="flex w-full flex-col items-center justify-center md:h-[90%]">
            <h2 className="mb-2 text-3xl md:mb-4">
              {questions[questionNumber].question}
            </h2>
            <div className="mb-6 grid grid-cols-4 gap-6 md:grid-cols-4 lg:grid-cols-6">
              {choices.map((choice, index) => (
                <div
                  key={index}
                  className={`col-span-2 ${index == 3 && 'md:col-start-2'} ${index == 4 && 'col-start-2 md:col-start-4'}`}>
                  <Input
                    className="hidden"
                    type="checkbox"
                    id={`choice-${index}`}
                    name="choice"
                    value={choice.choice}
                    onChange={() => handleSelect(index)}
                  />
                  <Label
                    className={cn(
                      'block rounded border-2 border-primary bg-primary p-6 text-center text-lg text-secondary',
                      selected[index] === true &&
                        'bg-secondary-gradient text-primary',
                    )}
                    htmlFor={`choice-${index}`}>
                    {choice.choice}
                  </Label>
                </div>
              ))}
            </div>
            <Dialog open={open}>
              <ReviewQuestionDialog
                question={questions[questionNumber]}
                choices={choices}
                nextQuestion={nextQuestion}
                isCorrect={isCorrect}
              />
            </Dialog>
            <Button className="text-lg" onClick={() => checkAnswer()} disabled={isReady}>
              {(isTeamQuiz && isReady) ? `Waiting for others` : 'Check'}
            </Button>
          </div>
        ) : (
          <div>
            <h2>Quiz Complete</h2>
            <p>You scored {points} points</p>
            <p>
              You will be redirected to the review page. Please wait for this to
              happen, so we can deliver your points.
            </p>
          </div>
        )
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default QuizBox;
