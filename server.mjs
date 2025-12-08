// server.mjs
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

// Configurazione per gestire i percorsi dei file (fondamentale per il deploy)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Verifica che la chiave esista prima di partire
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ ERRORE CRITICO: Manca GEMINI_API_KEY nel file .env o nelle variabili d'ambiente!");
  process.exit(1);
}

const app = express();
// Render assegna una porta specifica, quindi process.env.PORT è obbligatorio
const port = process.env.PORT || 3000;
const apiKey = process.env.GEMINI_API_KEY;

app.use(bodyParser.json());

// MODIFICA IMPORTANTE: Usa path.join per servire la cartella public in modo sicuro
app.use(express.static(path.join(__dirname, "public")));

// Inizializzazione SDK
const ai = new GoogleGenAI({ apiKey: apiKey });

// Funzione helper per chiamare Gemini
async function chat(messages) {
  try {
    const systemMessage = messages.find(m => m.role === 'system');
    const systemInstruction = systemMessage ? systemMessage.content : undefined;

    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const response = await ai.models.generateContent({
      // CONSIGLIO: Usa 'gemini-1.5-flash' per massima stabilità in produzione.
      // Se vuoi provare il 2.0, assicurati che la tua chiave abbia accesso alla beta.
      model: "gemini-1.5-flash", 
      config: {
        systemInstruction: systemInstruction,
        temperature: 1,
      },
      contents: contents,
    });

    // Nota: verifica sempre se l'SDK che usi restituisce .text come proprietà o metodo .text()
    // Con @google/genai (nuovo SDK) solitamente gestisce l'output in modo diretto,
    // ma se dovesse fallire, controlla la documentazione della tua versione specifica.
    return response.text; 

  } catch (error) {
    console.error("Errore durante la chiamata a Gemini:", error);
    throw error; 
  }
}

// Endpoint per generare una domanda
app.post("/api/question", async (req, res) => {
  try {
    const { position, index, answers = [] } = req.body;
    const system = "Sei un recruiter professionale. Genera UNA sola domanda chiara e pertinente al ruolo.";
    const user = `Ruolo: ${position}. Storico risposte: ${answers.join(" | ") || "nessuno"}. Genera la domanda numero ${index + 1}.`;

    const text = await chat([
      { role: "system", content: system },
      { role: "user", content: user }
    ]);

    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ text: "Errore nel generare la domanda." });
  }
});

// Endpoint per generare un feedback
app.post("/api/reply", async (req, res) => {
  try {
    const { position, userAnswer } = req.body;
    const system = "Sei un recruiter professionale. Dai un breve feedback (1-2 frasi), neutro e pertinente al ruolo.";
    const user = `Ruolo: ${position}. Risposta del candidato: "${userAnswer}".`;

    const text = await chat([
      { role: "system", content: system },
      { role: "user", content: user }
    ]);

    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ text: "Errore nel generare la risposta." });
  }
});

// Route di fallback: se l'utente aggiorna la pagina o va su un URL strano, rimandalo alla home
//app.get('*', (req, res) => {
//    res.sendFile(path.join(__dirname, 'public', 'index.html'));
//});

app.listen(port, () => {
  console.log(`✅ Server avviato sulla porta ${port}`);
});