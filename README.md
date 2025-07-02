
# WhatsApp Multi-Agent Node.js Bot

This project is a modular Node.js application that integrates with the WhatsApp Business API to provide multi-agent conversational support. It uses Google Gemini AI for intent recognition and agent routing, and supports restaurant booking, weather queries, general chat, and customer support.

## Features

- **Multi-Agent Routing:** Automatically routes user messages to specialized agents (Restaurant Booking, Weather, General Chat, Customer Support, etc.)
- **AI-Powered Intent Recognition:** Uses Google Gemini AI to analyze messages and determine the best agent.
- **WhatsApp Business API Integration:** Sends and receives WhatsApp messages using Meta's API.
- **Extensible:** Easily add new agents for more use cases.

## Project Structure

```
wapp-multi-agent/
├── src/
│   ├── index.js                  # Entry point, Express server setup
│   ├── agents/
│   │   ├── customerSupportAgent.js
│   │   ├── generalChatAgent.js
│   │   ├── restaurantBookingAgent.js
│   │   └── weatherAgent.js
│   ├── routes/
│   │   └── webhook.js            # WhatsApp webhook route handlers
│   └── utils/
│       ├── geminiRouter.js       # Gemini AI intent recognition
│       ├── messageParser.js      # WhatsApp message parsing
│       ├── whatsappApi.js        # WhatsApp API helpers
│       └── whatsappHandlers.js   # Webhook event helpers
├── .env                         # Environment variables (NOT committed)
├── .gitignore                   # Ignores .env and other sensitive files
├── package.json                 # Project dependencies and scripts
└── README.md                    # Project documentation
```

## Getting Started

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd wapp-multi-agent
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to `.env` (or create `.env` manually).
   - Fill in your WhatsApp API credentials and Gemini API key.

   Example `.env`:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   WEBHOOK_VERIFY_TOKEN=your_webhook_token
   WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
   WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
   ```

4. **Start the server:**
   ```
   npm start
   ```

5. **Set up your WhatsApp webhook:**
   - Expose your local server (e.g., with [ngrok](https://ngrok.com/))
   - Register the webhook URL with Meta's WhatsApp Business API dashboard

## Adding New Agents

To add a new agent, create a new file in `src/agents/`, export a handler, and update the routing logic in `src/routes/webhook.js`.

## Security

- **Never commit your `.env` file or secrets to git!**
- The `.gitignore` file is set to exclude `.env`.

## License

This project is licensed under the MIT License.