"use strict";

// Lets the User-Agent header say Windows, Mac or Android instead of Linux.
// The labels and the header layout are copied from Tor Browser's own code
// (nsRFPService.h, and GetSpoofedUserAgent in nsRFPService.cpp), checked
// against 14.0 (tor-browser-128.9.0esr-14.0-1, the last version that spoofed
// the header) and 15.0 (tor-browser-140.17.0esr-15.0-1). So each choice is
// exactly what a real Tor Browser on that system sends.
//
// As in 14.0, only the header changes; navigator.userAgent (what page
// scripts see) still says Linux.

const PLATFORMS = {
  windows: { os: "Windows NT 10.0; Win64; x64", badge: "WIN", name: "Windows" },
  mac: { os: "Macintosh; Intel Mac OS X 10.15", badge: "MAC", name: "Mac" },
  // Tor Browser for Android puts the version after "Gecko/" instead of 20100101.
  android: { os: "Android 10; Mobile", badge: "AND", name: "Android", android: true },
};

// The exact header Tor Browser on Linux sends. If Tor ever changes its
// format, nothing matches and the header is left alone rather than mangled.
const LINUX_HEADER = /^Mozilla\/5\.0 \(X11; Linux x86_64; rv:(\d+\.0)\) Gecko\/20100101 Firefox\/\1$/;

function buildHeader(platform, version) {
  const gecko = platform.android ? version : "20100101";
  return `Mozilla/5.0 (${platform.os}; rv:${version}) Gecko/${gecko} Firefox/${version}`;
}

// Deliberately not saved anywhere: every browser start begins on Linux.
let current = "off";

function rewriteHeader(details) {
  const platform = PLATFORMS[current];
  for (const header of details.requestHeaders) {
    if (header.name.toLowerCase() !== "user-agent") {
      continue;
    }
    const match = LINUX_HEADER.exec(header.value);
    if (platform && match) {
      header.value = buildHeader(platform, match[1]);
    }
  }
  return { requestHeaders: details.requestHeaders };
}

function setPlatform(choice) {
  current = choice;
  const platform = PLATFORMS[current];
  const listener = browser.webRequest.onBeforeSendHeaders;
  if (platform && !listener.hasListener(rewriteHeader)) {
    listener.addListener(rewriteHeader, { urls: ["<all_urls>"] }, ["blocking", "requestHeaders"]);
  } else if (!platform) {
    listener.removeListener(rewriteHeader);
  }

  browser.browserAction.setIcon({ path: platform ? "icon-on.svg" : "icon-off.svg" });
  browser.browserAction.setBadgeText({ text: platform ? platform.badge : "" });
  browser.browserAction.setBadgeBackgroundColor({ color: "#0060df" });
  browser.browserAction.setTitle({
    title: platform
      ? `OS Header Switch: websites see ${platform.name}. Only use at the Safest security level. Click to change.`
      : "OS Header Switch: websites see Linux (normal Tor). Click to choose.",
  });
}

// The pop-up menu asks for the current choice ({}) or sets one ({ set }).
browser.runtime.onMessage.addListener(message => {
  if (message.set === "off" || Object.hasOwn(PLATFORMS, message.set)) {
    setPlatform(message.set);
  }
  return Promise.resolve({ current });
});
