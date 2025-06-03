// script.js

// Define the GitHub URL for your quiz questions JSON
const githubJsonUrl = 'https://Arr-glitch.github.io/english-quiz-data/B1.json';

// Global variables to manage quiz state
let questions = []; 
let originalQuestions = []; // Store original questions for restart
let currentQuestionIndex = 0;
let userAnswers = [];
let score = 0;

/**
 * Shuffles an array using the Fisher-Yates algorithm.
 * @param {Array} array - The array to shuffle.
 * @returns {Array} A new shuffled array.
 */
function shuffleArray(array) {
    const shuffled = [...array]; // Create a copy to avoid modifying the original
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // Swap elements
    }
    return shuffled;
}

/**
 * Shuffles the questions and their options within the quiz data.
 * This ensures a new order of questions and options for each quiz session.
 * @param {Array} questionsArray - The array of question objects.
 * @returns {Array} The shuffled questions array.
 */
function shuffleQuestionsAndAnswers(questionsArray) {
    // First, shuffle the order of questions
    const shuffledQuestions = shuffleArray(questionsArray);

    // Then, iterate through each question and shuffle its options if applicable
    return shuffledQuestions.map(question => {
        const shuffledQuestion = { ...question }; // Create a shallow copy of the question

        // Shuffle options for multiple_choice and dropdown questions
        if (question.options && Array.isArray(question.options)) {
            shuffledQuestion.options = shuffleArray(question.options);
        }

        // Handle reading passage questions with sub-questions
        if (question.type === 'reading_passage' && question.questions) {
            shuffledQuestion.questions = question.questions.map(subQ => {
                if (subQ.options && Array.isArray(subQ.options)) {
                    return {
                        ...subQ,
                        options: shuffleArray(subQ.options)
                    };
                }
                return subQ;
            });
        }

        // Handle drag and drop questions by shuffling the available words/options
        if (question.type === 'drag_and_drop' && question.blanks) {
            shuffledQuestion.blanks = question.blanks.map(blank => {
                if (blank.options && Array.isArray(blank.options)) {
                    return {
                        ...blank,
                        options: shuffleArray(blank.options)
                    };
                }
                return blank;
            });
        }

        return shuffledQuestion;
    });
}

/**
 * Loads quiz questions from the specified GitHub JSON URL.
 * Initializes the quiz upon successful loading.
 * Displays an error message if loading fails.
 */
async function loadQuestions() {
    try {
        // Fetch the JSON data from the GitHub URL
        const response = await fetch(githubJsonUrl);
        if (!response.ok) {
            // Throw an error if the network response was not ok (e.g., 404, 500)
            throw new Error(`Failed to load questions: ${response.status} ${response.statusText}`);
        }
        // Parse the JSON response
        originalQuestions = await response.json();

        // Check if questions were actually loaded
        if (!originalQuestions || originalQuestions.length === 0) {
            throw new Error('No questions found in the data. Please check the JSON file.');
        }

        // Shuffle questions and their answers/options before starting the quiz
        questions = shuffleQuestionsAndAnswers(originalQuestions);

        // Initialize the quiz UI and state
        initializeQuiz();
    } catch (error) {
        // Catch any errors during the fetch or parsing and display them
        showError(`Error loading quiz: ${error.message}`);
    }
}

/**
 * Displays an error message on the screen.
 * @param {string} message - The error message to display.
 */
function showError(message) {
    document.getElementById('loadingScreen').style.display = 'none'; // Hide loading
    document.getElementById('errorScreen').style.display = 'block'; // Show error div
    document.getElementById('errorMessage').textContent = message; // Set error message text
}

/**
 * Initializes the quiz after questions are loaded.
 * Hides loading screen, shows quiz content, resets state.
 */
function initializeQuiz() {
    document.getElementById('loadingScreen').style.display = 'none'; // Hide loading screen
    document.getElementById('quizContent').style.display = 'block'; // Show quiz content

    // Reset quiz state variables
    userAnswers = new Array(questions.length).fill(null); // Initialize user answers array
    currentQuestionIndex = 0; // Start from the first question
    score = 0; // Reset score

    // Update UI elements
    updateProgress(); // Update progress bar and text
    displayQuestion(); // Display the first question
    updateScore(); // Update score display
}

/**
 * Updates the progress bar and text to reflect the current question.
 */
function updateProgress() {
    // Calculate progress percentage
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    // Update the width of the progress bar
    document.getElementById('progressBar').style.width = progress + '%';
    // Update the progress text (e.g., "Question 1 of 10")
    document.getElementById('progressText').textContent =
        `Question ${currentQuestionIndex + 1} of ${questions.length}`;
}

/**
 * Displays the current question based on its type.
 * Updates navigation buttons and progress.
 */
function displayQuestion() {
    const question = questions[currentQuestionIndex];
    const questionCard = document.getElementById('questionCard');

    // Start with common question header HTML
    let html = `
        <div class="question-header">
            <span class="question-topic">${question.topic}</span>
            <span class="question-level">Level ${question.level}</span>
        </div>
    `;

    // Append type-specific question content
    switch (question.type) {
        case 'multiple_choice':
            html += displayMultipleChoice(question);
            break;
        case 'fill_in_the_blank':
            html += displayFillInTheBlank(question);
            break;
        case 'dropdown':
            html += displayDropdown(question);
            break;
        case 'reading_passage':
            html += displayReadingPassage(question);
            break;
        case 'drag_and_drop':
            html += displayDragAndDrop(question);
            break;
        default:
            html += `<p class="error">Unsupported question type: ${question.type}</p>`;
            break;
    }

    // Update the question card's content
    questionCard.innerHTML = html;

    // Update navigation buttons' disabled state and text
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    document.getElementById('nextBtn').textContent =
        currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next →';

    // Ensure progress is updated after question display
    updateProgress();
}

/**
 * Generates HTML for a multiple-choice question.
 * @param {object} question - The question object.
 * @returns {string} HTML string for the multiple-choice question.
 */
function displayMultipleChoice(question) {
    let html = `<div class="question-text">${question.questionText}</div><div class="options">`;

    question.options.forEach((option, index) => {
        const letter = String.fromCharCode(65 + index); // A, B, C, D...
        const isSelected = userAnswers[currentQuestionIndex] === option;
        const isAnswered = userAnswers[currentQuestionIndex] !== null;
        const isCorrect = isAnswered && option === question.correctAnswer;
        const isIncorrect = isAnswered && isSelected && option !== question.correctAnswer;

        let optionClass = '';
        if (isCorrect) {
            optionClass = 'correct'; // Apply correct styling
        } else if (isIncorrect) {
            optionClass = 'incorrect'; // Apply incorrect styling
        } else if (isSelected) {
            optionClass = 'selected'; // Apply selected styling
        }

        // Add onclick event to select the option
        html += `
            <div class="option ${optionClass}"
                 onclick="selectOption('${option.replace(/'/g, "\\'")}')">
                <span class="option-letter">${letter}</span>
                <span>${option}</span>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

/**
 * Generates HTML for a fill-in-the-blank question.
 * @param {object} question - The question object.
 * @returns {string} HTML string for the fill-in-the-blank question.
 */
function displayFillInTheBlank(question) {
    let html = `<div class="question-text">`;

    if (question.sentenceParts) {
        // If sentenceParts are provided (e.g., ["Part 1", "Part 2"])
        html += question.sentenceParts[0];
        html += `<input type="text" class="fill-blank-input"
                         value="${userAnswers[currentQuestionIndex] || ''}"
                         onchange="setAnswer(this.value)" placeholder="Type your answer here">`;
        html += question.sentenceParts[1];
    } else {
        // Fallback if only questionText is provided with a blank placeholder
        html += question.questionText.replace('_____',
            `<input type="text" class="fill-blank-input"
                     value="${userAnswers[currentQuestionIndex] || ''}"
                     onchange="setAnswer(this.value)" placeholder="Type your answer here">`);
    }

    html += '</div>';
    return html;
}

/**
 * Generates HTML for a dropdown question (treated similarly to multiple choice for display).
 * @param {object} question - The question object.
 * @returns {string} HTML string for the dropdown question.
 */
function displayDropdown(question) {
    // For simplicity, treating dropdown as multiple choice visually.
    // A true dropdown would use <select> and <option> elements.
    let html = `<div class="question-text">${question.questionText}</div><div class="options">`;

    question.options.forEach((option, index) => {
        const letter = String.fromCharCode(65 + index);
        const isSelected = userAnswers[currentQuestionIndex] === option;
        const isAnswered = userAnswers[currentQuestionIndex] !== null;
        const isCorrect = isAnswered && option === question.correctAnswer;
        const isIncorrect = isAnswered && isSelected && option !== question.correctAnswer;

        let optionClass = '';
        if (isCorrect) {
            optionClass = 'correct';
        } else if (isIncorrect) {
            optionClass = 'incorrect';
        } else if (isSelected) {
            optionClass = 'selected';
        }

        html += `
            <div class="option ${optionClass}"
                 onclick="selectOption('${option.replace(/'/g, "\\'")}')">
                <span class="option-letter">${letter}</span>
                <span>${option}</span>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

/**
 * Generates HTML for a reading passage question, including the passage and its sub-question.
 * @param {object} question - The question object.
 * @returns {string} HTML string for the reading passage question.
 */
function displayReadingPassage(question) {
    let html = `
        <div class="question-text">${question.questionText}</div>
        <div class="passage">${question.passage}</div>
    `;

    // Display the first sub-question associated with the passage
    if (question.questions && question.questions.length > 0) {
        const subQuestion = question.questions[0]; // Assuming only one sub-question per passage for now
        html += `<div class="question-text">${subQuestion.questionText}</div><div class="options">`;

        subQuestion.options.forEach((option, index) => {
            const letter = String.fromCharCode(65 + index);
            const isSelected = userAnswers[currentQuestionIndex] === option;
            const isAnswered = userAnswers[currentQuestionIndex] !== null;
            const isCorrect = isAnswered && option === subQuestion.correctAnswer;
            const isIncorrect = isAnswered && isSelected && option !== subQuestion.correctAnswer;

            let optionClass = '';
            if (isCorrect) {
                optionClass = 'correct';
            } else if (isIncorrect) {
                optionClass = 'incorrect';
            } else if (isSelected) {
                optionClass = 'selected';
            }

            html += `
                <div class="option ${optionClass}"
                     onclick="selectOption('${option.replace(/'/g, "\\'")}')">
                    <span class="option-letter">${letter}</span>
                    <span>${option}</span>
                </div>
            `;
        });

        html += '</div>';
    }

    return html;
}

/**
 * Generates HTML for a drag-and-drop question.
 * @param {object} question - The question object.
 * @returns {string} HTML string for the drag-and-drop question.
 */
function displayDragAndDrop(question) {
    let html = `<div class="question-text">${question.questionText}</div>`;
    html += `<div class="drag-drop-container">`;
    html += `<p>Available words:</p>`;

    // Collect all unique options from all blanks to display as draggable items
    const allOptions = [];
    question.blanks.forEach(blank => {
        if (blank.options && Array.isArray(blank.options)) {
            blank.options.forEach(option => {
                if (!allOptions.includes(option)) {
                    allOptions.push(option);
                }
            });
        }
    });

    // Also add correct answers to options if not already included, to ensure they are draggable
    if (question.correctOrder && Array.isArray(question.correctOrder)) {
        question.correctOrder.forEach(answer => {
            if (!allOptions.includes(answer)) {
                allOptions.push(answer);
            }
        });
    }

    // Shuffle the drag items to ensure a random order each time
    const shuffledOptions = shuffleArray(allOptions);
    shuffledOptions.forEach(option => {
        html += `<span class="drag-item" draggable="true" ondragstart="drag(event)" data-word="${option}">${option}</span>`;
    });

    html += `<br><br>`;

    // Create the sentence with drop zones
    question.blanks.forEach((blank, index) => {
        html += blank.sentencePart; // Display the fixed part of the sentence
        // Create a drop zone for each blank that needs filling
        if (blank.sentencePart.includes('_____') || index < question.correctOrder.length) {
            html += `<span class="drop-zone" ondrop="drop(event)" ondragover="allowDrop(event)" data-blank="${index}">
                ${userAnswers[currentQuestionIndex] && userAnswers[currentQuestionIndex][index] ?
                  userAnswers[currentQuestionIndex][index] : 'Drop here'}
            </span>`;
        }
    });

    html += `</div>`;
    return html;
}

/**
 * Handles the selection of an option for multiple choice/dropdown questions.
 * @param {string} option - The selected option.
 */
function selectOption(option) {
    // Prevent changing the answer if it's already set
    if (userAnswers[currentQuestionIndex] !== null) {
        return;
    }

    userAnswers[currentQuestionIndex] = option; // Store the user's answer
    displayQuestion(); // Re-display the question to show selected state
    updateScore(); // Update the score
}

/**
 * Handles setting the answer for fill-in-the-blank questions.
 * @param {string} value - The text entered by the user.
 */
function setAnswer(value) {
    // Prevent changing the answer if it's already set
    if (userAnswers[currentQuestionIndex] !== null) {
        return;
    }

    userAnswers[currentQuestionIndex] = value.trim(); // Store the trimmed answer
    updateScore(); // Update the score
}

/**
 * Recalculates and updates the displayed score.
 */
function updateScore() {
    score = 0; // Reset score
    // Iterate through all questions to check correctness
    for (let i = 0; i < questions.length; i++) {
        // If an answer exists and it's correct, increment the score
        if (userAnswers[i] !== null && isCorrect(i)) {
            score++;
        }
    }
    // Update the score display text
    document.getElementById('scoreDisplay').textContent = `Score: ${score}/${questions.length}`;
}

/**
 * Checks if the user's answer for a specific question is correct.
 * @param {number} questionIndex - The index of the question to check.
 * @returns {boolean} True if the answer is correct, false otherwise.
 */
function isCorrect(questionIndex) {
    const question = questions[questionIndex];
    const userAnswer = userAnswers[questionIndex];

    // If no answer or undefined, it's not correct
    if (userAnswer === null || userAnswer === undefined) return false;

    switch (question.type) {
        case 'multiple_choice':
        case 'dropdown':
            // For multiple choice and dropdown, direct comparison
            return userAnswer === question.correctAnswer;

        case 'fill_in_the_blank':
            // For fill-in-the-blank, case-insensitive and trim comparison
            return userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();

        case 'reading_passage':
            // For reading passage, check the sub-question's answer
            if (question.questions && question.questions.length > 0) {
                return userAnswer === question.questions[0].correctAnswer;
            }
            return false;

        case 'drag_and_drop':
            // For drag and drop, compare the array of user answers with the correct order
            if (Array.isArray(userAnswer) && Array.isArray(question.correctOrder)) {
                // Use JSON.stringify for deep comparison of arrays
                return JSON.stringify(userAnswer) === JSON.stringify(question.correctOrder);
            }
            return false;

        default:
            return false; // Unknown question type
    }
}

/**
 * Navigates to the next question or finishes the quiz if it's the last question.
 */
function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++; // Move to the next question
        displayQuestion(); // Display the new question
    } else {
        showFinalScore(); // If it's the last question, show final score
    }
}

/**
 * Navigates to the previous question.
 */
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--; // Move to the previous question
        displayQuestion(); // Display the new question
    }
}

/**
 * Displays the final score modal with results and a message.
 */
function showFinalScore() {
    updateScore(); // Ensure score is up-to-date

    const modal = document.getElementById('finalScoreModal');
    const finalScoreDisplay = document.getElementById('finalScore');
    const scoreMessage = document.getElementById('scoreMessage');

    // Display the score (e.g., "7/10")
    finalScoreDisplay.textContent = `${score}/${questions.length}`;

    // Calculate percentage
    const percentage = Math.round((score / questions.length) * 100);

    let message = '';
    // Determine the message based on percentage
    if (percentage >= 90) {
        message = 'Excellent work! You are doing great!';
    } else if (percentage >= 70) {
        message = 'Good job! Keep practicing to improve.';
    } else if (percentage >= 50) {
        message = 'Not bad! There is room for improvement.';
    } else {
        message = 'Keep studying! Practice makes perfect.';
    }

    // Set the final message with percentage
    scoreMessage.textContent = `${percentage}% - ${message}`;
    modal.classList.add('show'); // Show the modal
}

/**
 * Restarts the quiz.
 * Resets state, re-shuffles questions, and displays the first question.
 */
function restartQuiz() {
    document.getElementById('finalScoreModal').classList.remove('show'); // Hide the modal

    // Re-shuffle questions and answers for a new quiz session
    questions = shuffleQuestionsAndAnswers(originalQuestions);

    // Reset quiz state
    currentQuestionIndex = 0;
    userAnswers = new Array(questions.length).fill(null);
    score = 0;

    // Re-display the first question and update score
    displayQuestion();
    updateScore();
}

// --- Drag and Drop functionality ---

/**
 * Prevents default behavior and adds a 'drag-over' class to the drop zone.
 * @param {Event} ev - The drag event.
 */
function allowDrop(ev) {
    ev.preventDefault(); // Allow dropping
    ev.target.classList.add('drag-over'); // Add visual feedback
}

/**
 * Sets the data to be transferred during a drag operation.
 * @param {Event} ev - The drag event.
 */
function drag(ev) {
    // Set the word being dragged as plain text data
    ev.dataTransfer.setData("text", ev.target.getAttribute('data-word'));
}

/**
 * Handles the drop event, places the dragged word into the blank, and updates the answer.
 * @param {Event} ev - The drop event.
 */
function drop(ev) {
    ev.preventDefault(); // Prevent default drop behavior
    ev.target.classList.remove('drag-over'); // Remove visual feedback

    const data = ev.dataTransfer.getData("text"); // Get the dragged word
    const blankIndex = parseInt(ev.target.getAttribute('data-blank')); // Get the index of the blank

    // Initialize the user answer array for the current question if it's null
    if (!userAnswers[currentQuestionIndex]) {
        userAnswers[currentQuestionIndex] = [];
    }

    // Place the dragged word into the correct blank index
    userAnswers[currentQuestionIndex][blankIndex] = data;
    ev.target.textContent = data; // Update the drop zone text
    updateScore(); // Update the score
}

// --- Initial setup ---
// Load questions when the script is first executed (after the DOM is ready)
document.addEventListener('DOMContentLoaded', loadQuestions);

// Make functions globally accessible for HTML onclick attributes
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.restartQuiz = restartQuiz;
window.selectOption = selectOption;
window.setAnswer = setAnswer;
window.allowDrop = allowDrop;
window.drag = drag;
window.drop = drop;
