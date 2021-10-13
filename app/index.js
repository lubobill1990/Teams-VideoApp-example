microsoftTeams.initialize(() => {}, [
  "https://lubobill1990.github.io",
]);

// This is the effect for processing
let appliedEffect = {
  pixelValue: 100,
  proportion: 3,
};

// This is the effect linked with UI
let uiSelectedEffect = {};

let errorOccurs = false;

function imageToUint8Array(image, context) {
  context.width = image.width;
  context.height = image.height;
  context.drawImage(image, 0, 0);
  const blob = await toBlob(context.canvas, "image/png");
  return new Uint8Array(await blob.arrayBuffer());
}


//Sample video effect
function videoFrameHandler(videoFrame, notifyVideoProcessed, notifyError) {
  const maxLen = (videoFrame.height * videoFrame.width) / Math.max(1, appliedEffect.proportion) - 4;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const image = new Image();
  image.src = "https://www.google.com/search?q=microsof+image&tbm=isch&ved=2ahUKEwjfntvq4MXzAhWNqZ4KHamWDFsQ2-cCegQIABAA&oq=microsof+image&gs_lcp=CgNpbWcQAzIGCAAQCBAeMgYIABAIEB4yBggAEAoQGDoHCCMQ7wMQJzoFCAAQgAQ6CAgAEIAEELEDOgsIABCABBCxAxCDAToICAAQsQMQgwE6BAgAEEM6BwgAELEDEENQoilYhEJg5EJoBHAAeACAAUWIAaoIkgECMTiYAQCgAQGqAQtnd3Mtd2l6LWltZ8ABAQ&sclient=img&ei=B_ZlYZ__CY3T-gSprbLYBQ&bih=937&biw=1920&rlz=1C1CHBF_enUS966US966#imgrc=1Lj5XulV7gUrtM";
  // for (let i = 1; i < maxLen; i += 4) {
  //   //smaple effect just change the value to 100, which effect some pixel value of video frame
  //   videoFrame.data[i + 1] = appliedEffect.pixelValue;
  // }

  for (let i = 0; i < videoFrame.data.length; i++) {
    videoFrame.data[i] = 200 - videoFrame.data[i];
  }

  //send notification the effect processing is finshed.
  notifyVideoProcessed();

  //send error to Teams
  if (errorOccurs) {
    notifyError("some error message");
  }
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
    if (effectName === "f36d7f68-7c71-41f5-8fd9-ebf0ae38f949") {
      appliedEffect.proportion = 2;
      appliedEffect.pixelValue = 200;
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
}

microsoftTeams.appInitialization.notifySuccess();
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
