// SafeHer Awareness Bot 
const GEMINI_API_KEY = "AIzaSyDVZ3I-WqH3ou8UEDFFqYJrYAb61N9R0Yc";

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("awarenessInput");
  const sendBtn = document.getElementById("awarenessSend");
  const messages = document.getElementById("chatMessages");

  if (!input || !sendBtn || !messages) {
    console.error("❌ Bot elements missing");
    return;
  }

  addMessage("bot", "Hi! Ask safety tips for night walks, harassment, police 💡");

  sendBtn.addEventListener("click", sendQuery);
  input.addEventListener("keypress", e => e.key === "Enter" && sendQuery());

  async function sendQuery() {
    const question = input.value.trim();
    if (!question) return;

    addMessage("user", question);
    input.value = "";
    sendBtn.disabled = true;
    sendBtn.textContent = "Thinking...";

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `SafeHer Bot (Bhilai): "${question}". 2 safety tips. Local context. 💡` }] }],
            generationConfig: { maxOutputTokens: 120, temperature: 0.3 }
          })
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Try again!";
      addMessage("bot", answer);

    } catch (error) {
      console.error("Bot error:", error);
      addMessage("bot", error.message.includes("429") ? "⏳ Rate limit. Wait 60s." : "⚠️ Network error.");
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "Ask";
    }
  }

  function addMessage(sender, text) {
    const div = document.createElement("div");
    div.className = `chat-message ${sender}`;
    div.innerHTML = `<div class="message-bubble ${sender}">${text}</div>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
});
