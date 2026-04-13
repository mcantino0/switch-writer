const sentenceForm = document.getElementById('sentence-form');
const sentenceText = document.getElementById('sentence-text');
const optionList = document.getElementById('option-list');
const correctAnswer = document.getElementById('correct-answer');
const hasCorrect = document.getElementById('has-correct');
const sentenceList = document.getElementById('sentence-list');
const activityInfo = document.getElementById('activity-info');
const exportStatus = document.getElementById('export-status');
const formStatus = document.getElementById('form-status');
const saveActivityButton = document.getElementById('save-activity');
const loadActivityButton = document.getElementById('load-activity');
const exportStudentButton = document.getElementById('export-student');
const clearActivityButton = document.getElementById('clear-activity');
const clearEntryButton = document.getElementById('clear-entry');
const addSentenceButton = document.getElementById('add-sentence');
const activityNameInput = document.getElementById('activity-name');
const savedActivitiesSelect = document.getElementById('saved-activities');
const colorSchemeSelect = document.getElementById('color-scheme');

const STORAGE_KEY = 'accessible-fillblank-activities';
let activity = {
  title: '',
  sentences: [],
  colorScheme: 'white'
};

function initializeCheckboxHandler() {
  hasCorrect.addEventListener('change', () => {
    formStatus.textContent = '';
  });
}

function updateStatus(message) {
  activityInfo.textContent = message;
}

function parseOptions(value) {
  return value
    .split(',')
    .map(option => option.trim())
    .filter(Boolean);
}

function renderSentenceList() {
  sentenceList.innerHTML = '';

  if (activity.sentences.length === 0) {
    updateStatus('No sentences added yet.');
    return;
  }

  updateStatus(`${activity.sentences.length} sentence(s) in this activity.`);

  activity.sentences.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'sentence-item';
    li.innerHTML = `
      <p><strong>Sentence ${index + 1}:</strong> ${escapeHtml(item.text)}</p>
      <p><strong>Options:</strong> ${item.options.map(escapeHtml).join(', ')}</p>
      ${item.correctAnswer ? `<p><strong>Correct answer:</strong> ${escapeHtml(item.correctAnswer)}</p>` : '<p><em>No correct answer specified.</em></p>'}
    `;

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'sentence-buttons';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      activity.sentences.splice(index, 1);
      renderSentenceList();
      populateSavedActivities();
    });

    buttonGroup.appendChild(removeButton);
    li.appendChild(buttonGroup);
    sentenceList.appendChild(li);
  });
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function loadSavedActivities() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

function saveActivitiesMap(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function populateSavedActivities() {
  const savedMap = loadSavedActivities();
  const keys = Object.keys(savedMap);
  savedActivitiesSelect.innerHTML = '';
  if (keys.length === 0) {
    const option = document.createElement('option');
    option.textContent = 'No saved activities available';
    option.value = '';
    savedActivitiesSelect.appendChild(option);
    savedActivitiesSelect.disabled = true;
    return;
  }

  savedActivitiesSelect.disabled = false;
  const placeholder = document.createElement('option');
  placeholder.textContent = 'Select saved activity';
  placeholder.value = '';
  savedActivitiesSelect.appendChild(placeholder);

  keys.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    savedActivitiesSelect.appendChild(option);
  });
}

function saveActivity() {
  const name = activityNameInput.value.trim();
  if (!name) {
    exportStatus.textContent = 'Enter an activity name before saving.';
    return;
  }

  if (activity.sentences.length === 0) {
    exportStatus.textContent = 'Add at least one sentence before saving.';
    return;
  }

  const savedMap = loadSavedActivities();
  savedMap[name] = activity;
  saveActivitiesMap(savedMap);
  populateSavedActivities();
  exportStatus.textContent = `Activity saved as "${name}".`;
}

function loadActivity() {
  const name = savedActivitiesSelect.value;
  if (!name) {
    exportStatus.textContent = 'Choose a saved activity first.';
    return;
  }

  const savedMap = loadSavedActivities();
  const savedActivity = savedMap[name];
  if (!savedActivity) {
    exportStatus.textContent = 'Saved activity not found.';
    return;
  }

  activity = JSON.parse(JSON.stringify(savedActivity));
  activityNameInput.value = name;
  colorSchemeSelect.value = activity.colorScheme || 'white';
  renderSentenceList();
  exportStatus.textContent = `Loaded activity "${name}".`;
}

function clearActivity() {
  activity = { title: '', sentences: [] };
  renderSentenceList();
  exportStatus.textContent = 'Activity cleared. You can start again.';
}

function clearEntry() {
  sentenceText.value = '';
  optionList.value = '';
  correctAnswer.value = '';
  hasCorrect.checked = false;
  formStatus.textContent = '';
  sentenceText.focus();
}

function validateSentence(text, options, hasCorrect, answer) {
  if (!text.trim()) {
    formStatus.textContent = 'Sentence text cannot be empty.';
    return false;
  }
  if (!text.includes('[blank]')) {
    formStatus.textContent = 'Sentence text must include [blank] to mark the missing word.';
    return false;
  }
  if (options.length < 2) {
    formStatus.textContent = 'Provide at least two word options.';
    return false;
  }
  if (hasCorrect) {
    if (!answer.trim()) {
      formStatus.textContent = 'Please provide the correct answer.';
      return false;
    }
    if (!options.includes(answer)) {
      formStatus.textContent = 'The correct answer must match one of the options.';
      return false;
    }
  }
  return true;
}

function addSentence() {
  try {
    const text = sentenceText.value.trim();
    const options = parseOptions(optionList.value);
    const hasCorrectChecked = hasCorrect.checked;
    const answer = correctAnswer.value.trim();

    if (!validateSentence(text, options, hasCorrectChecked, answer)) {
      return;
    }

    activity.sentences.push({ text, options, correctAnswer: hasCorrectChecked ? answer : null });
    renderSentenceList();
    formStatus.textContent = 'Sentence added to the activity.';
    clearEntry();
  } catch (error) {
    formStatus.textContent = 'Error: ' + error.message;
  }
}

function createStudentHtml(activityData) {
  const scriptContent = `
    const activity = ${JSON.stringify(activityData)};
    let currentIndex = 0;
    let selectedIndex = -1;
    const choices = [];
    const selections = [];

    const sentenceDisplay = document.getElementById('sentence-display');
    const choicesContainer = document.getElementById('choices-container');
    const summaryDisplay = document.getElementById('summary-display');
    const mainContent = document.getElementById('main-content');

    function formatSentenceText(text) {
      return text.replace('[blank]', '_____');
    }

    function createChoiceButton(option, index) {
      const button = document.createElement('button');
      button.className = 'choice-button';
      button.textContent = option;
      button.dataset.index = index;
      button.addEventListener('click', () => {
        selectChoice(index, option);
      });
      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectChoice(index, option);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          const nextIndex = (index + 1) % choices.length;
          choices[nextIndex].focus();
        } else if (e.key === 'Shift') {
          // Handle Shift+Tab
          return;
        }
      });
      return button;
    }

    function renderSentence() {
      selectedIndex = -1;
      sentenceDisplay.textContent = formatSentenceText(activity.sentences[currentIndex].text);
      choicesContainer.innerHTML = '';
      choices.length = 0;

      const sentence = activity.sentences[currentIndex];
      sentence.options.forEach((option, index) => {
        const button = createChoiceButton(option, index);
        choicesContainer.appendChild(button);
        choices.push(button);
      });

      choices[0].focus();
    }

    function selectChoice(index, option) {
      selectedIndex = index;
      selections.push(option);
      moveToNextSentence();
    }

    function moveToNextSentence() {
      currentIndex += 1;
      if (currentIndex >= activity.sentences.length) {
        showSummary();
      } else {
        renderSentence();
      }
    }

    function showSummary() {
      mainContent.innerHTML = '';
      const summaryTitle = document.createElement('h1');
      summaryTitle.textContent = 'Activity Complete';
      summaryTitle.style.fontSize = '3rem';
      summaryTitle.style.marginBottom = '2rem';
      mainContent.appendChild(summaryTitle);

      activity.sentences.forEach((sentence, index) => {
        const sentenceDiv = document.createElement('div');
        sentenceDiv.className = 'summary-sentence';
        const completedSentence = sentence.text.replace('[blank]', '<strong>' + selections[index] + '</strong>');
        let pContent = completedSentence;
        const incorrectColor = activity.colorScheme && activity.colorScheme.startsWith('black') ? 'white' : 'red';
        if (sentence.correctAnswer && selections[index] !== sentence.correctAnswer) {
          pContent += ' <span style="color: ' + incorrectColor + '; font-weight: bold;">(Incorrect)</span>';
        }
        sentenceDiv.innerHTML = '<p>' + pContent + '</p>';
        mainContent.appendChild(sentenceDiv);
      });

      const restartButton = document.createElement('button');
      restartButton.className = 'restart-button';
      restartButton.textContent = 'Start Again';
      restartButton.addEventListener('click', () => {
        location.reload();
      });
      mainContent.appendChild(restartButton);
      restartButton.focus();
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
          e.preventDefault();
          restartButton.focus();
        }
      });
    }

    renderSentence();
  `;

  // Define colors based on scheme
  const scheme = activityData.colorScheme || 'white';
  let bgColor, textColor, sentenceBg, sentenceBorder, choiceBg, choiceBorder, focusColor, summaryBg, summaryBorder, restartBg, restartBorder;
  if (scheme === 'white') {
    bgColor = '#ffffff';
    textColor = '#000000';
    sentenceBg = '#f0f0f0';
    sentenceBorder = '#000000';
    choiceBg = '#e0e0e0';
    choiceBorder = '#333';
    focusColor = '#2563eb';
    summaryBg = '#f0f0f0';
    summaryBorder = '#000000';
    restartBg = '#1d4ed8';
    restartBorder = '#001a4d';
  } else if (scheme === 'black-red') {
    bgColor = '#000000';
    textColor = '#ff0000';
    sentenceBg = '#000000';
    sentenceBorder = '#ffffff';
    choiceBg = '#000000';
    choiceBorder = '#cccccc';
    focusColor = '#ff0000';
    summaryBg = '#000000';
    summaryBorder = '#ffffff';
    restartBg = '#ff0000';
    restartBorder = '#aa0000';
  } else if (scheme === 'black-yellow') {
    bgColor = '#000000';
    textColor = '#ffff00';
    sentenceBg = '#000000';
    sentenceBorder = '#ffffff';
    choiceBg = '#000000';
    choiceBorder = '#cccccc';
    focusColor = '#ffff00';
    summaryBg = '#000000';
    summaryBorder = '#ffffff';
    restartBg = '#ffff00';
    restartBorder = '#aaaa00';
  } else if (scheme === 'black-green') {
    bgColor = '#000000';
    textColor = '#00ff00';
    sentenceBg = '#000000';
    sentenceBorder = '#ffffff';
    choiceBg = '#000000';
    choiceBorder = '#cccccc';
    focusColor = '#00ff00';
    summaryBg = '#000000';
    summaryBorder = '#ffffff';
    restartBg = '#00ff00';
    restartBorder = '#00aa00';
  }

  const styleContent = `* { margin: 0; padding: 0; box-sizing: border-box; }html, body { width: 100%; height: 100%; font-family: Arial, sans-serif; background: ${bgColor}; color: ${textColor}; overflow: hidden; }body { padding: 1rem; }#main-content { width: 100%; height: 100%; display: flex; flex-direction: column; gap: 1.5rem; }#sentence-display { flex-shrink: 0; width: 100%; background: ${sentenceBg}; padding: 1.5rem; border: 4px solid ${sentenceBorder}; border-radius: 10px; font-size: 2.5rem; font-weight: bold; line-height: 1.4; text-align: center; display: flex; align-items: center; justify-content: center; word-wrap: break-word; min-height: 150px; }#choices-container { flex: 1; width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 0.5rem; overflow-y: auto; align-content: start; }button { outline: none; }button:focus { outline: 6px solid ${focusColor}; outline-offset: 4px; }.choice-button { padding: 1.5rem 1rem; font-size: 1.8rem; font-weight: bold; background: ${choiceBg}; border: 4px solid ${choiceBorder}; border-radius: 10px; cursor: pointer; text-align: center; transition: all 0.2s; display: flex; align-items: center; justify-content: center; min-height: 120px; color: ${textColor}; }.choice-button:hover { background: ${scheme.startsWith('black') ? '#111111' : '#d0d0d0'}; transform: scale(1.02); }.choice-button:focus { transform: scale(1.02); border-color: ${focusColor}; box-shadow: 0 0 0 4px ${focusColor}; }.summary-sentence { width: 100%; background: ${summaryBg}; padding: 2rem 1.5rem; border: 4px solid ${summaryBorder}; border-radius: 10px; margin-bottom: 1rem; }.summary-sentence p { font-size: 2rem; font-weight: bold; line-height: 1.6; text-align: center; }.restart-button { width: auto; padding: 0.75rem 0.5rem; font-size: 1.25rem; font-weight: bold; background: ${restartBg}; color: ${bgColor}; border: 4px solid ${restartBorder}; border-radius: 10px; cursor: pointer; margin: 1rem auto 0; flex-shrink: 0; }`;

  const htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>' + escapeHtml(activityData.title || 'Activity') + '</title><style>' + styleContent + '</style></head><body><div id="main-content"><div id="sentence-display"></div><div id="choices-container"></div><div id="summary-display"></div></div><script>' + scriptContent + '</script></body></html>';

  return htmlContent;
}

function exportStudentHtml() {
  if (activity.sentences.length === 0) {
    exportStatus.textContent = 'Add at least one sentence before exporting.';
    return;
  }

  const saveName = activityNameInput.value.trim() || 'student-activity';
  const html = createStudentHtml({ ...activity, title: saveName });
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${saveName.replace(/[^a-z0-9\-]/gi, '_').toLowerCase()}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  exportStatus.textContent = `Student activity exported as ${anchor.download}.`;
}

function attachEventListeners() {
  addSentenceButton.addEventListener('click', addSentence);
  clearEntryButton.addEventListener('click', clearEntry);
  saveActivityButton.addEventListener('click', saveActivity);
  loadActivityButton.addEventListener('click', loadActivity);
  clearActivityButton.addEventListener('click', clearActivity);
  exportStudentButton.addEventListener('click', exportStudentHtml);
  colorSchemeSelect.addEventListener('change', () => {
    activity.colorScheme = colorSchemeSelect.value;
  });
  initializeCheckboxHandler();
}

attachEventListeners();
populateSavedActivities();
renderSentenceList();
