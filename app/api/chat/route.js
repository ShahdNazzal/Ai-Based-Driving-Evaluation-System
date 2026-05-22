import Groq from "groq-sdk";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req) {
  const { messages } = await req.json();

  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are a professional driving exam assistant for Jordan.
Always reply in the same language the user writes in.
If they write in Arabic, reply in Arabic only.
If they write in English, reply in English only.
Keep answers short and clear.`,
      },
      ...messages,
    ],
  });

  return Response.json({
    reply: response.choices[0].message.content,
  });
}