import { Configuration, OpenAIApi } from 'openai-edge'
import { Message, OpenAIStream, StreamingTextResponse } from 'ai'
import { Client } from "pg";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(config)

export async function POST(req: Request) {
  try {

    const { messages } = await req.json()

    // Get the last message
    const lastMessage = messages[messages.length - 1]

    const context = await getContext(lastMessage.content);
    console.log(context);

    const prompt = [
      {
        role: 'system',
        content: `AI assistant is a brand new, powerful, human-like artificial intelligence.
        The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
        AI is a well-behaved and well-mannered individual.
        AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
        AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
        CONTEXT BLOCK 
        ${context};
        END OF CONTEXT BLOCK
        // AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
        // If the context does not provide the answer to question, the AI assistant will say, "I'm sorry, but I don't know the answer to that question".
        // AI assistant will not apologize for previous responses, but instead will indicated new information was gained.
        // AI assistant will not invent anything that is not drawn directly from the context.
      `,
      },
    ]

    // Ask OpenAI for a streaming chat completion given the prompt
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      stream: true,
      messages: [...prompt, ...messages.filter((message: Message) => message.role === 'user')]
    })
    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response)
    // Respond with the stream
    return new StreamingTextResponse(stream)
  } catch (e) {
    throw (e)
  }
}

const getContext = async (userQuery : string) => {
  // step 1 embed the users query string
  console.log(userQuery);
  const embeddings = new OpenAIEmbeddings();
  const embeddedUserQuery = await embeddings.embedQuery(userQuery);
  const client = new Client({
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });

  await client.connect();

  const query = "SELECT * FROM match_documents(\$1, \$2, \$3)"; 
  const values = [JSON.stringify(embeddedUserQuery), 0.7, 10];
  const relevantContext = await client.query(query, values);
  console.log("ROWS", relevantContext.rows);
  const contextString = relevantContext.rows.map((obj : any) => obj.summary).join(", ");
 console.log(contextString);
  return contextString;
};