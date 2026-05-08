// public/heartbeatWorker.js
let timer = null;

self.onmessage = (e) => {
  if (e.data === 'START') {
    timer = setInterval(() => {
      self.postMessage('TICK');
    }, 25000);
  } else if (e.data === 'STOP') {
    clearInterval(timer);
  }
};
