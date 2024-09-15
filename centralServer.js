const express = require('express');
const fs = require('fs');
const cors = require('cors');
const { default: ollama } = require('ollama');
const mysql = require('mysql2');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 8000;
let tempAuthID = null;

const uploadDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 128 * 1024 * 1024 // 128 MB limit
    }
});

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'hacksquad',
    database: 'ai_discord'
});

app.use(express.json());
app.use(bodyParser.json());
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    credentials: true
}));
app.post('/auth', async (req, res) => {
    const { authID, username } = req.body;

    if (!username) {
        return res.status(400).send({ error: 'Username required' });
    }

    try {
        const [existingUser] = await pool.promise().query('SELECT * FROM authSys WHERE username = ?', [username]);

        if (existingUser.length > 0) {
            if (authID) {
                const [existingAuthID] = await pool.promise().query('SELECT * FROM authSys WHERE authID = ?', [authID]);

                if (existingAuthID.length > 0) {
                    return res.status(200).send({ message: 'User authenticated successfully', username, authID });
                } else {
                    return res.status(400).send({ error: 'Invalid AuthID' });
                }
            } else {
                return res.status(200).send({ message: 'Username exists, please provide your AuthID', username });
            }
        } else {
            let newAuthID = `u-${uuidv4()}`;
            await pool.promise().query('INSERT INTO authSys (username, authID) VALUES (?, ?)', [username, newAuthID]);

            return res.status(201).send({ message: 'User created successfully', username, authID: newAuthID });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send({ error: 'Server error' });
    }
});

app.post('/request-authID', async (req, res) => {
    const { authID } = req.body;

    if (!authID) {
        return res.status(400).send({ error: 'Unobtainable AuthID' });
    } else {
        try {
            const [rows] = await pool.promise().query('SELECT authID FROM authSys WHERE authID = ?', [authID]);

            if (rows.length > 0) {
                tempAuthID = rows[0].authID;
                res.send({ authID: rows[0].authID });
            } else {
                res.status(404).send({ error: 'AuthID not found' });
            }
        } catch (error) {
            console.error('Error fetching AuthID:', error);
            res.status(500).send({ error: 'Failed to fetch AuthID' });
        }
    }
});

app.post('/update-avatar', upload.single('avatar'), async (req, res) => {
    const file = req.file;

    try {
        if (file) {
            const fileName = Date.now() + path.extname(file.originalname);
            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, file.buffer);

            const [rows] = await pool.promise().query('SELECT avatar FROM authSys WHERE authID = ?', [tempAuthID]);

            if (rows.length > 0) {
                await pool.promise().query('UPDATE authSys SET avatar = ? WHERE authID = ?', [filePath, tempAuthID]);
            } else {
                await pool.promise().query('INSERT INTO authSys (authID, avatar) VALUES (?, ?)', [tempAuthID, filePath]);
            }

            res.send({ success: true, message: 'Avatar updated successfully.', filePath: `/uploads/${fileName}` });

        } else {
            res.status(400).send({ error: 'No file uploaded' });
        }
    } catch (error) {
        console.error('Error updating avatar:', error);
        res.status(500).send({ error: 'Failed to update avatar' });
    }
});

app.post('/return-avatar', async (req, res) => {
    const { authID } = req.body;

    if (!authID) {
        return res.status(400).send({ error: 'AuthID is required' });
    }

    try {
        const [rows] = await pool.promise().query('SELECT authID, avatar FROM authSys WHERE authID = ?', [authID]);

        if (rows.length > 0) {
            const user = rows[0];
            const avatarPath = user.avatar;
            const fileExists = fs.existsSync(path.join(uploadDir, path.basename(avatarPath)));

            res.send({
                success: true,
                authID: user.authID,
                avatar: fileExists ? `/uploads/${path.basename(avatarPath)}` : null
            });
        } else {
            res.status(404).send({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching avatar:', error);
        res.status(500).send({ error: 'Failed to fetch avatar' });
    }
});

app.post('/update-user', async (req, res) => {
    const { authID, username } = req.body;

    if (!authID) {
        return res.status(400).send({ error: 'Invalid AuthID, can\'t update.' });
    }

    try {
        if (username) {
            await pool.promise().query('UPDATE authSys SET username = ? WHERE authID = ?', [username, authID]);
        }

        res.send({ success: true, message: 'User profile updated successfully.' });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).send({ error: 'Failed to update user profile.' });
    }
});

app.post('/open-conversation', async (req, res) => {
    const { chatID, aiName, aiAvatar, aiIntro, aiPersona, aiScenario } = req.body;

    try {
        let newChatID = chatID;

        if (!chatID) {
            newChatID = `c-${uuidv4()}`;

            await pool.promise().query(
                'INSERT INTO aiSys (chatID, username, avatar, introText, personalityText, scenarioText) VALUES (?, ?, ?, ?, ?, ?)',
                [newChatID, aiName, aiAvatar, aiIntro, aiPersona, aiScenario]
            );

            return res.status(201).send({
                message: 'New conversation created successfully',
                chatID: newChatID,
                aiName,
                aiAvatar,
                aiIntro,
                aiPersona,
                aiScenario
            });

        } else {
            const [existingChat] = await pool.promise().query('SELECT * FROM aiSys WHERE chatID = ?', [chatID]);

            if (existingChat.length > 0) {
                return res.status(200).send({
                    message: 'Chat session already exists',
                    aiName: existingChat[0].username,
                    aiAvatar: existingChat[0].avatar,
                    aiIntro: existingChat[0].introText,
                    aiPersona: existingChat[0].personalityText,
                    aiScenario: existingChat[0].scenarioText
                });

            } else {
                return res.status(404).send({ error: 'Invalid chatID. No matching conversation found.' });
            }
        }

    } catch (error) {
        console.error('Error during open conversation:', error);
        return res.status(500).send({ error: 'Server error during conversation opening' });
    }
});

app.get('/container-chat', async (req, res) => {
    try {
        const [chats] = await pool.promise().query('SELECT * FROM aiSys');
        if (chats.length === 0) {
            return res.status(404).send({ message: 'No chats found' });
        }
        res.status(200).send(chats);
    } catch (error) {
        console.error('Error fetching all chats:', error);
        res.status(500).send({ error: 'Server error fetching chats' });
    }
});

app.get('/container-chat/:chatID', async (req, res) => {
    const { chatID } = req.params;
    console.log('Received chatID:', chatID);

    try {
        const [results] = await pool.promise().query('SELECT * FROM aiSys WHERE chatID = ?', [chatID]);

        if (results.length === 0) {
            return res.status(404).send({ message: 'Chat not found' });
        }

        res.status(200).send(results[0]);
    } catch (error) {
        console.error('Error fetching chat:', error);
        res.status(500).send({ error: 'Server error fetching chat' });
    }
});


app.get('/container-message/:chatID', async (req, res) => {
    const { chatID } = req.params;

    try {
        const [messages] = await pool.promise().query('SELECT * FROM messageSys WHERE chatID = ? ORDER BY currentTime ASC, createdAt ASC', [chatID]);
        if (messages.length === 0) {
            return res.status(404).send({ message: 'No chats found' });
        }
        res.status(200).send(messages);
    } catch (error) {
        console.error('Error fetching all chats:', error);
        res.status(500).send({ error: 'Server error fetching chats' });
    }
});

app.post('/assign-message-id', async (req, res) => {
    const { authID, chatID, messageContent, userOrAI, messageID, currentTime } = req.body;

    if (!chatID) {
        return res.status(400).send({ error: 'No conversation opened' });
    } else if (chatID && !messageContent) {
        return res.status(400).send({ error: 'Conversation exists, but messageContent required' });
    }

    try {
        const [authSysCheck] = await pool.promise().query('SELECT * FROM authSys WHERE authID = ?', [authID]);
        if (authSysCheck.length === 0) {
            return res.status(400).send({ error: 'Invalid authID. No matching user found.' });
        }

        const [aiSysCheck] = await pool.promise().query('SELECT * FROM aiSys WHERE chatID = ?', [chatID]);
        if (aiSysCheck.length === 0) {
            return res.status(400).send({ error: 'Invalid chatID. No matching conversation found.' });
        }

        let newMessageID = messageID;

        if (!messageID) {
            newMessageID = `m-${uuidv4()}`;

            await pool.promise().query(
                'INSERT INTO messageSys (messageID, authID, chatID, userOrAI, messageContent, currentTime) VALUES (?, ?, ?, ?, ?, ?)',
                [newMessageID, authID, chatID, userOrAI, messageContent, currentTime]
            );

            return res.status(201).send({
                message: 'Message created successfully',
                messageID: newMessageID,
                chatID,
                authID,
                currentTime,
            });
        } else {
            const [existingMessage] = await pool.promise().query(
                'SELECT messageID FROM messageSys WHERE messageID = ?',
                [messageID]
            );

            if (existingMessage.length > 0) {
                await pool.promise().query(
                    'UPDATE messageSys SET messageContent = ?, currentTime = ? WHERE messageID = ?',
                    [messageContent, currentTime, messageID]
                );

                return res.status(200).send({
                    message: 'Message updated successfully',
                    messageID,
                    chatID,
                    authID,
                    currentTime,
                });
            } else {
                return res.status(404).send({
                    message: 'Message not found for the provided messageID',
                    messageID,
                    chatID,
                    authID,
                    currentTime,
                });
            }
        }
    } catch (error) {
        console.error('Error during message creation:', error);
        return res.status(500).send({ error: 'Server error during message creation' });
    }
});

app.post('/delete-messages', async (req, res) => {
    const messageIds = req.body.messageIds;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ message: 'Invalid input' });
    }
    const placeholders = messageIds.map(() => '?').join(',');

    try {
        const [results] = await pool.promise().query(
            `DELETE FROM messageSys WHERE messageID IN (${placeholders})`,
            messageIds
        );

        res.status(200).json({ message: 'Messages deleted successfully' });
    } catch (error) {
        console.error('Error deleting messages:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/delete-character', async (req, res) => {
    const { chatID } = req.body;

    if (!chatID) {
        return res.status(400).json({ message: 'Chat ID is required' });
    }

    try {
        const [wipeMessage] = await pool.promise().query('DELETE FROM messageSys WHERE chatID = ?', [chatID]);
        const [deleteCharacter] = await pool.promise().query('DELETE FROM aiSys WHERE chatID = ?', [chatID]);

        if (wipeMessage.affectedRows > 0 || deleteCharacter.affectedRows > 0) {
            return res.status(200).json({ message: 'Character and associated messages deleted successfully' });
        } else {
            return res.status(404).json({ message: 'Character not found' });
        }
    } catch (error) {
        console.error('Error deleting character:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});


app.post('/chat', async (req, res) => {
    const input = req.body.input;
    let SystemPrompt = '';

    try {
        const dataCharacter = fs.readFileSync('C:/Users/cerce/OneDrive/Documente/Project/AI_Window/CharacterPrompt.txt', 'utf-8');
        SystemPrompt = `${dataCharacter}`;
    } catch (error) {
        console.error('Error reading system prompt file:', error.message);
        return res.status(500).send({ error: 'Failed to read system prompt' });
    }

    console.log(input);

    if (!input) {
        return res.status(400).send({ error: 'No input provided' });
    }

    try {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        const response = await ollama.chat({
            model: 'arka-model',
            messages: [
                { role: 'system', content: SystemPrompt },
                { role: 'user', content: input }
            ],
            stream: true,
        });

        for await (const part of response) {
            if (part.message && part.message.content) {
                res.write(part.message.content);
            }
        }

        res.end();
    } catch (error) {
        console.error('Model Error:', error.message);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

app.post('/stop', async (req, res) => {
    ollama.abort()
    console.log('Aborted the AI chat request.');
    return res.send({ message: 'Chat request aborted successfully.' });
})

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
