microsoftTeams.initialize(() => {}, [
  "https://localhost:9000",
  "https://lubobill1990.github.io",
]);

// This is the effect for processing
let appliedEffect = {
  pixelValue: 100,
  proportion: 2,
};

// This is the effect linked with UI
let uiSelectedEffect = {};

class FramePool {
  constructor(maxLen) {
    this.maxLen = maxLen;
    this.framePool = [];
    this.counter = 0;
  }

  cleanFramePool(length) {
    let i = 0;
    while (i < this.framePool.length) {
      const frame = this.framePool[i];
      if (frame.consumed && frame.data.byteLength !== length) {
        delete this.framePool[i];
        this.framePool.splice(i, 1);
      } else {
        i++;
      }
    }
  }
  findUsableFrame(length) {
    for (let i = 0; i < this.framePool.length; i++) {
      const frame = this.framePool[i];
      if (frame.consumed && frame.data.byteLength === length) {
        return frame;
      }
    }
    return null;
  }
  getProsessedFrame(length) {
    const processed = this.framePool
      .filter((elem, idx) => {
        return elem.done && !elem.consumed && elem.data.byteLength === length;
      })
      .sort((a, b) => {
        return a.counter - b.counter;
      })
      .map((elem) => {
        elem.consumed = true;
      });
    if (processed.length > 0) {
      return processed[0];
    }
  }
  allocate(length) {
    this.cleanFramePool(length);

    let frame = this.findUsableFrame(length);
    if (frame !== null) {
      return frame;
    }

    if (this.framePool.length < this.maxLen) {
      frame = {
        done: false,
        consumed: false,
        data: new Uint8Array(new SharedArrayBuffer(length)),
        counter: this.counter++,
      };
      this.framePool.push(frame);
      return frame;
    }

    return null;
  }
}
const framePool = new FramePool(3);

class WorkerPool {
  constructor(maxLen) {
    this.maxLen = maxLen;
    this.workers = [];
    for (let i = 0; i < this.maxLen; ++i) {
      this.workers.push({
        done: true,
        worker: new Worker("./multithread-worker.js"),
      });
    }
  }

  findAvailableWorker() {
    const myWorker = this.workers.filter((e) => {
      return e.done;
    })[0];
    myWorker.done = false;
    return myWorker;
  }
  addToWorker(videoFrame) {
    myWorker = findAvailableWorker();
    myWorker.worker.postMessage({ videoFrame, appliedEffect });
    myWorker.worker.onmessage = function (e) {
      myWorker.done = true;
    };
  }
}

const workerPool = new WorkerPool(3);

let errorOccurs = false;

//Sample video effect
async function videoFrameHandler(
  videoFrame,
  notifyVideoProcessed,
  notifyError
) {
  const frameData = framePool.allocate(videoFrame.data.byteLength);
  const clonedVideoFrame = { ...videoFrame };
  clonedVideoFrame.data = frameData;
  workerPool.addToWorker(clonedVideoFrame);
  const processedFrame = getProsessedFrame(videoFrame.data.byteLength);
  if (processedFrame) {
    videoFrame.data.set(processedFrame.data);
  } else {
    videoFrame.data.set(new Uint8Array(new ArrayBuffer(video.data.byteLength)));
  }
  notifyVideoProcessed();
}

function effectParameterChanged(effectName) {
  console.log(effectName);
  if (effectName === undefined) {
    // If effectName is undefined, then apply the effect selected in the UI
    appliedEffect = {
      ...appliedEffect,
      ...uiSelectedEffect,
    };
  } else {
    // if effectName is string sent from Teams client, the apply the effectName
    try {
      appliedEffect = {
        ...appliedEffect,
        ...JSON.parse(effectName),
      };
    } catch (e) {}
  }
}

microsoftTeams.video.registerForVideoEffect(effectParameterChanged);
microsoftTeams.video.registerForVideoFrame(videoFrameHandler, {
  format: "NV12",
});

// any changes to the UI should notify Teams client.
document.getElementById("enable_check").addEventListener("change", function () {
  if (this.checked) {
    microsoftTeams.video.notifySelectedVideoEffectChanged("EffectChanged");
  } else {
    microsoftTeams.video.notifySelectedVideoEffectChanged("EffectDisabled");
  }
});
document.getElementById("proportion").addEventListener("change", function () {
  uiSelectedEffect.proportion = this.value;
  microsoftTeams.video.notifySelectedVideoEffectChanged("EffectChanged");
});
document.getElementById("pixel_value").addEventListener("change", function () {
  uiSelectedEffect.pixelValue = this.value;
  microsoftTeams.video.notifySelectedVideoEffectChanged("EffectChanged");
});
microsoftTeams.appInitialization.notifySuccess();
