# CordAI
CordAI is a demo chatbot AI designed for Discord integration as a "plugin," similar to Vencord. While still a work in progress, it showcases several implemented features for customizable AI conversations. Below, you'll find detailed instructions on how to set it up, use it, and modify it.

# Features Implemented
* Authentication System: Tracks conversations and user sessions.
* Conversation Management System: Organizes and manages ongoing chats.
* User Customization: Allows users to change their name and avatar for a personalized experience.
* Customizable AI Model: Supports model modification, currently working with the Ollama model.

# How to install
Follow these steps to install and run the project:

1. Clone the Repository:
```git clone https://github.com/PL4Y3Rx/CordAI.git```

2. Install Required Software:

MySQL: You'll need MySQL to create the database for message tracking, character management, etc.
Node.js: Required for running the server.
Visual Studio Code: Install the Live Server extension to host the frontend locally.

3. Install Dependencies: Navigate to the project's root directory and install the necessary libraries for the server:
```npm install express fs cors ollama mysql2 uuid body-parser multer path```
    
4. Create the MySQL Database:
Ensure that MySQL is installed and running.
Create a new database, which will store the conversation data, user info, etc.
Set up the database credentials in your centralServer.js file if needed.

5. Run the Server: Start the server by executing the following command:
```node centralServer.js```

6. Host the Website: Open Visual Studio Code, and using the Live Server extension, host the index.html file by clicking the "Go Live" button in the bottom right corner.

Now the project should be up and running!


# How to use
1. Authentication:
On first use, input your username for authentication.
An authID will be generated and stored in session storage—make sure to keep this ID for future use.

2. Chat with the AI:
Press the "New Chat" button, where you will be prompted to use a template.yaml. A template file has been provided for easy setup.
Conversations will be processed using the Ollama model.

3. Using Custom Models: To use customized models, follow these steps:
Download Llama 3.1 or the desired model.
Run the following commands:

```ollama run llama3.1```
```ollama create [YOUR_MODEL_NAME] --file [MODELFILE]```

Customize the model as needed. For additional instructions, refer to ArkaPrompt.txt, which contains system instructions on how the AI should behave.

## Important Notes
Ethical Usage: You are responsible for using this tool ethically and safely. Misuse of this system may violate various policies, so please use it responsibly.

Credit: If you modify or build upon this project, please credit me for the work. I’d appreciate it!
