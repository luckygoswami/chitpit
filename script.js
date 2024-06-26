"use strict";

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
  update,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

const appSettings = {
  databaseURL:
    "https://chitpit-prsnl-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

//defining const variables 
const app = initializeApp(appSettings);
const database = getDatabase(app);
const chatsInDb = ref(database, "chat");
const onlineStatusInDb = ref(database, "chat/onlineStatus");
const typingStatusInDb = ref(database, "chat/typingStatus");

const main = document.querySelector(".main");
const container = document.querySelector(".container");
const heBtn = document.querySelector("#he-btn");
const sheBtn = document.querySelector("#she-btn");
const sendBtn = document.querySelector(".send-btn");
const inputField = document.querySelector(".input-field");
const chatArea = document.querySelector(".chat-area");
const welcomeScreen = document.querySelector(".welcome");
const onlineStatusDot = document.querySelector(".onlineStatusDot");
const screenWidth = window.screen.width;

// Check if the browser is Chrome
const isChrome =
  /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

// Check if the app is running in standalone mode (PWAs)
const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

if (isStandalone) {
  main.style.height = "100%";
}

let currentUser = undefined;
let antiUser = undefined;
let typingTimer;

function loadData() {
  onValue(chatsInDb, function (snapshot) {
    if (snapshot.exists()) {
      let chatsArray = Object.entries(snapshot.val());
      let onlineStatusObject;

      if (chatsArray.length > 2) {
        onlineStatusObject = chatsArray[chatsArray.length - 2][1];
      } else {
        onlineStatusObject = chatsArray[0][1];
      }

      let currentUserOnlineStatus = onlineStatusObject[currentUser];
      let antiUserOnlineStatus = onlineStatusObject[antiUser];

      let typingStatusObject = chatsArray[chatsArray.length - 1][1];
      let currentUserTypingStatus = typingStatusObject[currentUser];
      let antiUserTypingStatus = typingStatusObject[antiUser];

      if (chatsArray.length > 1 && antiUserTypingStatus) {
        onlineStatusDot.classList.add("typing");
      } else {
        onlineStatusDot.classList.remove("typing");
      }

      if (antiUserOnlineStatus) {
        onlineStatusDot.style.color = "rgb(0,230,118)";
      } else {
        onlineStatusDot.style.color = "rgba(0, 0, 0, 0.5)";
      }

      chatArea.innerHTML = "";

      // load only limited messages..
      const chatLimit = 100;
      if (chatsArray.length > chatLimit) {
        for (
          let i = chatsArray.length - 3;
          i >= chatsArray.length - chatLimit;
          i--
        ) {
          createChat(chatsArray, i);
        }
      } else {
        for (let i = chatsArray.length - 3; i >= 0; i--) {
          createChat(chatsArray, i);
        }
      }

      scrollToBottom();

      // read receipts update
      // push seen msg to database if the receiver(currentUser) is active or not
      if (currentUserOnlineStatus) {
        for (let i = 0; i < chatsArray.length - 2; i++) {
          let chatUser = chatsArray[i][1].user;

          if (currentUser != chatUser) {
            let chatId = chatsArray[i][0];
            let chatLocationInDb = ref(database, `chat/${chatId}`);
            update(chatLocationInDb, {
              seen: true,
            });
          }
        }
      }
    } else {
      console.log("snapshot doesn't exists");
    }
  });

  if (screenWidth > 768) {
    inputField.focus();
  }
}

function createChat(chatData, index) {
  let chatId = chatData[index][0];
  let chatUser = chatData[index][1].user;
  let chatText = chatData[index][1].text;
  let chatDateandTime = chatData[index][1].dateAndTime;
  let chatTime = chatDateandTime.split(" ")[4];
  let seenStatus = chatData[index][1].seen;

  let message_box = document.createElement("div");
  message_box.classList.add("message-box");
  chatArea.append(message_box);

  let message = document.createElement("div");
  message.classList.add("message", `${chatUser}`);
  message_box.append(message);

  let text = document.createElement("div");
  text.classList.add("text");
  text.innerText = `${chatText}`;
  message.append(text);

  let spaceSpan = document.createElement("span");
  spaceSpan.classList.add("space");
  spaceSpan.innerHTML = `&nbsp &nbsp &nbsp &nbsp &nbsp `;
  text.append(spaceSpan);

  let timeSpan = document.createElement("span");
  timeSpan.classList.add("time");
  timeSpan.innerHTML = `${chatTime.split(":").slice(0, 2).join(":")}&nbsp;`;
  text.append(timeSpan);

  let seenTick = document.createElement("i");
  seenTick.classList.add("fa-solid", "fa-check-double", "read-receipt");

  if (currentUser == chatUser) {
    timeSpan.append(seenTick);
    message.style.justifyContent = "flex-end";
  }

  // update msg seen status
  if (seenStatus) {
    seenTick.style.color = "rgba(0, 195, 255, 0.6)";
  }
}

function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

function toggleActiveStatus() {
  // Check if the Page Visibility API is supported

  if (typeof document.hidden !== "undefined") {
    // Browser supports Page Visibility API

    // Handle page visibility change
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") {
        // Page is visible, user is active
        update(onlineStatusInDb, {
          [currentUser]: true,
        });
      } else {
        // Page is hidden, user is inactive
        update(onlineStatusInDb, {
          [currentUser]: false,
        });
      }
    });
  } else {
    // Browser does not support Page Visibility API
    // Fallback to focus and blur events

    // Handle focus event
    window.addEventListener("focus", function () {
      // User is active
      update(onlineStatusInDb, {
        [currentUser]: true,
      });
    });

    // Handle blur event
    window.addEventListener("blur", function () {
      // User is inactive
      update(onlineStatusInDb, {
        [currentUser]: false,
      });
    });
  }
}

function sendMsg() {
  let inputMsg = inputField.value.trim();

  if (inputMsg.length > 0) {
    inputField.value = "";

    push(chatsInDb, {
      user: `${currentUser}`,
      text: `${inputMsg}`,
      dateAndTime: `${new Date()}`,
      seen: false,
    });
  }

  // to prevent input from losing focus after sending a msg
  inputField.focus();
  sendBtn.classList.remove("active");
}

heBtn.addEventListener("click", () => {
  currentUser = "he";
  antiUser = "she";

  welcomeScreen.classList.remove("active");
  container.classList.add("active");

  update(onlineStatusInDb, {
    [currentUser]: true,
  });

  loadData();

  // check status
  toggleActiveStatus();
});

sheBtn.addEventListener("click", () => {
  currentUser = "she";
  antiUser = "he";

  welcomeScreen.classList.remove("active");
  container.classList.add("active");

  update(onlineStatusInDb, {
    [currentUser]: true,
  });

  loadData();

  // check status
  toggleActiveStatus();
});

sendBtn.addEventListener("click", sendMsg);

inputField.addEventListener("input", () => {
  // to set the typing status
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    // Perform action when the user stops typing
    update(typingStatusInDb, {
      [currentUser]: false,
    });
  }, 500);

  // Perform action while the user is typing (optional)
  update(typingStatusInDb, {
    [currentUser]: true,
  });

  // to enable or disable send button
  if (inputField.value.trim().length > 0) {
    sendBtn.classList.add("active");
  } else {
    sendBtn.classList.remove("active");
  }
});

inputField.addEventListener("keyup", (e) => {
  if (!e.shiftKey && e.key == "Enter" && screenWidth > 500) {
    sendMsg();
    e.preventDefault();
  }
});

inputField.addEventListener("keydown", (e) => {
  if (e.shiftKey && e.key == "Enter" && screenWidth > 500) {
    inputField.value += "\n";
    inputField.scrollTop = inputField.scrollHeight;
    e.preventDefault();
  }

  if (e.key == "Enter" && screenWidth > 500) {
    e.preventDefault();
  }
});
