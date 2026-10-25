"use strict";

const buttons = document.querySelectorAll("button[data-choice]");

function show(current) {
  for (const button of buttons) {
    const picked = button.dataset.choice === current;
    button.classList.toggle("selected", picked);
    button.setAttribute("aria-pressed", picked);
  }
}

async function send(message) {
  const { current } = await browser.runtime.sendMessage(message);
  show(current);
}

for (const button of buttons) {
  button.addEventListener("click", () => send({ set: button.dataset.choice }));
}

send({});
