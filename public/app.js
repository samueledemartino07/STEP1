// Stato globale
let position = "";
let questionIndex = 0;
let interviewStarted = false;
let answersHistory = [];

// Utility: mostra una vista e nasconde le altre
function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.hidden = true);
  const el = document.querySelector(id);
  if (el) el.hidden = false;
}

// Funzione per convertire link YouTube normali in formato embed
function convertYouTubeLink(url) {
  // Esempio: https://www.youtube.com/watch?v=dQw4w9WgXcQ
  if (url.includes("youtube.com/watch?v=")) {
    const videoId = url.split("v=")[1].split("&")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // Esempio: https://youtu.be/dQw4w9WgXcQ
  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1].split("?")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // Se non è YouTube, restituisco l’URL originale
  return url;
}

document.addEventListener("DOMContentLoaded", () => {
  // --- Gestione Video ---
  const addVideoBtn = document.getElementById("add-video-btn");
  const videoUrlInput = document.getElementById("video-url");
  const videoList = document.getElementById("video-list");

  if (addVideoBtn) {
    addVideoBtn.addEventListener("click", () => {
      let url = videoUrlInput.value.trim();
      if (!url) return;

      // Converto automaticamente se è YouTube
      url = convertYouTubeLink(url);

      let li = document.createElement("li");

      if (url.includes("youtube.com/embed") || url.includes("vimeo.com")) {
        // Mostra in iframe
        const iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.title = "Video player";
        iframe.allowFullscreen = true;
        iframe.width = "560";
        iframe.height = "315";
        li.appendChild(iframe);
      } else if (url.endsWith(".mp4")) {
        // Mostra in video tag
        const video = document.createElement("video");
        video.controls = true;
        video.width = 560;
        video.height = 315;
        const source = document.createElement("source");
        source.src = url;
        source.type = "video/mp4";
        video.appendChild(source);
        li.appendChild(video);
      } else {
        alert("Formato non supportato. Inserisci un link YouTube, Vimeo o un file MP4.");
        return;
      }

      videoList.appendChild(li);
      videoUrlInput.value = "";
    });
  }

  // --- Gestione Colloquio ---
  const startBtn = document.getElementById("startBtn");
  const positionInput = document.getElementById("position");
  const resetBtn = document.getElementById("reset-btn");

  // Avvio colloquio
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      position = positionInput?.value?.trim() || "";
      if (!position) {
        alert("Inserisci la posizione per cui vuoi fare il colloquio.");
        return;
      }

      document.getElementById("start-screen").hidden = true;
      document.getElementById("main-app").hidden = false;
      showView("#home");

      const homeText = document.getElementById("home-text");
      if (homeText) {
        homeText.textContent = `Hai scelto di simulare un colloquio per la posizione: ${position}`;
      }
    });
  }

  // Reset colloquio
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      position = "";
      questionIndex = 0;
      interviewStarted = false;
      answersHistory = [];
      const chatBox = document.getElementById("chat-messages");
      if (chatBox) chatBox.innerHTML = "";
      addMessage("bot", "Colloquio resettato. Inserisci una nuova posizione e ricomincia!");
      showView("#home");
    });
  }

  // Navbar
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const target = link.getAttribute("href");
      showView(target);

      if (target === "#chat" && !interviewStarted && questionIndex === 0) {
        addMessage("bot", "Sei pronto a cominciare il colloquio?");
      }
    });
  });

  // Chat
  const sendBtn = document.getElementById("send-btn");
  const chatInput = document.getElementById("chat-input");
  const newQBtn = document.getElementById("new-q-btn");

  // Invio con Enter
  if (chatInput) {
    chatInput.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendBtn?.click();
      }
    });
  }

  // Invio risposta
  if (sendBtn && chatInput) {
    sendBtn.addEventListener("click", async () => {
      const userAnswer = chatInput.value.trim();
      if (!userAnswer) return;

      addMessage("user", userAnswer);
      chatInput.value = "";

      // Prima risposta: avvio colloquio
      if (!interviewStarted) {
        if (userAnswer.toLowerCase().includes("si")) {
          interviewStarted = true;
          questionIndex = 0;
          addMessage("bot", "Perfetto, iniziamo!");
          await getQuestion();
        } else {
          addMessage("bot", "Va bene, dimmi quando sei pronto.");
        }
        return;
      }

      // Salva risposta nello storico
      answersHistory.push(userAnswer);

      // Feedback recruiter
      const reply = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position, userAnswer })
      }).then(r => r.json()).catch(() => ({ text: "Errore nel generare la risposta." }));

      addMessage("bot", reply.text);

      // Prossima domanda
      questionIndex++;
      await getQuestion();
    });
  }

  // Nuova domanda manuale
  if (newQBtn) {
    newQBtn.addEventListener("click", async () => {
      if (interviewStarted) {
        questionIndex++;
        await getQuestion();
      } else {
        addMessage("bot", "Dimmi 'si' quando sei pronto a cominciare.");
      }
    });
  }
});

// Recupera domanda dal backend
async function getQuestion() {
  const res = await fetch("/api/question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ position, index: questionIndex, answers: answersHistory })
  }).then(r => r.json()).catch(() => ({ text: "Errore nel generare la domanda." }));

  addMessage("bot", res.text);
}

// Aggiunge messaggio in chat
function addMessage(sender, text) {
  const box = document.getElementById("chat-messages");
  if (!box) return;

  const div = document.createElement("div");
  div.className = `bubble ${sender === "user" ? "user" : "bot"}`;
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
