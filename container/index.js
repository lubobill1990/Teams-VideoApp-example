function writeText(canvas, str) {
  const ctx = canvas.getContext("2d");
  ctx.font = "20px Comic Sans MS";
  ctx.fillStyle = "red";
  ctx.fillText(str, 10, 40);
}

class Counter {
  constructor(ringLen = 1000) {
    this.countPrevSecond = 0;
    this.countThisSecond = 0;
    this.currentSecond = 0;
    this.startTime = 0;
    this.statRingLen = ringLen;
    this.statRing = new Array(this.statRingLen).fill(-1);
    this.currentRingIdx = 0;
    this.tickDuration = 0;
  }
  getCurrentSecond() {
    return Math.floor(Date.now() / 1000);
  }
  start() {
    this.startTime = Date.now();
    return this.startTime;
  }
  end() {
    const now = Date.now();
    this.tickDuration += now - this.startTime;
    return now;
  }

  tick() {
    this.statRing[this.currentRingIdx] = this.tickDuration;
    this.tickDuration = 0;

    this.currentRingIdx = (this.currentRingIdx + 1) % this.statRingLen;
    let latestSecond = this.getCurrentSecond();
    if (latestSecond != this.currentSecond) {
      this.countPrevSecond = this.countThisSecond;
      this.currentSecond = latestSecond;
      this.countThisSecond = 1;
    } else {
      this.countThisSecond++;
    }

    return this.countPrevSecond;
  }
  getTickPerSecond() {
    let sum = 0;
    let count = 0;

    for (let i = 0; i < this.statRingLen; ++i) {
      if (this.statRing[i] == -1) {
        break;
      }
      sum += this.statRing[i];
      count++;
    }
    if (sum == 0) {
      return -1;
    }
    return parseInt(count / (sum / 1000));
  }
}

const rawVideoElem = document.createElement("video");
rawVideoElem.setAttribute("id", "rawVideo");
// rawVideoElem.setAttribute("style", "display:none");
document.getElementById("videoWrapper").appendChild(rawVideoElem);

const processedVideoElem = document.createElement("video");
processedVideoElem.setAttribute("id", "processedVideo");
// rawVideoElem.setAttribute("style", "display:none");
document.getElementById("resultWrapper").appendChild(processedVideoElem);

const previewCanvas = document.createElement("canvas");
previewCanvas.setAttribute("id", "previewCanvas");
const processedMediaStream = previewCanvas.captureStream(60);
previewCanvas.setAttribute("style", "display:none");
document.getElementById("resultWrapper").appendChild(previewCanvas);
const previewCanvasCtx = previewCanvas.getContext("2d");

const videoFrameCanvas = document.createElement("canvas");
videoFrameCanvas.setAttribute("id", "videoFrameCanvas");
videoFrameCanvas.setAttribute("style", "display:none");
document.getElementById("resultWrapper").appendChild(videoFrameCanvas);
const videoFrameCanvasContext = videoFrameCanvas.getContext("2d");

function getResolution() {
  let resolution = localStorage.getItem("resolution");
  if (!resolution) {
    resolution = [640, 480];
  } else {
    resolution = resolution.split(",");
  }
  document.getElementById("resolution_" + resolution[1]).checked = true;
  return resolution;
}

function initVideoPromise() {
  return new Promise(async function (resolve, reject) {
    let devices = await navigator.mediaDevices.enumerateDevices();
    console.log(devices, devices[0].deviceId);
    const resolution = getResolution();
    const cameraStream = await window.navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        width: resolution[0],
        height: resolution[1],
      },
    });
    processedVideoElem.srcObject = processedMediaStream;

    rawVideoElem.srcObject = cameraStream;

    rawVideoElem.onloadedmetadata = function () {
      rawVideoElem.width = rawVideoElem.videoWidth;
      rawVideoElem.height = rawVideoElem.videoHeight;
      processedVideoElem.width = rawVideoElem.videoWidth;
      processedVideoElem.height = rawVideoElem.videoHeight;
      videoFrameCanvas.width = rawVideoElem.videoWidth;
      videoFrameCanvas.height = rawVideoElem.videoHeight;
      previewCanvas.width = rawVideoElem.videoWidth;
      previewCanvas.height = rawVideoElem.videoHeight;
      rawVideoElem.play();
      processedVideoElem.play();
      resolve();
    };
  });
}

function getVideoFrame() {
  videoFrameCanvasContext.drawImage(
    rawVideoElem,
    0,
    0,
    rawVideoElem.width,
    rawVideoElem.height
  );
  return videoFrameCanvasContext.getImageData(
    0,
    0,
    rawVideoElem.width,
    rawVideoElem.height
  );
}
let streamInited = false;
async function startStreaming() {
  if (streamInited) {
    return;
  }
  await initVideoPromise();
  streamInited = true;
}
const iframeWindow = document.getElementById("ifrm").contentWindow;

const counter = new Counter();
const counterOther = new Counter();

setInterval(() => {
  document.getElementById("fps").value = counter.getTickPerSecond();
}, 1000);

setInterval(() => {
  document.getElementById("fps2").value = counterOther.getTickPerSecond();
}, 1000);

let sharedBuffer;
let sendToIframe = true;
async function sendNewVideoFrame() {
  await startStreaming();
  counterOther.start();
  const imageData = getVideoFrame();
  counterOther.end();
  counter.start();
  if (
    !sharedBuffer ||
    sharedBuffer.byteLength !== imageData.data.buffer.byteLength
  ) {
    sharedBuffer = new SharedArrayBuffer(imageData.data.buffer.byteLength);
  }
  let sabArray = new Uint8ClampedArray(sharedBuffer);
  sabArray.set(imageData.data, 0);
  counter.end();

  let features = {};

  for (let idx in config.features) {
    const feature = config.features[idx];
    if (feature === "facialFeature") {
      features["facialFeature"] = [
        [1, 2],
        [100, 244],
      ];
    } else if (feature === "personalMask") {
      features["personalMask"] = [1, 2, 3, 4, 5];
    }
  }
  counter.start();

  if (!sendToIframe) {
    setTimeout(() => {
      videoFrameProcessed();
    }, 0);
    return;
  }

  iframeWindow.postMessage({
    type: "NewVideoFrame",
    videoFrame: {
      width: imageData.width,
      height: imageData.height,
      data: sharedBuffer,
    },
    features,
  });
}

function sendEffectParameters(parameters) {
  iframeWindow.postMessage({
    type: "EffectParameterChange",
    effectName: parameters,
  });
}

function videoFrameProcessed() {
  counter.end();
  counterOther.start();
  const height = rawVideoElem.videoHeight;
  const width = rawVideoElem.videoWidth;
  const imageArrayBuffer = sharedBuffer;
  if (renderCheck) {
    const imageDataArray = new Uint8ClampedArray(
      imageArrayBuffer,
      0,
      height * width * 4
    );
    if (!processedArrayBuffer) {
      processedArrayBuffer = new ArrayBuffer(imageArrayBuffer.byteLength);
      processedImageArr = new Uint8ClampedArray(processedArrayBuffer);
    }
    processedImageArr.set(imageDataArray, 0);
    let imageData = new ImageData(processedImageArr, width, height);
    previewCanvasCtx.putImageData(imageData, 0, 0);
    writeText(previewCanvas, "After process");
  }
  counterOther.end();

  counter.tick();
  counterOther.tick();

  sendNewVideoFrame();
}

let config = {
  features: [],
};
let processedArrayBuffer;
let processedImageArr;
let renderCheck = true;
let sendToIframeToBeApplied = true;

function receiveMessage(event) {
  const type = event.data.type;
  if (type === "SubscribeVideoFrames") {
    config = event.data.config;
    sendNewVideoFrame();
  } else if (type === "VideoFrameProcessed") {
    videoFrameProcessed();
    return;
  } else if (type === "VideoProcessError") {
    const errMsg = event.data.message;
    console.log(errMsg);
    alert(errMsg);
  } else if (type === "VideoEffectChanged") {
    console.log("effect changed from video app");

    if (event.data.effectChangeType === "EffectDisabled") {
      // stop post message
      if (selectedScenario === "pre_meeting") {
        sendToIframe = false;
      } else if (selectedScenario === "in_meeting") {
        sendToIframeToBeApplied = false;
      }
    } else if (event.data.effectChangeType === "EffectChanged") {
      if (selectedScenario === "pre_meeting") {
        sendToIframe = true;
        sendEffectParameters(undefined);
      } else if (selectedScenario === "in_meeting") {
        sendToIframeToBeApplied = true;
      }
    }
  }
  console.log(event);
}
window.addEventListener("message", receiveMessage, false);

document.getElementById("proportion").addEventListener("change", function () {
  sendEffectParameters(
    JSON.stringify({
      proportion: this.value,
    })
  );
});

document.getElementById("pixel_value").addEventListener("change", function () {
  sendEffectParameters(
    JSON.stringify({
      pixelValue: this.value,
    })
  );
});

document.getElementById("render_check").addEventListener("change", function () {
  renderCheck = this.checked;
});

let resolutions = {
  240: [320, 240],
  480: [640, 480],
  560: [840, 560],
  720: [1280, 720],
  1080: [1920, 1080],
};
const radios = document.getElementsByName("resolution");
radios.forEach((radio) => {
  radio.onclick = function () {
    localStorage.setItem("resolution", resolutions[this.value]);
    window.location.reload();
  };
});

let selectedScenario = "pre_meeting";
const scenarioRadios = document.getElementsByName("scenario");
scenarioRadios.forEach((radio) => {
  radio.onclick = function () {
    selectedScenario = this.value;
  };
});

document.getElementById("apply_effect").addEventListener("click", function () {
  if (sendToIframeToBeApplied === false) {
    sendToIframe = false;
  } else {
    sendToIframe = true;

    sendEffectParameters(undefined);
  }
});
