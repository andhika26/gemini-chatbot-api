document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const userInput = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');

  let conversationHistory = [];

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    appendMessage('user', userMessage);
    conversationHistory.push({ role: 'user', text: userMessage });
    userInput.value = '';

    const thinkingMessage = appendMessage('bot', 'Thinking...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: conversationHistory }),
      });

      if (!response.ok) throw new Error('Failed to get response from server.');

      const data = await response.json();

      if (data && data.result) {
        updateMessage(thinkingMessage, data.result);
        conversationHistory.push({ role: 'model', text: data.result });
      } else {
        updateMessage(thinkingMessage, 'Sorry, no response received.');
      }
    } catch (error) {
      console.error('Error:', error);
      updateMessage(thinkingMessage, 'Failed to get response from server.');
    }
  });

  function parseResponse(text) {
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\n\s*(\d+\.)\s/g, '<br><br>$1 ');

    const lines = html.split('<br>');
    let inList = false;
    let listType = '';

    html = lines.map(line => {
        const isListItem = line.trim().startsWith('* ');
        const isOlItem = /^\d+\.\s/.test(line.trim());

        if (isListItem && !inList) {
            inList = true;
            listType = 'ul';
            return `<ul><li>${line.trim().substring(2)}</li>`;
        } else if (isListItem && inList && listType === 'ul') {
            return `<li>${line.trim().substring(2)}</li>`;
        } else if (isOlItem && !inList) {
            inList = true;
            listType = 'ol';
            return `<ol><li>${line.trim().substring(line.indexOf(' ') + 1)}</li>`;
        } else if (isOlItem && inList && listType === 'ol') {
            return `<li>${line.trim().substring(line.indexOf(' ') + 1)}</li>`;
        }
        
        if (!isListItem && !isOlItem && inList) {
            inList = false;
            const closingTag = `</${listType}>`;
            listType = '';
            return `${closingTag}${line}`;
        }
        
        return line;
    }).join('<br>');

    if (inList) {
        html += `</${listType}>`;
    }

    return html.replace(/<br>/g, '<br />');
  }

  function appendMessage(role, text) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${role}-message`);

    const icon = document.createElement('span');
    icon.classList.add('icon');
    icon.textContent = role === 'user' ? '👤' : '🤖';

    const textElement = document.createElement('div');
    if (role === 'bot') {
      textElement.innerHTML = parseResponse(text);
    } else {
      textElement.textContent = text;
    }
    
    messageElement.appendChild(icon);
    messageElement.appendChild(textElement);
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
    return messageElement;
  }

  function updateMessage(messageElement, newText) {
    const textElement = messageElement.querySelector('div');
    textElement.innerHTML = parseResponse(newText);
  }
});
