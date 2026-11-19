import { withSupabase } from 'npm:@supabase/server@1';

type ChatMessage = {
  role: 'user' | 'model';
  text: string;
};

type InteractionResponse = {
  steps?: {
    type?: string;
    content?: { type?: string; text?: string }[];
  }[];
};

const SYSTEM_INSTRUCTION = [
  'Eres NutriBot Familiar, un asistente amable para niñas y niños.',
  'Responde siempre en español de México, con palabras sencillas y mensajes breves.',
  'Habla de hábitos saludables, comida, movimiento y emociones de forma positiva y sin juzgar.',
  'No diagnostiques, no recetes, no des dietas para bajar de peso ni consejos médicos.',
  'No pidas ni repitas datos personales. Si alguien comparte uno, no lo uses y recuérdale que no lo comparta.',
  'Si la persona expresa miedo, peligro, daño o una preocupación de salud, anímala a contárselo ahora a una persona adulta de confianza.',
  'No sustituyes a una persona adulta ni a profesionales de salud.',
].join(' ');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isChatMessage(value: unknown): value is ChatMessage {
  return isRecord(value)
    && (value.role === 'user' || value.role === 'model')
    && typeof value.text === 'string'
    && value.text.trim().length > 0
    && value.text.length <= 1000;
}

function isChatMessages(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) return false;
  const messages = value.filter(isChatMessage);
  return messages.length === value.length
    && messages[messages.length - 1]?.role === 'user'
    && messages.reduce((total, message) => total + message.text.length, 0) <= 5000;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status });
}

const handleRequest = withSupabase({ auth: 'user' }, async request => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Esta solicitud no está permitida.' }, 405);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'No pude leer el mensaje. Inténtalo de nuevo.' }, 400);
  }

  if (!isRecord(payload) || !isChatMessages(payload.messages)) {
    return jsonResponse({ error: 'La conversación es demasiado larga o no tiene un formato válido.' }, 400);
  }

  const messages = payload.messages;
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return jsonResponse({ error: 'NutriBot todavía no está configurado. Pide ayuda a la persona tutora.' }, 500);
  }

  let response: Response;
  try {
    response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'gemini-flash-lite-latest',
        system_instruction: SYSTEM_INSTRUCTION,
        input: messages.map(message => ({
          type: message.role === 'user' ? 'user_input' : 'model_output',
          content: [{ type: 'text', text: message.text }],
        })),
        generation_config: { max_output_tokens: 300 },
        store: false,
      }),
    });
  } catch {
    return jsonResponse({ error: 'No pude conectar con NutriBot. Revisa tu conexión e inténtalo de nuevo.' }, 502);
  }

  if (!response.ok) {
    console.error('Gemini API request failed with status', response.status);
    return jsonResponse({
      error: response.status === 429
        ? 'NutriBot está recibiendo muchos mensajes. Espera un momento e inténtalo de nuevo.'
        : 'No pude generar una respuesta ahora. Inténtalo de nuevo más tarde.',
    }, response.status === 429 ? 429 : 502);
  }

  let result: InteractionResponse;
  try {
    result = await response.json() as InteractionResponse;
  } catch {
    return jsonResponse({ error: 'NutriBot envió una respuesta que no pude leer. Inténtalo de nuevo.' }, 502);
  }

  const reply = result.steps
    ?.filter(step => step.type === 'model_output')
    .flatMap(step => step.content ?? [])
    .filter(part => part.type === 'text' && typeof part.text === 'string')
    .map(part => part.text)
    .join('\n')
    .trim();

  if (!reply) {
    return jsonResponse({ error: 'NutriBot no generó una respuesta. Inténtalo de nuevo.' }, 502);
  }

  return jsonResponse({ reply });
});

export default { fetch: handleRequest };
