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
            shuffledQuestion.options = shuffleArray(shuffledQuestion.options); // Shuffle the copy's options
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
        // The individual blank options are not shuffled for drag and drop, only the list of available drag items.
        // The `blanks` array order within the question remains the same for sentence structure.
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
    updateNextButtonState(); // Update next button state initially
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
    updateNextButtonState(); // Update next button state after new question is displayed
}

/**
 * Generates HTML for a multiple-choice question.
 * @param {object} question - The question object.
 * @returns {string} HTML string for the multiple-choice question.
 */
function displayMultipleChoice(question) {
    let html = `<div class="question-text">${question.questionText}</div><div class="options">`;
    const isAnswered = userAnswers[currentQuestionIndex] !== null;

    question.options.forEach((option, index) => {
        const letter = String.fromCharCode(65 + index); // A, B, C, D...
        const isSelected = userAnswers[currentQuestionIndex] === option;
        const isCorrectOption = option === question.correctAnswer;

        let optionClass = '';
        if (isAnswered) {
            if (isCorrectOption) {
                optionClass = 'correct'; // Always show correct answer if answered
            } else if (isSelected && !isCorrectOption) {
                optionClass = 'incorrect'; // Show incorrect if selected and wrong
            }
        } else if (isSelected) {
            optionClass = 'selected'; // Show selected if not yet answered
        }

        // Disable clicks if already answered
        const clickHandler = isAnswered ? '' : `onclick="selectOption('${option.replace(/'/g, "\\'")}')"`;

        html += `
            <div class="option ${optionClass}" ${clickHandler}>
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
    const userAnswer = userAnswers[currentQuestionIndex];
    const isAnswered = userAnswer !== null && userAnswer !== undefined;
    const correct = isAnswered && isCorrect(currentQuestionIndex);

    let inputClass = 'fill-blank-input';
    if (isAnswered) {
        inputClass += correct ? ' correct-input' : ' incorrect-input';
    }
    const disabledAttr = isAnswered ? 'disabled' : '';

    const currentInputValue = userAnswer || '';

    let blankHtml;
    if (question.sentenceParts) {
        blankHtml = `<input type="text" class="${inputClass}"
                         value="${currentInputValue}"
                         onchange="setAnswer(this.value)" placeholder="Type your answer here" ${disabledAttr}>`;
        html += question.sentenceParts[0] + blankHtml + question.sentenceParts[1];
    } else {
        blankHtml = `<input type="text" class="${inputClass}"
                     value="${currentInputValue}"
                     onchange="setAnswer(this.value)" placeholder="Type your answer here" ${disabledAttr}>`;
        html += question.questionText.replace('_____', blankHtml);
    }

    if (isAnswered) {
        if (!correct) {
            html += `<p style="color: #d32f2f; margin-top: 10px; font-weight: bold;">Correct answer: ${question.correctAnswer}</p>`;
        } else {
             html += `<p style="color: #4caf50; margin-top: 10px; font-weight: bold;">Correct!</p>`;
        }
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
    let html = `<div class="question-text">${question.questionText}</div><div class="options">`;
    const isAnswered = userAnswers[currentQuestionIndex] !== null;

    question.options.forEach((option, index) => {
        const letter = String.fromCharCode(65 + index);
        const isSelected = userAnswers[currentQuestionIndex] === option;
        const isCorrectOption = option === question.correctAnswer;

        let optionClass = '';
        if (isAnswered) {
            if (isCorrectOption) {
                optionClass = 'correct';
            } else if (isSelected && !isCorrectOption) {
                optionClass = 'incorrect';
            }
        } else if (isSelected) {
            optionClass = 'selected';
        }

        const clickHandler = isAnswered ? '' : `onclick="selectOption('${option.replace(/'/g, "\\'")}')"`;

        html += `
            <div class="option ${optionClass}" ${clickHandler}>
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
        const isAnswered = userAnswers[currentQuestionIndex] !== null;

        subQuestion.options.forEach((option, index) => {
            const letter = String.fromCharCode(65 + index);
            const isSelected = userAnswers[currentQuestionIndex] === option;
            const isCorrectOption = option === subQuestion.correctAnswer;

            let optionClass = '';
            if (isAnswered) {
                if (isCorrectOption) {
                    optionClass = 'correct';
                } else if (isSelected && !isCorrectOption) {
                    optionClass = 'incorrect';
                }
            } else if (isSelected) {
                optionClass = 'selected';
            }

            const clickHandler = isAnswered ? '' : `onclick="selectOption('${option.replace(/'/g, "\\'")}')"`;

            html += `
                <div class="option ${optionClass}" ${clickHandler}>
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

    const userAnswerArray = userAnswers[currentQuestionIndex];
    const isAnswered = checkIfAnswered();

    const allOptions = [];
    // Collect all unique options from all blanks' options (if provided)
    if (question.blanks) { // Ensure blanks exist
        question.blanks.forEach(blank => {
            if (blank.options && Array.isArray(blank.options)) {
                blank.options.forEach(option => {
                    if (!allOptions.includes(option)) {
                        allOptions.push(option);
                    }
                });
            }
        });
    }

    // Also add correct answers to options if not already included, to ensure they are draggable
    if (question.correctOrder && Array.isArray(question.correctOrder)) {
        question.correctOrder.forEach(answer => {
            if (!allOptions.includes(answer)) {
                allOptions.push(answer);
            }
        });
    }

    const shuffledOptions = isAnswered ? allOptions : shuffleArray(allOptions);

    shuffledOptions.forEach(option => {
        const isUsed = isAnswered && userAnswerArray && userAnswerArray.includes(option);
        html += `<span class="drag-item ${isUsed ? 'used-item' : ''}" draggable="${isAnswered ? 'false' : 'true'}" ondragstart="drag(event)" data-word="${option}">${option}</span>`;
    });

    html += `<br><br>`;

    // Reconstruct the sentence with drop zones based on correctOrder.length
    // Assuming question.blanks contains sentence parts and we insert a drop zone for each correctOrder item.
    // The number of drop zones should match correctOrder.length.
    // The sentence parts in question.blanks should be correctly interleaved.
    let sentenceParts = question.blanks.map(b => b.sentencePart); // Extract just the sentence parts

    let sentenceWithBlanksHtml = '';
    const numBlanks = question.correctOrder ? question.correctOrder.length : 0;

    for (let i = 0; i < numBlanks; i++) { // Iterate based on the number of expected answers
        // Add the text part before the current blank
        if (sentenceParts[i]) {
            sentenceWithBlanksHtml += sentenceParts[i];
        }

        const currentDroppedWord = (userAnswerArray && userAnswerArray[i] !== null) ? userAnswerArray[i] : null;
        const correctWord = question.correctOrder[i];
        const dropZoneIsCorrect = isAnswered && currentDroppedWord === correctWord;
        const dropZoneIsIncorrect = isAnswered && currentDroppedWord !== correctWord && currentDroppedWord !== null;

        let dropZoneClass = 'drop-zone';
        if (isAnswered) {
            if (dropZoneIsCorrect) {
                dropZoneClass += ' correct';
            } else if (dropZoneIsIncorrect) {
                dropZoneClass += ' incorrect';
            }
        }

        const disableDropForBlank = isAnswered || (userAnswerArray && userAnswerArray[i] !== null);
        const dropEvents = disableDropForBlank ? '' : `ondrop="drop(event)" ondragover="allowDrop(event)"`;

        sentenceWithBlanksHtml += `<span class="${dropZoneClass}" ${dropEvents} data-blank="${i}">
            ${currentDroppedWord || 'Drop here'}
        </span>`;

        if (isAnswered && dropZoneIsIncorrect) {
            sentenceWithBlanksHtml += `<span style="color: #d32f2f; font-weight: bold; margin-left: 5px;">(Correct: ${correctWord})</span>`;
        } else if (isAnswered && dropZoneIsCorrect) {
             sentenceWithBlanksHtml += `<span style="color: #4caf50; font-weight: bold; margin-left: 5px;">(Correct!)</span>`;
        }
    }

    // Add any remaining sentence parts after the last blank
    if (sentenceParts.length > numBlanks) {
        for (let i = numBlanks; i < sentenceParts.length; i++) {
            sentenceWithBlanksHtml += sentenceParts[i];
        }
    }

    html += sentenceWithBlanksHtml;
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
    displayQuestion(); // Re-display the question to show selected state and feedback
    updateScore(); // Update the score
    updateNextButtonState(); // Update next button state
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
    displayQuestion(); // Re-display to show feedback and disable input
    updateScore(); // Update the score
    updateNextButtonState(); // Update next button state
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
            return userAnswer === question.correctAnswer;

        case 'fill_in_the_blank':
            return userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();

        case 'reading_passage':
            if (question.questions && question.questions.length > 0) {
                return userAnswer === question.questions[0].correctAnswer;
            }
            return false;

        case 'drag_and_drop':
            // For drag and drop, compare the array of user answers with the correct order
            if (Array.isArray(userAnswer) && Array.isArray(question.correctOrder)) {
                // Check if all elements match in order
                if (userAnswer.length !== question.correctOrder.length) return false;
                for (let i = 0; i < userAnswer.length; i++) {
                    if (userAnswer[i] !== question.correctOrder[i]) {
                        return false;
                    }
                }
                return true;
            }
            return false;

        default:
            return false; // Unknown question type
    }
}

/**
 * Checks if the current question has been answered.
 * @returns {boolean} True if answered, false otherwise.
 */
function checkIfAnswered() {
    const question = questions[currentQuestionIndex];
    const userAnswer = userAnswers[currentQuestionIndex];

    if (userAnswer === null || userAnswer === undefined) {
        return false;
    }

    switch (question.type) {
        case 'multiple_choice':
        case 'dropdown':
        case 'reading_passage':
            return userAnswer !== null;
        case 'fill_in_the_blank':
            return userAnswer.trim().length > 0; // Ensure it's not just empty or whitespace
        case 'drag_and_drop':
            // For drag and drop, ensure all blanks meant to be filled are indeed filled
            if (Array.isArray(userAnswer) && question.correctOrder) {
                return userAnswer.length === question.correctOrder.length && userAnswer.every(ans => ans !== null && ans !== undefined);
            }
            return false;
        default:
            return false;
    }
}

/**
 * Updates the state of the 'Next' button based on whether the current question is answered.
 */
function updateNextButtonState() {
    const nextBtn = document.getElementById('nextBtn');
    // Disable 'Next' if not answered AND not the last question.
    // The 'Finish Quiz' button (on the last question) should always be enabled.
    nextBtn.disabled = !checkIfAnswered() && currentQuestionIndex < questions.length - 1;
}

/**
 * Navigates to the next question or finishes the quiz if it's the last question.
 */
function nextQuestion() {
    // If not answered and it's not the last question, prevent navigation
    if (!checkIfAnswered() && currentQuestionIndex < questions.length - 1) {
        alert("Please answer the current question before proceeding.");
        return;
    }

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
    updateNextButtonState(); // Update next button state for restarted quiz
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
    // Only allow dragging if the question is not yet answered
    if (checkIfAnswered()) {
        ev.preventDefault();
        return;
    }
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

    const blankIndex = parseInt(ev.target.getAttribute('data-blank'));
    const question = questions[currentQuestionIndex];

    // Initialize the user answer array for the current question if it's null
    if (!userAnswers[currentQuestionIndex]) {
        userAnswers[currentQuestionIndex] = new Array(question.correctOrder.length).fill(null);
    }

    // Prevent dropping if this specific blank is already filled
    if (userAnswers[currentQuestionIndex][blankIndex] !== null) {
        return;
    }

    const data = ev.dataTransfer.getData("text"); // Get the dragged word

    userAnswers[currentQuestionIndex][blankIndex] = data;
    displayQuestion(); // Re-render to update the display (and potentially disable drag/drop)
    updateScore(); // Update the score
    updateNextButtonState(); // Update next button state after a drop
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
