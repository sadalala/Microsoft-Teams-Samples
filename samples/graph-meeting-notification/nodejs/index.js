// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// Import required pckages
const path = require('path');
// Read botFilePath and botFileSecret from .env file.
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });
const restify = require('restify');
const express = require('express');

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { CloudAdapter, 
    ConversationState, 
    MemoryStorage, UserState, 
    ConfigurationServiceClientCredentialFactory, 
    createBotFrameworkAuthenticationFromConfiguration } = require('botbuilder');
const { MeetingNotficationBot } = require('./bots/meeting-notification-bot');

const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: process.env.MicrosoftAppId,
    MicrosoftAppPassword: process.env.MicrosoftAppPassword,
    MicrosoftAppType: undefined,
    MicrosoftAppTenantId: process.env.TenantId
  });
  
  const botFrameworkAuthentication = createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);


// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about adapters.
const adapter = new CloudAdapter(botFrameworkAuthentication);

adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights. See https://aka.ms/bottelemetry for telemetry 
    //       configuration instructions.
    console.error(`\n [onTurnError] unhandled error: ${error}`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${error}`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
    // Clear out state
    await conversationState.delete(context);
};



// Define the state store for your bot.
// See https://aka.ms/about-bot-state to learn more about using MemoryStorage.
// A bot requires a state storage system to persist the dialog and user state between messages.
const memoryStorage = new MemoryStorage();

// Create conversation and user state with in-memory storage provider.
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// Create the main dialog.
const dialog = new MainDialog();
// Create the main dialog.
const conversationReferences = {};
// Create the bot that will handle incoming messages.
const bot = new TeamsBot(conversationState, userState, dialog, conversationReferences);

// Create HTTP server.
const server = express();
server.use(restify.plugins.queryParser());
server.use(express.json());

server.use(express.urlencoded({
    extended: true
}));

server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`\n${server.name} listening to ${process.env.port}`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        await bot.run(context);
    });
});

const notification = async (req, res, next) => {
    let status;
    if (req.query && req.query.validationToken) {
        console.log("In Controller");
        status = 200;
        res.send(req.query.validationToken);
    } else {
        console.log("In Response");
        clientStatesValid = false;
        console.log(req.body.value[0].resourceData);
        let userstatus = req.body.value[0].resourceData;
        console.log(userstatus.activity);
        console.log(userstatus.availability);
        status = 202;
        //for storing step context
        const meetingNotficationBot = new MeetingNotficationBot(conversationReferences);
        const _notication = "Change your status to get notification";
        for (const conversationReference of Object.values(conversationReferences)) {
            await adapter.continueConversation(conversationReference, async turnContext => {
                let carddata = await meetingNotficationBot.DisplayData(turnContext, "User Status", userstatus.availability, userstatus.activity);
                await turnContext.sendActivity(_notication);
            });
        }
        res.sendStatus(status);
    }
}


// Listen for incoming requests.
server.post('/api/notifications', notification);


