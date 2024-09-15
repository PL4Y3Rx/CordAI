CREATE DATABASE ai_discord;
USE ai_discord;

-- ALTER TABLE messageSys DROP FOREIGN KEY messagesys_ibfk_1;
-- ALTER TABLE messageSys DROP FOREIGN KEY messagesys_ibfk_2;

-- DROP TABLE IF EXISTS authSys;
-- DROP TABLE IF EXISTS aiSys;
-- DROP TABLE IF EXISTS messageSys;

CREATE TABLE authSys(
	authID CHAR(255) UNIQUE PRIMARY KEY,
    username CHAR(255),
    avatar CHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE aiSys (
    chatID CHAR(255) UNIQUE PRIMARY KEY,
    username VARCHAR(255),
    avatar VARCHAR(255),
    introText TEXT,
    personalityText TEXT,
    scenarioText TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messageSys(
    messageID CHAR(255) PRIMARY KEY,
	authID CHAR(255),
	chatID CHAR(255),
    userOrAI BOOLEAN,
    messageContent TEXT,
    currentTime TIME,             
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (chatID) REFERENCES aiSys(chatID),
    FOREIGN KEY (authID) REFERENCES authSys(authID)
);

SELECT * FROM authSys;
