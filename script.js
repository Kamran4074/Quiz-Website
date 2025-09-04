        // Quiz state
        const state = {
            questions: [],
            currentQuestionIndex: 0,
            userAnswers: [],
            score: 0,
            quizCompleted: false,
            timer: null,
            timeRemaining: 30
        };

        // DOM elements
        const elements = {
            categorySelector: document.getElementById('category-selector'),
            quizPage: document.getElementById('quiz-page'),
            resultsPage: document.getElementById('results-page'),
            questionText: document.getElementById('question-text'),
            optionsList: document.getElementById('options-list'),
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            submitBtn: document.getElementById('submit-btn'),
            restartBtn: document.getElementById('restart-btn'),
            currentQuestion: document.getElementById('current'),
            totalQuestions: document.getElementById('total'),
            progressFill: document.querySelector('.progress-fill'),
            scoreValue: document.getElementById('score-value'),
            resultsList: document.getElementById('results-list'),
            loading: document.getElementById('loading'),
            error: document.getElementById('error'),
            timer: document.getElementById('timer'),
            category: document.getElementById('category'),
            startBtn: document.getElementById('start-btn'),
            retryBtn: document.getElementById('retry-btn')
        };

        // HTML entity decoder
        function decodeHtml(html) {
            const txt = document.createElement("textarea");
            txt.innerHTML = html;
            return txt.value;
        }

        // Fetch questions from Open Trivia DB API
        async function fetchQuestions(category) {
            try {
                elements.loading.style.display = 'block';
                elements.error.style.display = 'none';
                elements.categorySelector.style.display = 'none';
                
                const response = await fetch(`https://opentdb.com/api.php?amount=10&category=${category}&type=multiple`);
                const data = await response.json();
                
                if (data.response_code === 0) {
                    return data.results.map((question, index) => {
                        // Combine correct and incorrect answers
                        const options = [...question.incorrect_answers, question.correct_answer];
                        
                        // Shuffle options
                        for (let i = options.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [options[i], options[j]] = [options[j], options[i]];
                        }
                        
                        // Find the index of the correct answer after shuffling
                        const correctAnswer = options.indexOf(question.correct_answer);
                        
                        return {
                            question: decodeHtml(question.question),
                            options: options.map(opt => decodeHtml(opt)),
                            correctAnswer: correctAnswer
                        };
                    });
                } else {
                    throw new Error('API returned no questions');
                }
            } catch (error) {
                console.error('Error fetching questions:', error);
                elements.loading.style.display = 'none';
                elements.error.style.display = 'block';
                throw error;
            }
        }

        // Initialize the quiz
        async function initQuiz() {
            try {
                const category = elements.category.value;
                state.questions = await fetchQuestions(category);
                
                elements.loading.style.display = 'none';
                elements.quizPage.style.display = 'block';
                
                updateProgressBar();
                renderQuestion();
                startTimer();
            } catch (error) {
                // Error handling is done in fetchQuestions
            }
        }

        // Render current question
        function renderQuestion() {
            const currentQuestion = state.questions[state.currentQuestionIndex];
            elements.questionText.textContent = currentQuestion.question;
            elements.optionsList.innerHTML = '';
            
            // Update progress text
            elements.currentQuestion.textContent = state.currentQuestionIndex + 1;
            elements.totalQuestions.textContent = state.questions.length;
            
            // Create options
            currentQuestion.options.forEach((option, index) => {
                const li = document.createElement('li');
                li.className = 'option';
                if (state.userAnswers[state.currentQuestionIndex] === index) {
                    li.classList.add('selected');
                }
                li.textContent = option;
                li.addEventListener('click', () => selectOption(index));
                elements.optionsList.appendChild(li);
            });
            
            // Update navigation buttons
            elements.prevBtn.disabled = state.currentQuestionIndex === 0;
            
            if (state.currentQuestionIndex === state.questions.length - 1) {
                elements.nextBtn.style.display = 'none';
                elements.submitBtn.style.display = 'block';
            } else {
                elements.nextBtn.style.display = 'block';
                elements.submitBtn.style.display = 'none';
            }
        }

        // Handle option selection
        function selectOption(optionIndex) {
            state.userAnswers[state.currentQuestionIndex] = optionIndex;
            renderQuestion();
        }

        // Navigate to next question
        function nextQuestion() {
            if (state.currentQuestionIndex < state.questions.length - 1) {
                state.currentQuestionIndex++;
                resetTimer();
                renderQuestion();
                updateProgressBar();
            }
        }

        // Navigate to previous question
        function prevQuestion() {
            if (state.currentQuestionIndex > 0) {
                state.currentQuestionIndex--;
                resetTimer();
                renderQuestion();
                updateProgressBar();
            }
        }

        // Update progress bar
        function updateProgressBar() {
            const progress = ((state.currentQuestionIndex + 1) / state.questions.length) * 100;
            elements.progressFill.style.width = `${progress}%`;
        }

        // Submit quiz and show results
        function submitQuiz() {
            clearInterval(state.timer);
            state.quizCompleted = true;
            
            // Calculate score
            state.score = 0;
            state.questions.forEach((question, index) => {
                if (state.userAnswers[index] === question.correctAnswer) {
                    state.score++;
                }
            });
            
            // Show results
            elements.quizPage.style.display = 'none';
            elements.resultsPage.style.display = 'block';
            elements.scoreValue.textContent = `${state.score}/${state.questions.length}`;
            
            // Render results summary
            elements.resultsList.innerHTML = '';
            state.questions.forEach((question, index) => {
                const li = document.createElement('li');
                const isCorrect = state.userAnswers[index] === question.correctAnswer;
                li.className = `result-item ${isCorrect ? 'correct' : 'incorrect'}`;
                
                li.innerHTML = `
                    <h3>${index + 1}. ${question.question}</h3>
                    <p><strong>Your answer:</strong> ${question.options[state.userAnswers[index]] || 'Not answered'}</p>
                    <p><strong>Correct answer:</strong> ${question.options[question.correctAnswer]}</p>
                    <p class="${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? 'Correct' : 'Incorrect'}</p>
                `;
                
                elements.resultsList.appendChild(li);
            });
        }

        // Restart quiz
        function restartQuiz() {
            state.currentQuestionIndex = 0;
            state.userAnswers = [];
            state.score = 0;
            state.quizCompleted = false;
            
            elements.resultsPage.style.display = 'none';
            elements.categorySelector.style.display = 'block';
            elements.quizPage.style.display = 'none';
            
            updateProgressBar();
        }

        // Timer functions
        function startTimer() {
            state.timeRemaining = 30;
            elements.timer.textContent = `${state.timeRemaining}s`;
            
            state.timer = setInterval(() => {
                state.timeRemaining--;
                elements.timer.textContent = `${state.timeRemaining}s`;
                
                if (state.timeRemaining <= 0) {
                    clearInterval(state.timer);
                    if (state.currentQuestionIndex === state.questions.length - 1) {
                        submitQuiz();
                    } else {
                        nextQuestion();
                    }
                }
            }, 1000);
        }

        function resetTimer() {
            clearInterval(state.timer);
            startTimer();
        }

        // Event listeners
        elements.nextBtn.addEventListener('click', nextQuestion);
        elements.prevBtn.addEventListener('click', prevQuestion);
        elements.submitBtn.addEventListener('click', submitQuiz);
        elements.restartBtn.addEventListener('click', restartQuiz);
        elements.startBtn.addEventListener('click', initQuiz);
        elements.retryBtn.addEventListener('click', initQuiz);