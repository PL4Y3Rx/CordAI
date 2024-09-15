let isDragging = false;
let offsetX, offsetY;

const bar = document.getElementById('dashboard-bar-menu');
const dashboard = document.getElementById('dashboard-ai');
const chatInput = document.getElementById('chat-input')
const listMessages = document.getElementById('container-list')
const sendIcon = document.getElementById('send-icon');
const stopIcon = document.getElementById('stop-icon');

const buttonAI = document.getElementById('ai-setting');
const menuAI = document.getElementById('menu-ai');
const deleteButton = document.getElementById('delete-message');
const checkboxList = document.getElementsByClassName('custom-checkbox');

const buttonGuide = document.getElementById('guide-user');
const buttonDeleteCharacter = document.getElementById('delete-character');
const statusUser = document.getElementById('user-status');
const buttonSettingUser = document.getElementById('setting-user');
const menuUser = document.getElementById('menu-user');

const uploadAvatar = document.getElementById('upload-avatar');
const buttonUsername = document.getElementById('rename-user')
const containerName = document.getElementById('method-username')

const valueName = document.getElementById('change-username');
const saveName = document.getElementById('save');
const cancelName = document.getElementById('cancel');

let deleteMessageScheduled = false;

let template = null;
let promptNameCharacterAI = null;
let promptAvatarCharacterAI = null;
let promptPersonalityAI = null;
let promptScenarioAI = null;
let promptFirstMessageIntro = null;

let isFirstMessage = true;
let usernameUser = null;
let avatarUser = null;
let userID = null;
let chatID = null;
let messageID = null

let trackAvatarAi = null;
let trackNameAi = null;
let trackChatID = null;
let trackMessageID = null;
let tempDate = null;
let storeMessage = '';
let lastSentMessage = '';

let userHasPrompted = false;
let isSending = false;
let isGenerated = false;
let messageElements = [];
let trackResponses = [];
let trackTimes = [];
let trackTempDeletion = [];
let trackTempDate = null;
let currentResponseIndex = 0;

const replacements = {
    '{{char}}': `${promptNameCharacterAI}`,
    '{{user}}': `${usernameUser}`
};

function openDashboard() {
    const dashboard = document.getElementById('dashboard-ai');
    dashboard.style.display = 'block';
}

buttonGuide.addEventListener('click', () => {
    window.open('https://www.example.com', '_blank');
})

function closeDashboard() {
    const dashboard = document.getElementById('dashboard-ai');
    dashboard.style.display = 'none';
}

bar.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - dashboard.getBoundingClientRect().left;
    offsetY = e.clientY - dashboard.getBoundingClientRect().top;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
});

function onMouseMove(e) {
    if (isDragging) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const dashboardRect = dashboard.getBoundingClientRect();

        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;

        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;
        if (newLeft + dashboardRect.width > viewportWidth) {
            newLeft = viewportWidth - dashboardRect.width;
        }
        if (newTop + dashboardRect.height > viewportHeight) {
            newTop = viewportHeight - dashboardRect.height;
        }

        dashboard.style.left = `${newLeft}px`;
        dashboard.style.top = `${newTop}px`;
    }
}

function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}

document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    handleLogin();
});

function checkUsername() {
    const usernameElement = document.getElementById('user-name');

    if (usernameUser) {
        usernameElement.textContent = usernameUser
    }
}

buttonAI.addEventListener('click', () => {
    if (menuAI.style.display === 'none' || menuAI.style.display === '') {
        menuAI.style.display = 'block';
    } else {
        menuAI.style.display = 'none';
    }
})

async function sessionAuth() {
    const storedUserID = sessionStorage.getItem("userID");
    const storedUsername = sessionStorage.getItem("username");

    if (storedUserID && storedUsername) {
        userID = storedUserID;
        usernameUser = storedUsername;

        deleteLogin();
        checkChat();
        checkAvatar();
        checkUsername();
        return true;
    } else {
        return false;
    }
}

async function handleLogin() {
    const authID = document.getElementById('authID').value;
    const username = document.getElementById('username').value;

    console.log("AuthID:", authID);
    console.log("Username:", username);

    usernameUser = username;
    userID = authID;

    loginUser(userID, usernameUser);
}

async function loginUser(authID, username) {
    try {
        const response = await fetch('http://localhost:8000/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ authID, username }),
            credentials: 'include',
        })

        const data = await response.json();
        console.log('Success:', data);

        if (data.message === 'User authenticated successfully' || data.message === 'User created successfully') {
            userID = data.authID;
            usernameUser = data.username;

            console.log("Auth Created:", username, " and ", userID)

            sessionStorage.setItem("userID", userID);
            sessionStorage.setItem("username", username);

            deleteLogin();
            checkChat()

        } else if (data.message === 'Username exists, please provide your AuthID') {
            alert('Please provide your AuthID to log in.');
        }

    } catch (error) {
        console.error(error)
    }
}

async function deleteLogin() {
    const login = document.getElementById('login');
    const warning = document.getElementById('warning');

    login.style.display = 'none';
    warning.style.display = 'none';
}

function openChat() {
    const fileReader = document.getElementById('file-input');
    chatID = null;
    fileReader.click();
}

function updateReplacements() {
    return {
        '{{char}}': promptNameCharacterAI,
        '{{user}}': usernameUser
    };
}

function replacePlaceholders(templateString, replacements) {
    return Object.keys(replacements).reduce((str, placeholder) => {
        const regex = new RegExp(placeholder, 'g');
        return str.replace(regex, replacements[placeholder]);
    }, templateString);
}

function validateTemplate(template) {
    return template && typeof template.name_character === 'string' &&
        typeof template.avatar_character === 'string' &&
        typeof template.personality_character === 'string' &&
        typeof template.scenario_character === 'string' &&
        typeof template.first_input_prompt === 'string'
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.yaml')) {
        console.log('Selected file:', file.name);
        const reader = new FileReader();

        reader.onload = async function (event) {
            const yamlContent = event.target.result;
            console.log('YAML Content:', yamlContent);

            try {
                const data = jsyaml.load(yamlContent);
                console.log('Parsed YAML Data:', data);

                if (validateTemplate(data)) {
                    template = data;
                    promptNameCharacterAI = data.name_character;
                    promptAvatarCharacterAI = data.avatar_character;
                    promptPersonalityAI = data.personality_character;
                    promptScenarioAI = data.scenario_character;
                    promptFirstMessageIntro = data.first_input_prompt;

                    const replacements = updateReplacements();
                    console.log('Replacements:', replacements);

                    promptNameCharacterAI = replacePlaceholders(promptNameCharacterAI, replacements);
                    promptAvatarCharacterAI = replacePlaceholders(promptAvatarCharacterAI, replacements);
                    promptPersonalityAI = replacePlaceholders(promptPersonalityAI, replacements);
                    promptScenarioAI = replacePlaceholders(promptScenarioAI, replacements);
                    promptFirstMessageIntro = replacePlaceholders(promptFirstMessageIntro, replacements);

                    console.log('Updated Template Values:', {
                        promptNameCharacterAI,
                        promptAvatarCharacterAI,
                        promptPersonalityAI,
                        promptScenarioAI,
                        promptFirstMessageIntro
                    });

                    const response = await fetch('http://localhost:8000/open-conversation', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            chatID,
                            aiName: promptNameCharacterAI,
                            aiAvatar: promptAvatarCharacterAI,
                            aiIntro: promptFirstMessageIntro,
                            aiPersona: promptPersonalityAI,
                            aiScenario: promptScenarioAI
                        })
                    });

                    const aiName = document.getElementById('ai-name');
                    const aiAvatar = document.getElementById('ai-avatar')

                    aiName.textContent = promptNameCharacterAI;
                    aiAvatar.src = promptAvatarCharacterAI;

                    const dataAi = await response.json();
                    console.log('Open Conversation Response:', dataAi);
                    console.log('Success:', dataAi);

                    checkAllMessages();
                    removeMessagesFromDOM();

                    if (dataAi.chatID) {
                        chatID = dataAi.chatID;
                        createChatExistance(chatID);
                    }

                    checkFirstMessage(true);

                } else {
                    console.error('Template validation failed.');
                }
            } catch (e) {
                console.error('Error parsing YAML file:', e);
            }
        };

        reader.onerror = function (event) {
            console.error('FileReader error:', event.target.error);
        };

        reader.readAsText(file);
    } else {
        console.log("Ignoring the action. YAML file required.");
    }
}

uploadAvatar.addEventListener('click', handleAvatarUser);
cancelName.addEventListener('click', handleAbortName);

function handleAvatarUser() {
    const fileInput = document.getElementById('upload-avatar-input');
    fileInput.click();
}

saveName.addEventListener('click', async function handleUpdateName(event) {
    event.preventDefault();

    const getName = valueName.value;

    if (!getName.trim()) {
        console.log('Name is empty. Please enter a name.');
        return;
    }

    try {
        const response = await fetch('http://localhost:8000/update-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ authID: userID, username: getName })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Update successful:', data);

        sessionStorage.setItem('username', getName);
        checkUsername();

    } catch (error) {
        console.error('Error updating name:', error);
    }
});

function handleAbortName() {
    containerName.style.display = 'none';
    console.log('Operation cancelled!')
}

async function handleAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        console.log(`Selected file: ${file.name}`);

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await fetch('http://localhost:8000/request-authID', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ authID: userID })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Avatar update successful:', data);

            if(data.authID){
                try {
                    const response = await fetch('http://localhost:8000/update-avatar', {
                        method: 'POST',
                        body: formData
                    });
        
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
        
                    const data = await response.json();
                    console.log('Avatar update successful:', data);
        
                    if (data.success) {
                        document.getElementById('user-avatar').src = data.filePath;
                    }
                } catch (error) {
                    console.error('Error updating avatar:', error);
                }
            }
        } catch (error) {
            console.error('Error updating avatar:', error);
        }
    } else {
        console.error('No file selected.');
    }
}

async function checkAvatar() {
    try {
        const response = await fetch('http://localhost:8000/return-avatar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ authID: userID })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
            document.getElementById('user-avatar').src = data.avatar;
            avatarUser = data.avatar;
        } else {
            console.error('Error:', data.error);
        }
    } catch (error) {
        console.error('Error fetching avatar:', error);
    }
}


buttonUsername.addEventListener('click', () => {
    if (containerName.style.display === 'none' || containerName.style.display === '') {
        containerName.style.display = 'block';
    } else {
        containerName.style.display = 'none';
    }
})

buttonSettingUser.addEventListener('click', () => {
    if (menuUser.style.display === 'none' || menuUser.style.display === '') {
        menuUser.style.display = 'block';
    } else {
        menuUser.style.display = 'none';
    }
})

buttonDeleteCharacter.addEventListener('click', () => {
    deleteCharacter()
})

function checkAllMessages() {
    const checkboxes = document.querySelectorAll('#container-list .custom-checkbox input[type="checkbox"]');

    checkboxes.forEach(checkbox => {
        checkbox.checked = true;

        const parentLi = checkbox.closest('li');
        const liId = parentLi.id;
        if (!trackTempDeletion.includes(liId)) {
            trackTempDeletion.push(liId);
        }
    });

    console.log('All messages checked. Track Temp Deletion:', trackTempDeletion);
}

function removeMessagesFromDOM() {
    trackTempDeletion.forEach(messageId => {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            messageElement.remove();
        }
    });

    trackTempDeletion = [];

    console.log('Messages removed from DOM');
}

deleteButton.addEventListener('click', () => {
    for (let i = 0; i < checkboxList.length; i++) {
        const checkboxLabel = checkboxList[i];
        const checkbox = checkboxLabel.querySelector('input[type="checkbox"]');

        if (checkboxLabel.style.display === 'none' || checkboxLabel.style.display === '') {
            checkboxLabel.style.display = 'block';
        } else {
            checkboxLabel.style.display = 'none';
        }

        if (!deleteMessageScheduled) {
            deleteMessageScheduled = true;
            setTimeout(() => {
                deleteMessage();
                deleteMessageScheduled = false;
            }, 100);
        }

        checkbox.addEventListener('change', function () {
            const parentLi = checkbox.closest('li');
            const liId = parentLi.id;
            console.log('Checkbox for message with ID:', liId, 'was toggled. Checked:', checkbox.checked);

            if (checkbox.checked) {
                if (!trackTempDeletion.includes(liId)) {
                    trackTempDeletion.push(liId);
                }
            } else {
                const index = trackTempDeletion.indexOf(liId);
                if (index > -1) {
                    trackTempDeletion.splice(index, 1);
                }
            }

            console.log('Track Temp Deletion:', trackTempDeletion);

            if (!deleteMessageScheduled) {
                deleteMessageScheduled = true;
                setTimeout(() => {
                    deleteMessage();
                    deleteMessageScheduled = false;
                }, 100);
            }
        });
    }
});

async function deleteCharacter() {
    if (!chatID) {
        console.log("No conversation opened, yet.");
        return;
    }

    checkAllMessages();

    try {
        const response = await fetch('http://localhost:8000/delete-character', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ chatID: chatID })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete character');
        }

        const data = await response.json();
        console.log('Character deleted successfully:', data);

        const listItem = document.querySelector(`li[data-chat-id="${chatID}"]`);
        if (listItem) {
            listItem.remove();
        } else {
            console.log('Chat ID not found in the DOM.');
        }

        await deleteMessage();
        chatID = null;

    } catch (error) {
        console.error('Error deleting character:', error);
    }
}

async function deleteMessage() {
    if (trackTempDeletion.length === 0) {
        console.log('No messages to delete.');
        return;
    }

    try {
        const response = await fetch('http://localhost:8000/delete-messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messageIds: trackTempDeletion })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete messages');
        }

        const data = await response.json();

        console.log('Messages deleted successfully:', data);

        trackTempDeletion.forEach(messageId => {
            const messageElement = document.getElementById(messageId);
            if (messageElement) {
                messageElement.remove();
            }
        });

        trackTempDeletion = [];

    } catch (error) {
        console.error('Error deleting messages:', error);
    }
}

async function checkFirstMessage(isFirstMessage) {
    if (promptFirstMessageIntro && isFirstMessage) {
        const responseIntroduction = await fetch('http://localhost:8000/assign-message-id', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                authID: userID,
                chatID: chatID,
                messageContent: promptFirstMessageIntro,
                userOrAI: false,
                messageID: null
            })
        });

        const dataGenerated = await responseIntroduction.json();
        console.log('Assign Message ID Response:', dataGenerated);

        console.log('Message successfully created:', dataGenerated);
        const firstMessageID = dataGenerated.messageID;
        createMessageElement(promptFirstMessageIntro, firstMessageID, false);
        isFirstMessage = false;
    }
}

async function checkChat() {
    try {
        const response = await fetch('http://localhost:8000/container-chat', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            console.log('Error:', data.error);
        } else {
            console.log('Data:', data);
            data.forEach(chat => {
                const tempID = chat.chatID;
                promptAvatarCharacterAI = chat.avatar;
                promptNameCharacterAI = chat.username;
                createChatExistance(tempID);
            });
        }
    } catch (error) {
        console.error('Fetch error [Posibility invalid length of chat]:', error);
    }
}

async function createChatExistance(chatID) {
    const existingItem = document.querySelector(`#list-container-chat > ul > li[data-chat-id="${chatID}"]`);

    if (existingItem) {
        console.log('Chat already exists:', chatID);
        return;
    }

    const createChat = document.createElement('li');
    createChat.dataset.chatId = chatID;

    const createFunction = document.createElement('button');
    createFunction.onclick = () => clickChatExistance(chatID);

    const avatarAI = document.createElement('img');
    avatarAI.className = 'avatar-chat-existent';
    avatarAI.src = promptAvatarCharacterAI;

    const nameAI = document.createElement('h4');
    nameAI.className = 'name-chat-existent';
    nameAI.innerText = promptNameCharacterAI;

    createFunction.appendChild(avatarAI);
    createFunction.appendChild(nameAI);

    createChat.appendChild(createFunction);

    const list = document.querySelector('#list-container-chat > ul');
    list.appendChild(createChat);
}

async function clickChatExistance(chatIDs) {
    if (chatIDs === trackChatID) {
        console.log('Already fetching data for this chat ID.');
        return;
    }
    checkAllMessages();
    removeMessagesFromDOM();

    trackChatID = chatIDs;
    console.log('Chat ID:', chatIDs);

    try {
        const response = await fetch(`http://localhost:8000/container-chat/${chatIDs}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            console.log('Error:', data.error);
        } else {
            console.log('Data:', data);
            chatID = data.chatID;
            promptAvatarCharacterAI = data.avatar;
            promptNameCharacterAI = data.username;
            promptPersonalityAI = data.personalityText;
            promptScenarioAI = data.scenarioText;
        }
    } catch (error) {
        console.error('Fetch error [Possibility invalid length of chat]:', error);
    }

    try {
        const response = await fetch(`http://localhost:8000/container-message/${chatIDs}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            console.log('Error:', data.error);
        } else {
            console.log('Data:', data);

            data.forEach(message => {
                const messagePastID = message.messageID;
                const messagePastText = message.messageContent;
                const responseAiOrUser = message.userOrAI;
                tempDate = message.currentTime;

                createMessageElement(messagePastText, messagePastID, responseAiOrUser);
            });

            const aiName = document.getElementById('ai-name');
            const aiAvatar = document.getElementById('ai-avatar')

            aiName.textContent = promptNameCharacterAI;
            aiAvatar.src = promptAvatarCharacterAI;

            const listMessages = document.getElementById('messages-chat-container');
            listMessages.scrollTop = listMessages.scrollHeight;
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}


function createMessageElement(messageText, messageID, userOrAI) {
    const trackTime = new Date();
    const time = trackTime.toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const messageItem = document.createElement('li');
    messageItem.id = messageID;
    messageItem.classList.add('message-item');

    const responseDiv = document.createElement('div');
    responseDiv.classList.add('response');

    const avatarImg = document.createElement('img');
    const pickAvatar = userOrAI ? avatarUser : promptAvatarCharacterAI;
    avatarImg.src = pickAvatar;
    avatarImg.alt = 'Avatar';
    avatarImg.classList.add('avatar');

    const responseContentDiv = document.createElement('div');
    responseContentDiv.classList.add('response-content');

    const responseInfoDiv = document.createElement('div');
    responseInfoDiv.classList.add('response-info');

    const nameHeading = document.createElement('h3');
    const usernameText = userOrAI ? usernameUser : promptNameCharacterAI;
    nameHeading.innerText = usernameText;

    const additionalInfo = document.createElement('h5');
    additionalInfo.innerText = tempDate ? tempDate : time;
    tempDate = null;

    const customCheckboxLabel = document.createElement('label');
    customCheckboxLabel.classList.add('custom-checkbox');

    const checkboxInput = document.createElement('input');
    checkboxInput.type = 'checkbox';

    const checkmarkSpan = document.createElement('span');
    checkmarkSpan.classList.add('checkmark');

    customCheckboxLabel.appendChild(checkboxInput);
    customCheckboxLabel.appendChild(checkmarkSpan);

    const responseGeneratedDiv = document.createElement('div');
    responseGeneratedDiv.classList.add('response-generated');

    const messageParagraph = document.createElement('p');
    messageParagraph.innerHTML = marked(messageText);

    responseInfoDiv.appendChild(nameHeading);
    responseInfoDiv.appendChild(additionalInfo);
    responseInfoDiv.appendChild(customCheckboxLabel);

    responseGeneratedDiv.appendChild(messageParagraph);
    responseContentDiv.appendChild(responseInfoDiv);
    responseContentDiv.appendChild(responseGeneratedDiv);
    responseDiv.appendChild(avatarImg);
    responseDiv.appendChild(responseContentDiv);
    messageItem.appendChild(responseDiv);

    listMessages.appendChild(messageItem);

    messageElements.push(messageItem);

    listMessages.scrollTop = listMessages.scrollHeight;
}

async function lastResponse() {
    isGenerated = false;

    if (isGenerated === false) {
        --currentResponseIndex;
        changeContent();

        if (currentResponseIndex < 0) {
            console.log("Can't be under 0! Incrementing in position!");
            ++currentResponseIndex;
        }
    } else {
        lastSentMessage = ''
        console.log('The last message was deleted!');
    }
}

async function nextResponse() {
    isGenerated = false;

    if (isGenerated === false) {
        ++currentResponseIndex;
        changeContent();

        chatInput.disabled = true;
        chatInput.placeholder = ''

        sendIcon.style.display = 'none';
        stopIcon.style.display = 'block';
    } else {
        lastSentMessage = ''
        console.log('The last message was deleted!');
    }
}

async function changeContent() {
    const messageItem = document.getElementById(trackMessageID);

    if (messageItem) {
        const messageParagraph = messageItem.querySelector('.response-generated p');
        const responseInfoDiv = messageItem.querySelector('.response-info');

        if (messageParagraph) {
            if (trackResponses.length > 0 && currentResponseIndex >= 0 && currentResponseIndex < trackResponses.length) {
                const message = trackResponses[currentResponseIndex];
                messageParagraph.innerHTML = marked(message);

                const additionalInfo = responseInfoDiv.querySelector('h5');
                if (additionalInfo) {
                    trackTempDate = trackTimes[currentResponseIndex];
                    additionalInfo.innerText = trackTempDate;
                }

                await updateContent(message, trackMessageID);
                console.log(message);
            } else if (userHasPrompted === false && currentResponseIndex >= trackResponses.length) {
                isSending = true;
                retrieveAnswer(lastSentMessage);
            }
            else {
                console.log('Index out of bounds');
            }
        } else {
            console.error('No message paragraph found for ID:', trackMessageID);
        }
    } else {
        console.error('No message item found for ID:', trackMessageID);
    }
}

async function updateContent(responseSelected, messageId) {
    const responseAssigned = await fetch('http://localhost:8000/assign-message-id', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            authID: userID,
            chatID: chatID,
            messageContent: responseSelected,
            currentTime: trackTempDate,
            userOrAI: false,
            messageID: messageId
        })
    });

    const dataAssigned = await responseAssigned.json();

    if (dataAssigned && dataAssigned.messageID) {
        console.log('Message successfully created:', dataAssigned);
        isSending = false;

        chatInput.disabled = false;
        chatInput.placeholder = 'Type your message here...';
        sendIcon.style.display = 'block';
        stopIcon.style.display = 'none';

    } else {
        console.error('Failed to assign message ID:', dataAssigned);
        console.log("Data: ", dataAssigned, "\n MessageID's Data: ", dataAssigned.messageId)
    }
}

document.addEventListener('keydown', async function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();

        sendResponse()
    }
});

document.getElementById('send-button').addEventListener('click', async () => {
    if (isSending) {
        await stopResponse();
    } else {
        await sendResponse();
    }
})

async function stopResponse() {
    isSending = false;

    chatInput.disabled = false;
    chatInput.placeholder = 'Type your message here...';

    sendIcon.style.display = 'block';
    stopIcon.style.display = 'none';
}

async function sendResponse() {
    isSending = true;
    userHasPrompted = true;
    trackTempDate = null;
    trackResponses = []

    chatInput.disabled = true;
    chatInput.placeholder = ''

    sendIcon.style.display = 'none';
    stopIcon.style.display = 'block';

    const trackTime = new Date();
    const time = trackTime.toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const messageUser = chatInput.value;
    storeMessage = messageUser;
    lastSentMessage = messageUser;

    if (trackMessageID) {
        const existingMessageItem = document.getElementById(trackMessageID);
        if (existingMessageItem) {
            const existingDebugDiv = existingMessageItem.querySelector('#debug');
            if (existingDebugDiv) {
                existingDebugDiv.remove();
            }
        }
    }

    const response = await fetch('http://localhost:8000/assign-message-id', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            authID: userID,
            chatID: chatID,
            messageContent: storeMessage,
            currentTime: time,
            userOrAI: true,
            messageID: null
        })
    })

    const data = await response.json();
    console.log('Message successfully created:', data);

    const messageUserID = data.messageID;
    createMessageElement(storeMessage, messageUserID, true);
    retrieveAnswer(storeMessage);

    isGenerated = true;
    trackMessageID = null;

    if (storeMessage) {
        console.log("Message sent: ", storeMessage);
        chatInput.value = '';
    }
}

async function retrieveAnswer(messageReceiver) {
    userHasPrompted = false;
    isSending = true;
    const trackTime = new Date();

    const time = trackTime.toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    if (!messageReceiver) {
        console.error('Message is empty, cannot send request.');
        return;
    }

    const combinedInput = `[Personality: ${promptPersonalityAI}\nScenario: ${promptScenarioAI}]\nUser Input: ${messageReceiver}`;

    try {
        const response = await fetch('http://localhost:8000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ input: combinedInput })
        });

        if (!response.ok) {
            console.error('Error from server:', response.statusText);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let storeMessage = '';

        const tempMessageID = `temp-${Date.now()}`;

        let messageItem = document.getElementById(trackMessageID);

        if (!messageItem) {
            createMessageElement(storeMessage, tempMessageID, false);
            messageItem = document.getElementById(tempMessageID);
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (isSending === false) break;

            // Decode the chunk of data
            const chunk = decoder.decode(value, { stream: true });
            storeMessage += chunk;

            if (!trackMessageID) {
                updateMessageElementAI(storeMessage, tempMessageID, false);
            } else {
                updateMessageElementAI(storeMessage, trackMessageID, false);
            }

        }

        console.log("Final Response:", storeMessage);
        trackResponses.push(storeMessage);
        trackTimes.push(time);

        if (isSending === false) {
            try {
                const response = await fetch('http://localhost:8000/stop', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    console.log('Aborted successfully');
                } else {
                    console.error('Error aborting:', response.statusText);
                }
            } catch (error) {
                console.error('Error during abort:', error.message);
            }
        }

        const responseAssigned = await fetch('http://localhost:8000/assign-message-id', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                authID: userID,
                chatID: chatID,
                messageContent: storeMessage,
                currentTime: time,
                userOrAI: false,
                messageID: null || trackMessageID
            })
        });

        const dataAssigned = await responseAssigned.json();
        if (dataAssigned && dataAssigned.messageID) {

            console.log('Message successfully created:', dataAssigned);
            const messageItem = document.getElementById(tempMessageID);
            if (messageItem) {
                messageItem.id = dataAssigned.messageID;
                trackMessageID = dataAssigned.messageID;

                if (trackMessageID) {
                    const debugDiv = document.createElement('div');
                    debugDiv.id = 'debug';

                    const lastResponseButton = document.createElement('button');
                    lastResponseButton.id = 'last-response';
                    lastResponseButton.innerHTML = `
                        <svg stroke="white" fill="white" stroke-width="0" viewBox="0 0 320 512" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
                            <path d="M34.52 239.03L228.87 44.69c9.37-9.37 24.57-9.37 33.94 0l22.67 22.67c9.36 9.36 9.37 24.52.04 33.9L131.49 256l154.02 154.75c9.34 9.38 9.32 24.54-.04 33.9l-22.67 22.67c-9.37 9.37-24.57 9.37-33.94 0L34.52 272.97c-9.37-9.37-9.37-24.57 0-33.94z"></path>
                        </svg>
                    `;
                    lastResponseButton.onclick = async () => await lastResponse();

                    const nextResponseButton = document.createElement('button');
                    nextResponseButton.id = 'next-response';
                    nextResponseButton.innerHTML = `
                        <svg stroke="white" fill="white" stroke-width="0" viewBox="0 0 320 512" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
                            <path d="M285.476 272.971L91.132 467.314c-9.373 9.373-24.569 9.373-33.941 0l-22.667-22.667c-9.357-9.357-9.375-24.522-.04-33.901L188.505 256 34.484 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569-9.373 33.941 0L285.475 239.03c9.373 9.372 9.373 24.568.001 33.941z"></path>
                        </svg>
                    `;
                    nextResponseButton.onclick = async () => await nextResponse();

                    debugDiv.appendChild(lastResponseButton);
                    debugDiv.appendChild(nextResponseButton);
                    messageItem.appendChild(debugDiv);
                }
            }

            isSending = false;

            chatInput.disabled = false;
            chatInput.placeholder = 'Type your message here...';

            sendIcon.style.display = 'block';
            stopIcon.style.display = 'none';
        } else {
            console.error('Failed to assign message ID:', dataAssigned);
        }

    } catch (error) {
        console.error("Error during fetch:", error.message);
    }
}

function updateMessageElementAI(messageText, messageId) {
    const messageItem = document.getElementById(messageId);

    if (messageItem) {
        if (isGenerated === false) {
            const messageParagraph = messageItem.querySelector('.response-generated p');
            if (messageParagraph) {
                messageParagraph.innerHTML = marked(messageText);
            }
        } else {
            const messageParagraph = messageItem.querySelector('p');
            if (messageParagraph) {
                messageParagraph.innerHTML = marked(messageText);
            } else {
                const responseGeneratedDiv = messageItem.querySelector('.response-generated');
                if (responseGeneratedDiv) {
                    const messageParagraph = document.createElement('p');
                    messageParagraph.innerHTML = marked(messageText);
                    responseGeneratedDiv.appendChild(messageParagraph);
                } else {
                    console.error('No response-generated div found for message ID:', messageId);
                }
            }
        }
    } else {
        console.error('No message item found for ID:', messageId);
    }
}

sessionAuth();
