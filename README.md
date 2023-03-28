
# openai-discordbot #
simple node.js script to create a discord bot for openai. Using gpt-3.5-turbo. Will be eventually updating script to use gpt 4 once its available

This script was written entirely using ChatGPT. I understand the basics of how this work, but if you're more advanced in node.js then you will be able to do a lot more than I can. If you have issues, paste the contents of the script into chatgpt, and ask it for help. It will be able to provide you a lot of info.

## To install ##
1. git clone the repository

2. npm install

3. Create an openai account at https://openai.com/api/

4. Open your account from the top right icon, then select "view api keys"

5. Select "Create New Api Key" and copy it

6. Paste the key into the config.json file where it says "openai token"

7. Create a discord api token by going to https://discord.com/developers/applications/

8. Select "New Application" and give it a name and save

9. Select Bot from the left hand panel

10. Press the "Add Bot" button, and press the "Yes, do it" button

11. Copy the token, and paste into the config.json file where it says "discord token" then copy the client id and paste where it says "your app id". Note client ID and app ID are the same thing. Discord just gives it 2 different names for some weird inconsistent reason

12. Select the intents you need, generally it should only be SERVER MEMBERS INTENT, and MESSAGE CONTENT INTENT,

13. Save Changes

14. From the left hand side, under OAuth2, select URL Generator

15. Select the Scopes. Will only need BOT

16. Select the Text Permissions that are required. These should be only

*Send Messages*

*Send Messages in Threads*

*Embed Links*

*Attach Files*

*Read Message History*

18. Copy the Generated URL, and paste into the URL bar of the browser and authorize the bot.

19. run the commandreg.js to register the commands to discord

```
node commandreg.js
```

20. Start the bot. In Linux under Ubuntu 20.04 that this was tested on that should be

```
node main.js
```

To communicate with the bot, a user will type

```
/chat
or
/dalle
```

Followed by their question or image they want to generate. This is an example of what it will look like.

```
/chat tell me the weather of the bermuda triangle
/dalle staind glass window. Dog in a fighter jet. Sun in the bottom left corner. Lens flare shining.
```

## Creating a service account ##
1. Create a new user:
```
sudo useradd -r discordbot
```

2. Set where you want the user's home directory to be, this could be where the script is stored. I suggest /opt/nodejsdiscord as that is what I used. Note, the directory must exist already: 

```
sudo usermod -d /var/empty discordbot
```

3. Set the user's shell to /sbin/nologin: 

```
sudo usermod -s /sbin/nologin discordbot
```

## Securing the Config.json File ##
1. Place the config.json in the same directory as the node.js script

2. Change the readwrite permission to read only from the owner
```
chmod 600 /path/to/config.json
```

3. Change the owner to whomever will be running the script. 
```
chown discordbot:discordbot /path/to/config.json
```

## Creating a Daemon Service ##
If you'd like to run the program in the background I suggest creating a systemd service. Alternatively, the screen command can also be used but will not resume upon reset of the server.

1. Create the systemd service file: 

```
sudo nano /etc/systemd/system/jsdiscordbot.service
```

2. Add the following content to the service file:


[Unit]
Description=Discord Bot Service
After=network.target

[Service]
Type=simple
User=discordbot
WorkingDirectory=/opt/nodejsdiscord
ExecStart=/usr/bin/node /opt/nodejsdiscord/main.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target

```
Note: Replace /path/to/main.js with the actual path to the main.js script on your system.

3. Make sure the main.js script has the correct permissions:

```
    sudo chown discordbot:discordbot /path/to/main.js
    
    sudo chmod 700 /path/to/main.js
```

4. Reload the systemd configuration:

```
sudo systemctl daemon-reload
```

5. Start the service:
```
sudo systemctl start jsdiscordbot.service
```

6. Enable the service to start automatically at boot:
```
sudo systemctl enable jsdiscordbot.service
```

With these steps, the main.js script should now run as the discordbot user, with the least privilege necessary to execute the script, and will start automatically at boot.
