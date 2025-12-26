export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown-user";
    const id = env.CHAT_SESSION.idFromName(ip);
    const stub = env.CHAT_SESSION.get(id);
    const response = await stub.fetch(request);

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  }
};

export class ChatSession {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const input = await request.json();
    const userMessage = input.message;

    let history = await this.state.storage.get("history") || [
      { role: "system", content: "You are a helpful Security Operations Center (SOC) assistant." }
    ];

    if (history.length > 10) {
      history = history.slice(-10);
    }
    
    history.push({ role: "user", content: userMessage });

    const aiResponse = await this.env.AI.run("@cf/meta/llama-3-8b-instruct", {
      messages: history
    });

    history.push({ role: "assistant", content: aiResponse.response });

    await this.state.storage.put("history", history);

    return new Response(JSON.stringify({ reply: aiResponse.response }));
  }
}
