module.exports = async function applyMinimalAntiDetect(page) {
  // Timezone
  await page.emulateTimezone('Europe/Berlin');

  // Languages
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'language', {
      get: () => 'en-US',
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  });

  // WebRTC fix
  await page.evaluateOnNewDocument(() => {
    const getUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = function(constraints) {
      return getUserMedia.call(navigator.mediaDevices, constraints);
    };
  });

  // Hardware Concurrency
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 4
    });
  });
};
