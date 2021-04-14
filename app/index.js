microsoftTeams.initialize();

// This is the effect for processing
let appliedEffect = {
  pixelValue: 100,
  proportion: 2,
};

// This is the effect linked with UI
let uiSelectedEffect = {};

let errorOccurs = false;
//Sample video effect
function videoEffect(videoFrame, notifyVideoProcessed, notifyError) {
  const maxLen =
    (videoFrame.height * videoFrame.width * 4) /
    Math.max(1, appliedEffect.proportion);

  for (let i = 0; i < maxLen; i += 4) {
    //smaple effect just change the value to 100, which effect some pixel value of video frame
    videoFrame.data[i + 1] = appliedEffect.pixelValue;
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
    // if effectName is string sent from Teams client, the apply the effectName
    try {
      appliedEffect = {
        ...appliedEffect,
        ...JSON.parse(effectName),
      };
    } catch (e) {}
  }
}
console.log(microsoftTeams)
microsoftTeams.videoApp.registerForVideoEffect(effectParameterChanged);
microsoftTeams.videoApp.registerForVideoFrame(videoEffect);

// any changes to the UI should notify Teams client.
document.getElementById("enable_check").addEventListener("change", function () {
  if (this.checked) {
    microsoftTeams.videoApp.notifySelectedVideoEffectChanged("EffectChanged");
  } else {
    microsoftTeams.videoApp.notifySelectedVideoEffectChanged("EffectDisabled");
  }
});
document.getElementById("proportion").addEventListener("change", function () {
  uiSelectedEffect.proportion = this.value;
  microsoftTeams.videoApp.notifySelectedVideoEffectChanged("EffectChanged");
});
document.getElementById("pixel_value").addEventListener("change", function () {
  uiSelectedEffect.pixelValue = this.value;
  microsoftTeams.videoApp.notifySelectedVideoEffectChanged("EffectChanged");
});
microsoftTeams.appInitialization.notifySuccess();
